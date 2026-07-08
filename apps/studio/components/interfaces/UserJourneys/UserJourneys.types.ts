export type JourneyEventStatus = 'ok' | 'error' | 'warn' | 'neutral'

export type JourneySource = 'Auth' | 'Postgres'

export interface JourneyEvent {
  /** microseconds since epoch, matches otelTimestampToMicros */
  ts: number
  source: JourneySource
  kind: string
  title: string
  /** short mono fragment inline after the title, e.g. "GET /rest/v1/profiles → 200" */
  titleDetail?: string
  /** muted line 2 — the error message for failed events */
  detail?: string
  status: JourneyEventStatus
  /**
   * True for events that are annotations on the journey rather than the user's own actions —
   * currently only Postgres errors that positively reference this user's id. The journey
   * spine is the user's own Auth (and, if ever attributable, API) events.
   */
  isAnnotation?: boolean
  /** set when consecutive identical events were collapsed into this one, e.g. a transaction-abort cascade */
  repeatCount?: number
  raw: unknown
}

export interface JourneyGapMarker {
  type: 'gap'
  afterTs: number
  beforeTs: number
  minutes: number
}

export type JourneyTimelineItem = { type: 'event'; event: JourneyEvent } | JourneyGapMarker

export interface JourneyUser {
  id: string
  email: string | null
  createdAt: string | null
  lastSignInAt: string | null
}
