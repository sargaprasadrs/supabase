import { ArrowRight, CheckCircle2, Clock, Database, RotateCcw, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from 'ui'

import type { JourneyEvent, JourneyGapMarker } from './UserJourneys.types'
import { formatEventClock } from './UserJourneys.utils'

const STATUS_ICON: Record<JourneyEvent['status'], typeof CheckCircle2> = {
  ok: CheckCircle2,
  error: XCircle,
  neutral: ArrowRight,
  warn: RotateCcw,
}

const STATUS_COLOR: Record<JourneyEvent['status'], string> = {
  ok: 'text-brand',
  error: 'text-destructive',
  neutral: 'text-foreground-lighter',
  warn: 'text-warning',
}

export const UserJourneyGapMarkerRow = ({ marker }: { marker: JourneyGapMarker }) => (
  <div className="relative flex gap-3 pl-6">
    <span className="absolute left-0 top-0.5 flex items-center justify-center w-[17px] h-[17px] rounded-full bg-studio" />
    <div className="flex items-center gap-2 px-3 py-1.5 border border-dashed rounded-md border-strong text-foreground-lighter text-xs">
      <Clock size={12} />
      <span>
        {marker.minutes} minutes with no logged activity — client-side events aren't captured
      </span>
    </div>
  </div>
)

/** A first-class event on the journey spine — the user's own Auth (and, if ever attributable, API) actions. */
export const UserJourneyEventRow = ({ event }: { event: JourneyEvent }) => {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const StatusIcon = STATUS_ICON[event.status]

  return (
    <div className="relative flex gap-3 pl-6">
      <span className="absolute left-0 top-0.5 flex items-center justify-center w-[17px] h-[17px] rounded-full bg-studio">
        <StatusIcon size={17} className={STATUS_COLOR[event.status]} />
      </span>

      <div className="flex flex-col gap-1 min-w-0 flex-1 pb-1">
        <div className="text-[13px] leading-snug">
          <span className="font-bold text-foreground">{event.title}</span>
          {event.titleDetail && (
            <span className="font-mono text-[12px] text-foreground-light">
              {' '}
              {event.titleDetail}
            </span>
          )}
          {event.repeatCount && event.repeatCount > 1 && (
            <span className="text-foreground-lighter"> ×{event.repeatCount}</span>
          )}
        </div>

        <div className="text-[12px] text-foreground-lighter">
          {formatEventClock(event.ts)} · {event.source}
          {event.status === 'error' && event.detail && <> · {event.detail}</>}
          {event.repeatCount && event.repeatCount > 1 && <> · repeated {event.repeatCount} times</>}
        </div>

        {event.status === 'error' && (
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <div className="flex gap-2 pt-1">
              <CollapsibleTrigger asChild>
                <Button type="button" variant="default" size="tiny">
                  {detailsOpen ? 'Hide details' : 'View details'}
                </Button>
              </CollapsibleTrigger>
              <Button type="button" variant="default" size="tiny" onClick={() => {}}>
                Explain with assistant
              </Button>
            </div>
            <CollapsibleContent>
              <pre className="mt-2 p-2.5 rounded-md bg-surface-200 border border-default text-[11px] font-mono whitespace-pre-wrap break-all text-foreground-light">
                {JSON.stringify(event.raw, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  )
}

/**
 * An annotation on the journey — currently Postgres errors that positively reference this
 * user's id. Deliberately smaller and quieter than a spine event: it's a data-level mention,
 * not something the user did.
 */
export const UserJourneyAnnotationRow = ({ event }: { event: JourneyEvent }) => {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <div className="relative flex gap-3 pl-6">
      <span className="absolute left-[3px] top-1 flex items-center justify-center w-[11px] h-[11px] rounded-full bg-studio border border-foreground-muted">
        <Database size={7} className="text-foreground-lighter" />
      </span>

      <div className="flex flex-col gap-1 min-w-0 flex-1 pb-1 pl-4 border-l border-dashed border-strong">
        <div className="text-[12px] leading-snug text-foreground-light">
          <span className="font-medium">{event.title}</span>
          {event.repeatCount && event.repeatCount > 1 && (
            <span className="text-foreground-lighter"> ×{event.repeatCount}</span>
          )}
        </div>

        <div className="text-[11px] text-foreground-lighter">
          {formatEventClock(event.ts)} · references this user in a Postgres error
          {event.detail && <> · {event.detail}</>}
          {event.repeatCount && event.repeatCount > 1 && <> · repeated {event.repeatCount} times</>}
        </div>

        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="default" size="tiny" className="self-start mt-0.5">
              {detailsOpen ? 'Hide details' : 'View details'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-2 p-2.5 rounded-md bg-surface-200 border border-default text-[11px] font-mono whitespace-pre-wrap break-all text-foreground-light">
              {JSON.stringify(event.raw, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
