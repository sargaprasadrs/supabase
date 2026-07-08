const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function toMillis(input: number | string): number {
  if (typeof input === 'number') {
    // JourneyEvent.ts is microseconds since epoch
    return input / 1000
  }
  return new Date(input).getTime()
}

/** Rounded, compact relative time — "14m ago", never "13.7 minutes". */
export function formatRelativeCompact(input: number | string): string {
  const ms = Date.now() - toMillis(input)
  if (ms < MINUTE) return 'just now'
  if (ms < HOUR) return `${Math.round(ms / MINUTE)}m ago`
  if (ms < DAY) return `${Math.round(ms / HOUR)}h ago`
  return `${Math.round(ms / DAY)}d ago`
}

/**
 * Wall-clock time for a timeline node's line 2, e.g. "14:02:11 UTC". Explicitly UTC —
 * without `timeZone: 'UTC'` this renders in the browser's local timezone, which then
 * disagrees with the UTC timestamps quoted in the raw log text shown in "View details".
 */
export function formatEventClock(microsTs: number): string {
  const formatted = new Date(microsTs / 1000).toLocaleTimeString('en-US', {
    hour12: false,
    timeZone: 'UTC',
  })
  return `${formatted} UTC`
}

/** Spelled-out duration for the gap marker, e.g. "41 minutes" or "2 hours 15 minutes". */
export function formatGapDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const hourPart = `${hours} hour${hours === 1 ? '' : 's'}`
  if (minutes === 0) return hourPart
  return `${hourPart} ${minutes} minute${minutes === 1 ? '' : 's'}`
}
