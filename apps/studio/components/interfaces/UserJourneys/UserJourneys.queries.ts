import { getPaginatedUsersSQL, getUserSQL } from '@supabase/pg-meta'

import type { JourneyUser } from './UserJourneys.types'
import { executeAnalyticsSql } from '@/data/logs/execute-analytics-sql'
import { logsAllEndpointUrl } from '@/data/logs/logs-endpoint'
import { analyticsLiteral, safeSql } from '@/data/logs/safe-analytics-sql'
import { executeSql } from '@/data/sql/execute-sql-mutation'

// This feature only targets the OTEL (ClickHouse) logs path — see phase 1 findings,
// the legacy BigQuery path has no auth_event.* / user-correlation fields ported to it.
const otelEndpoint = logsAllEndpointUrl(true)

export interface LogRow {
  id: string
  timestamp: string
  event_message: string
  log_attributes: Record<string, string>
}

/** auth.users lookup — reuses the exact SQL Studio's Auth > Users page runs, so no hand-written raw SQL against auth.users. */
export async function searchAuthUserByEmail(
  projectRef: string,
  connectionString: string | null,
  email: string,
  signal?: AbortSignal
): Promise<JourneyUser | undefined> {
  // `keywords` is a substring match, so over-fetch a little and pick the exact match
  // client-side rather than trusting result[0] on a possible substring collision.
  const sql = getPaginatedUsersSQL({
    keywords: email,
    limit: 5,
    sort: 'id',
    order: 'asc',
  })
  const { result } = await executeSql<
    { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[]
  >({ projectRef, connectionString, sql }, signal)
  const row = result.find((r) => r.email?.toLowerCase() === email.toLowerCase()) ?? result[0]
  if (!row) return undefined
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
  }
}

/** auth.users lookup by id — direct primary-key read via the same builder Studio's Auth > Users detail view uses. */
export async function searchAuthUserById(
  projectRef: string,
  connectionString: string | null,
  userId: string,
  signal?: AbortSignal
): Promise<JourneyUser | undefined> {
  const sql = getUserSQL(userId)
  const { result } = await executeSql<
    { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[]
  >({ projectRef, connectionString, sql }, signal)
  const row = result[0]
  if (!row) return undefined
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
  }
}

/** auth_logs by user id — matches the structured `auth_event.actor_id` field. */
export async function fetchAuthLogsByActorId(
  projectRef: string,
  userId: string,
  isoStart: string,
  isoEnd: string,
  signal?: AbortSignal
): Promise<LogRow[]> {
  const idLit = analyticsLiteral(userId)
  const sql = safeSql`
    -- user journeys: auth events by actor id
    select id, timestamp, event_message, log_attributes
    from logs
    where source = 'auth_logs'
      and log_attributes['auth_event.actor_id'] = ${idLit}
    order by timestamp desc
    limit 50
  `
  const data = await executeAnalyticsSql({
    projectRef,
    endpoint: otelEndpoint,
    sql,
    iso_timestamp_start: isoStart,
    iso_timestamp_end: isoEnd,
    signal,
  })
  return (data?.result ?? []) as LogRow[]
}

/**
 * auth_logs by email — matches on the structured `auth_event.traits.user_email` field
 * (reliable for completed events) OR a raw event_message substring match, so a signup
 * that failed before that trait was populated is still surfaced.
 */
export async function fetchAuthLogsByEmail(
  projectRef: string,
  email: string,
  isoStart: string,
  isoEnd: string,
  signal?: AbortSignal
): Promise<LogRow[]> {
  const emailLit = analyticsLiteral(email)
  const emailPattern = analyticsLiteral(`%${email}%`)
  const sql = safeSql`
    -- user journeys: auth events by email
    select id, timestamp, event_message, log_attributes
    from logs
    where source = 'auth_logs'
      and (log_attributes['auth_event.traits.user_email'] = ${emailLit}
        or event_message ilike ${emailPattern})
    order by timestamp desc
    limit 50
  `
  const data = await executeAnalyticsSql({
    projectRef,
    endpoint: otelEndpoint,
    sql,
    iso_timestamp_start: isoStart,
    iso_timestamp_end: isoEnd,
    signal,
  })
  return (data?.result ?? []) as LogRow[]
}

/**
 * postgres_logs errors that positively reference this user — their id must appear in the
 * log line (e.g. a 23502 not-null violation's DETAIL echoes the failing row, including its
 * id column). No shared session/request id crosses sources, so a substring match on the raw
 * id is the only real (non-guessed) link available. This deliberately excludes global noise
 * (57P01 admin terminations, 57P03 shutdowns, generic 25P02 cascades) that never mentions a
 * specific user. Matches are annotations on the journey, not first-class feed events.
 */
export async function fetchPostgresErrorsForUser(
  projectRef: string,
  userId: string,
  isoStart: string,
  isoEnd: string,
  signal?: AbortSignal
): Promise<LogRow[]> {
  const idPattern = analyticsLiteral(`%${userId}%`)
  const sql = safeSql`
    -- user journeys: postgres errors that mention this user's id
    select id, timestamp, event_message, log_attributes
    from logs
    where source = 'postgres_logs'
      and log_attributes['parsed.error_severity'] in ('ERROR', 'FATAL', 'PANIC')
      and event_message ilike ${idPattern}
    order by timestamp desc
    limit 50
  `
  const data = await executeAnalyticsSql({
    projectRef,
    endpoint: otelEndpoint,
    sql,
    iso_timestamp_start: isoStart,
    iso_timestamp_end: isoEnd,
    signal,
  })
  return (data?.result ?? []) as LogRow[]
}
