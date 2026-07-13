/**
 * UserJourney — PROTOTYPE
 *
 * This is a demo-quality prototype of the "User Journey" tab. It renders a
 * chronological timeline reconstructed from Auth and PostgREST logs using
 * HARDCODED MOCK DATA — there are no real log queries wired up yet.
 *
 * See PRFAQ: https://www.notion.so/supabase/User-Journey-PRFAQ (placeholder link)
 */
import { useParams } from 'common'
import { AlertTriangle, Database, ExternalLink, LogIn, RefreshCw, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button, cn, Separator } from 'ui'
import { Admonition } from 'ui-patterns/admonition'
import { TimestampInfo } from 'ui-patterns/TimestampInfo'

import { UserHeader } from './UserHeader'
import { PANEL_PADDING } from './Users.constants'
import { ButtonTooltip } from '@/components/ui/ButtonTooltip'
import { User } from '@/data/auth/users-infinite-query'

type JourneyEventStatus = 'success' | 'neutral' | 'error'
type JourneyEventSource = 'auth' | 'postgrest'

interface JourneyEvent {
  id: string
  timestamp: string // ISO, ms precision
  source: JourneyEventSource
  status: JourneyEventStatus
  title: string
  description: string
  request?: { method: string; path: string; statusCode: number }
  error?: { message: string; policy?: string; table?: string }
}

const MOCK_JOURNEY_EVENTS: JourneyEvent[] = [
  {
    id: '1',
    timestamp: '2026-07-13T09:41:02.118Z',
    source: 'auth',
    status: 'success',
    title: 'Signed up',
    description: 'Auth · new user created via email signup',
  },
  {
    id: '2',
    timestamp: '2026-07-13T09:41:02.421Z',
    source: 'auth',
    status: 'success',
    title: 'Authenticated',
    description: 'Auth · session issued, JWT minted',
  },
  {
    id: '3',
    timestamp: '2026-07-13T09:41:03.905Z',
    source: 'postgrest',
    status: 'neutral',
    title: 'Read profile',
    description: 'PostgREST · fetched the current user profile',
    request: { method: 'GET', path: '/rest/v1/profiles', statusCode: 200 },
  },
  {
    id: '4',
    timestamp: '2026-07-13T09:41:05.332Z',
    source: 'postgrest',
    status: 'neutral',
    title: 'Created order',
    description: 'PostgREST · inserted a new order row',
    request: { method: 'POST', path: '/rest/v1/orders', statusCode: 201 },
  },
  {
    id: '5',
    timestamp: '2026-07-13T09:41:06.744Z',
    source: 'postgrest',
    status: 'error',
    title: 'Write blocked',
    description: 'PostgREST · insert rejected before reaching the table',
    request: { method: 'POST', path: '/rest/v1/payments', statusCode: 403 },
    error: {
      message: 'Denied by RLS policy',
      policy: 'payments_insert_owner',
      table: 'payments',
    },
  },
]

const getEventIcon = (event: JourneyEvent) => {
  if (event.status === 'error') return AlertTriangle
  if (event.source === 'postgrest') return Database
  return event.title === 'Signed up' ? UserPlus : LogIn
}

const RequestLine = ({ request }: { request: NonNullable<JourneyEvent['request']> }) => (
  <span className="font-mono text-xs text-foreground-light">
    {request.method} {request.path} · {request.statusCode}
  </span>
)

interface UserJourneyProps {
  user: User
}

