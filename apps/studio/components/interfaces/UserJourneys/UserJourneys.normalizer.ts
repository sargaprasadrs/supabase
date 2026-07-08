import type { LogRow } from './UserJourneys.queries'
import type { JourneyEvent, JourneyEventStatus, JourneyTimelineItem } from './UserJourneys.types'
import { otelTimestampToMicros } from '@/components/interfaces/Settings/Logs/Logs.utils.otel'

const GAP_THRESHOLD_MICROS = 15 * 60 * 1000 * 1000
const MAX_TIMELINE_EVENTS = 50

const AUTH_ACTION_LABELS: Record<string, string> = {
  user_signedup: 'Signed up',
  login: 'Logged in',
  logout: 'Logged out',
  token_refreshed: 'Session refreshed',
  user_recovery_requested: 'Requested password reset',
  user_updated: 'Updated account',
  user_modified: 'Updated account',
  user_deleted: 'Account deleted',
  identity_linked: 'Linked identity',
  identity_unlinked: 'Unlinked identity',
  mfa_challenge_verified: 'Verified MFA challenge',
}

const PROVIDER_LABELS: Record<string, string> = {
  email: 'email + password',
  phone: 'phone + OTP',
  google: 'Google',
  github: 'GitHub',
  gitlab: 'GitLab',
  azure: 'Azure',
  apple: 'Apple',
  discord: 'Discord',
  slack: 'Slack',
}

function providerLabel(provider: string | undefined): string | undefined {
  if (!provider) return undefined
  return PROVIDER_LABELS[provider] ?? provider
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

const POSTGRES_FRIENDLY_TITLES: Array<{ pattern: RegExp; title: string }> = [
  {
    pattern: /current transaction is aborted/i,
    title: 'Blocked by an earlier error in this transaction',
  },
  { pattern: /duplicate key value violates unique constraint/i, title: 'Duplicate value rejected' },
  { pattern: /violates foreign key constraint/i, title: 'Reference to a missing row rejected' },
  { pattern: /violates not-null constraint/i, title: 'Missing required field rejected' },
  { pattern: /violates check constraint/i, title: 'Value failed a check constraint' },
  { pattern: /permission denied/i, title: 'Permission denied' },
  { pattern: /deadlock detected/i, title: 'Deadlock detected' },
]

/** Translates common noisy Postgres error text into a plain-English title; unrecognized messages fall back to a truncated version of the real text (never a bare generic label). */
function friendlyPostgresTitle(message: string): string {
  const match = POSTGRES_FRIENDLY_TITLES.find((candidate) => candidate.pattern.test(message))
  return match ? match.title : truncate(message, 80)
}

function titleForAuthRow(
  attrs: Record<string, string>,
  status: JourneyEventStatus
): { title: string; titleDetail?: string } {
  const action = attrs['auth_event.action']
  const path = attrs['path'] ?? ''

  if (status === 'error') {
    if (path.includes('signup') || action === 'user_signedup') return { title: 'Signup failed' }
    if (path.includes('token') || path.includes('login')) return { title: 'Login failed' }
    return { title: 'Auth error' }
  }

  if (action && AUTH_ACTION_LABELS[action]) {
    return {
      title: AUTH_ACTION_LABELS[action],
      titleDetail: providerLabel(attrs['auth_event.traits.provider']),
    }
  }
  if (path) return { title: `Auth · ${path}` }
  return { title: 'Auth event' }
}

export function normalizeAuthRow(row: LogRow): JourneyEvent {
  const attrs = row.log_attributes ?? {}
  const level = attrs['level'] ?? ''
  const status: JourneyEventStatus = level === 'error' || level === 'fatal' ? 'error' : 'ok'
  const detail =
    status === 'error' ? attrs['msg'] || attrs['error'] || row.event_message : undefined
  const { title, titleDetail } = titleForAuthRow(attrs, status)

  return {
    ts: otelTimestampToMicros(row.timestamp),
    source: 'Auth',
    kind: attrs['auth_event.action'] || 'auth_event',
    title,
    titleDetail,
    detail,
    status,
    raw: row,
  }
}

/**
 * Positive match only — see fetchPostgresErrorsForUser. Every row here already contains this
 * user's id in the raw log text, so this is a confirmed reference, not a guess. It's still an
 * `isAnnotation` event: a data-level mention isn't the same as an action this user took, so it
 * renders as a note on the journey rather than a first-class spine event.
 */
export function normalizePostgresRow(row: LogRow): JourneyEvent {
  const attrs = row.log_attributes ?? {}
  const severity = attrs['parsed.error_severity']
  const sqlState = attrs['parsed.sql_state_code']
  const hint = attrs['parsed.detail'] || attrs['parsed.hint']

  // event_message is a single-line error string for postgres_logs. The title is a plain-English
  // translation of it (falling back to the truncated raw text) — the raw message always stays
  // available on the muted line and in "View details", it's just not the loud headline.
  const message = row.event_message?.split('\n')[0] || 'Database error'
  const detailPrefix = [severity, sqlState].filter(Boolean).join(' · ')
  const detail = [detailPrefix, hint || truncate(message, 140)].filter(Boolean).join(' — ')

  return {
    ts: otelTimestampToMicros(row.timestamp),
    source: 'Postgres',
    kind: 'postgres_error',
    title: friendlyPostgresTitle(message),
    detail,
    status: 'error',
    isAnnotation: true,
    raw: row,
  }
}

export interface BuildTimelineResult {
  items: JourneyTimelineItem[]
  truncated: boolean
}

function dedupeKey(event: JourneyEvent): string {
  return `${event.source}|${event.title}|${event.titleDetail ?? ''}`
}

/**
 * Collapses runs of consecutive, identical events (e.g. the "current transaction is aborted"
 * cascade a single failing statement produces for every statement after it) into one event
 * with a `repeatCount`, so one root cause doesn't read as N distinct problems.
 */
function collapseConsecutiveDuplicates(events: JourneyEvent[]): JourneyEvent[] {
  const merged: JourneyEvent[] = []
  for (const event of events) {
    const previous = merged[merged.length - 1]
    if (previous && dedupeKey(previous) === dedupeKey(event)) {
      previous.ts = event.ts
      previous.repeatCount = (previous.repeatCount ?? 1) + 1
    } else {
      merged.push({ ...event })
    }
  }
  return merged
}

/** Sorts newest-last, caps at the most recent 50 events, and inserts gap markers for >15min silences. */
export function buildTimeline(events: JourneyEvent[]): BuildTimelineResult {
  const sorted = [...events].sort((a, b) => a.ts - b.ts)
  const truncated = sorted.length > MAX_TIMELINE_EVENTS
  const capped = truncated ? sorted.slice(sorted.length - MAX_TIMELINE_EVENTS) : sorted
  const deduped = collapseConsecutiveDuplicates(capped)

  const items: JourneyTimelineItem[] = []
  deduped.forEach((event, index) => {
    const previous = deduped[index - 1]
    if (previous && event.ts - previous.ts > GAP_THRESHOLD_MICROS) {
      items.push({
        type: 'gap',
        afterTs: previous.ts,
        beforeTs: event.ts,
        minutes: Math.round((event.ts - previous.ts) / 1000 / 1000 / 60),
      })
    }
    items.push({ type: 'event', event })
  })

  return { items, truncated }
}