export const UserJourney = ({ user }: UserJourneyProps) => {
  const { ref } = useParams()
  const [errorsOnly, setErrorsOnly] = useState(false)

  const events = errorsOnly
    ? MOCK_JOURNEY_EVENTS.filter((event) => event.status === 'error')
    : MOCK_JOURNEY_EVENTS

  return (
    <div>
      <UserHeader user={user} />

      <Separator />

      <div className={cn('flex flex-col gap-y-4', PANEL_PADDING)}>
        <div className="flex items-start justify-between">
          <div>
            <p>User journey</p>
          </div>
          <span className="text-xs text-foreground-lighter whitespace-nowrap pt-0.5">
            Last 24 hours
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant={errorsOnly ? 'default' : 'secondary'}
              className="rounded-r-none border-r-0"
              onClick={() => setErrorsOnly(false)}
            >
              Show all
            </Button>
            <div className="border-button border border-l-0 py-3" />
            <Button
              variant={errorsOnly ? 'secondary' : 'default'}
              className="rounded-l-none border-l-0"
              onClick={() => setErrorsOnly(true)}
            >
              Errors only
            </Button>
          </div>
          <div className="flex items-center gap-x-2">
            <ButtonTooltip
              asChild
              variant="default"
              className="px-2"
              tooltip={{ content: { text: 'Filter logs by user' } }}
            >
              <Link href={`/project/${ref}/logs/auth-logs?s=${user.id}`}>
                <ExternalLink size={14} className="text-foreground-light" />
              </Link>
            </ButtonTooltip>
            <ButtonTooltip
              variant="default"
              className="px-2"
              icon={<RefreshCw />}
              onClick={() => setErrorsOnly(false)}
              tooltip={{ content: { text: 'Refresh' } }}
            />
          </div>
        </div>

        {events.length === 0 ? (
          <Admonition
            type="note"
            title="No journey available for this user"
            description="Events from auth and API logs will be shown here"
          />
        ) : (
          <ol className="flex flex-col">
            {events.map((event, index) => {
              const Icon = getEventIcon(event)
              const isLast = index === events.length - 1
              const isError = event.status === 'error'

              return (
                <li key={event.id} className="flex gap-x-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex items-center justify-center rounded-full w-6 h-6 shrink-0 border',
                        isError
                          ? 'bg-destructive-200 border-destructive-400 text-destructive'
                          : 'bg-surface-100 border-strong text-foreground-light'
                      )}
                    >
                      <Icon size={12} strokeWidth={1.5} />
                    </div>
                    {!isLast && <div className="w-px grow bg-border my-1.5" />}
                  </div>

                  <div className={cn('flex-1 min-w-0', isLast ? 'pb-0' : 'pb-8')}>
                    {isError ? (
                      <div className="rounded-md border border-destructive-400 bg-destructive-200 overflow-hidden">
                        <div className="px-3 py-2.5">
                          <div className="flex items-center justify-between gap-x-2">
                            <p className="text-sm font-medium text-destructive">{event.title}</p>
                            <TimestampInfo
                              utcTimestamp={event.timestamp}
                              format="HH:mm:ss.SSS"
                              className="font-mono text-xs text-destructive whitespace-nowrap"
                            />
                          </div>
                          <p className="text-xs text-foreground-light mt-0.5">
                            {event.description}
                          </p>
                          {event.request && (
                            <p className="mt-1.5">
                              <RequestLine request={event.request} />
                            </p>
                          )}
                        </div>
                        {event.error && (
                          <>
                            <Separator className="bg-destructive-400" />
                            <div className="px-3 py-2.5">
                              <p className="text-xs text-foreground-light">{event.error.message}</p>
                              <p className="text-xs mt-1">
                                <span className="text-foreground-light">policy </span>
                                <span className="font-mono text-foreground">
                                  {event.error.policy}
                                </span>
                                <span className="text-foreground-light"> on table </span>
                                <span className="font-mono text-foreground">
                                  {event.error.table}
                                </span>
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-x-2">
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          <TimestampInfo
                            utcTimestamp={event.timestamp}
                            format="HH:mm:ss.SSS"
                            className="font-mono text-xs text-foreground-lighter whitespace-nowrap"
                          />
                        </div>
                        <p className="text-xs text-foreground-light mt-0.5">{event.description}</p>
                        {event.request && (
                          <p className="mt-1.5">
                            <RequestLine request={event.request} />
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
