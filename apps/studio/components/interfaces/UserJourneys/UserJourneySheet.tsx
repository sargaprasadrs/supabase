import { useParams } from 'common'
import { AlertTriangle, Info, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetSection,
  SheetTitle,
} from 'ui'

import {
  UserJourneyAnnotationRow,
  UserJourneyEventRow,
  UserJourneyGapMarkerRow,
} from './UserJourneyEvent'
import { buildTimeline, normalizeAuthRow, normalizePostgresRow } from './UserJourneys.normalizer'
import {
  fetchAuthLogsByActorId,
  fetchAuthLogsByEmail,
  fetchPostgresErrorsForUser,
  searchAuthUserByEmail,
  searchAuthUserById,
} from './UserJourneys.queries'
import type { JourneyTimelineItem, JourneyUser } from './UserJourneys.types'
import { formatRelativeCompact } from './UserJourneys.utils'
import { useCheckEntitlements } from '@/hooks/misc/useCheckEntitlements'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { UUID_REGEX } from '@/lib/constants'

interface UserJourneySheetProps {
  identifier: string | null
  onOpenChange: (open: boolean) => void
}

export const UserJourneySheet = ({ identifier, onOpenChange }: UserJourneySheetProps) => {
  const { ref: projectRef } = useParams()
  const { data: project } = useSelectedProjectQuery()
  const { getEntitlementNumericValue } = useCheckEntitlements('log.retention_days')
  const retentionDays = getEntitlementNumericValue() || 1

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [user, setUser] = useState<JourneyUser | undefined>(undefined)
  const [timelineItems, setTimelineItems] = useState<JourneyTimelineItem[]>([])
  const [truncated, setTruncated] = useState(false)
  const [sourcesUsed, setSourcesUsed] = useState<string[]>([])
  const [sourceErrors, setSourceErrors] = useState<string[]>([])

  const isId = !!identifier && UUID_REGEX.test(identifier)

  const loadJourney = useCallback(async () => {
    if (!projectRef || !identifier) return

    const end = new Date()
    const start = new Date(end.getTime() - retentionDays * 24 * 60 * 60 * 1000)
    const errors: string[] = []

    // The journey spine is the user's own Auth events — confirmed queryable by identity
    // (email or actor id), not a guess. PostgREST/edge_logs events would join the same way
    // if the OTEL field set ever carried a JWT `sub`; today it doesn't (only anon/service_role
    // apikey role), so API activity isn't part of the journey at all rather than being faked
    // via a weaker signal like IP.
    const foundUser = isId
      ? await searchAuthUserById(projectRef, project?.connectionString ?? null, identifier)
      : await searchAuthUserByEmail(projectRef, project?.connectionString ?? null, identifier)
    setUser(foundUser)

    const authRows = await (
      isId
        ? fetchAuthLogsByActorId(projectRef, identifier, start.toISOString(), end.toISOString())
        : fetchAuthLogsByEmail(projectRef, identifier, start.toISOString(), end.toISOString())
    ).catch(() => {
      errors.push('Auth')
      return []
    })
    const authEvents = authRows.map(normalizeAuthRow)

    // Postgres errors are annotations, not spine events, and only included when they
    // positively reference this user's id in the raw log text — never by time proximity
    // alone, which would also catch global noise (admin terminations, shutdowns, unrelated
    // transaction-abort cascades) that has nothing to do with this specific user.
    const userId =
      foundUser?.id ??
      authRows.find((r) => r.log_attributes?.['auth_event.actor_id'])?.log_attributes?.[
        'auth_event.actor_id'
      ] ??
      (isId ? identifier : undefined)

    const pgRows = userId
      ? await fetchPostgresErrorsForUser(
          projectRef,
          userId,
          start.toISOString(),
          end.toISOString()
        ).catch(() => {
          errors.push('Postgres')
          return []
        })
      : []
    const pgEvents = pgRows.map(normalizePostgresRow)

    const allEvents = [...authEvents, ...pgEvents]
    const { items, truncated: didTruncate } = buildTimeline(allEvents)

    setTimelineItems(items)
    setTruncated(didTruncate)
    setSourcesUsed(Array.from(new Set(allEvents.map((e) => e.source))))
    setSourceErrors(errors)
  }, [projectRef, identifier, isId, project?.connectionString, retentionDays])

  useEffect(() => {
    if (!identifier) return
    setIsLoading(true)
    loadJourney().finally(() => setIsLoading(false))
  }, [identifier, loadJourney])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadJourney()
    setIsRefreshing(false)
  }

  const email = user?.email ?? identifier ?? ''
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <Sheet open={!!identifier} onOpenChange={onOpenChange}>
      <SheetContent size="lg" className="flex flex-col gap-0 p-0">
        <SheetHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className={user ? undefined : 'bg-warning-200'}>
              <AvatarFallback>
                {user ? initials : <AlertTriangle size={16} className="text-warning" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 min-w-0 text-left">
              <SheetTitle className="text-sm truncate">{email}</SheetTitle>
              {user ? (
                <span className="text-xs font-mono text-foreground-lighter">
                  {user.id} · signed up{' '}
                  {user.createdAt ? formatRelativeCompact(user.createdAt) : 'unknown'}
                </span>
              ) : (
                <span className="text-xs text-warning">
                  No account exists — signup never completed
                </span>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="tiny"
            className="mr-6"
            aria-label="Refresh journey"
            icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
            disabled={isRefreshing}
            onClick={handleRefresh}
          />
        </SheetHeader>

        <div className="flex-1 overflow-auto">
          <SheetSection className="flex flex-col gap-4">
            {sourceErrors.map((source) => (
              <div
                key={source}
                className="flex items-center gap-2 px-3 py-2 border rounded-md border-warning-400 bg-warning-200 text-sm text-foreground-light"
              >
                <AlertTriangle size={14} className="text-warning shrink-0" />
                {source} logs unavailable — this journey may be incomplete
              </div>
            ))}

            {isLoading ? (
              <p className="text-sm text-foreground-light">Loading journey…</p>
            ) : timelineItems.length === 0 ? (
              <p className="text-sm text-foreground-lighter">
                No activity found for this identity in the queryable log window ({retentionDays}{' '}
                days)
              </p>
            ) : (
              <div className="relative flex flex-col gap-5 pl-2">
                <div className="absolute left-[8px] top-2 bottom-2 w-px bg-border" aria-hidden />
                {timelineItems.map((item, index) =>
                  item.type === 'gap' ? (
                    <UserJourneyGapMarkerRow key={`gap-${index}`} marker={item} />
                  ) : item.event.isAnnotation ? (
                    <UserJourneyAnnotationRow key={`event-${index}`} event={item.event} />
                  ) : (
                    <UserJourneyEventRow key={`event-${index}`} event={item.event} />
                  )
                )}
              </div>
            )}

            {truncated && (
              <p className="text-xs text-foreground-lighter">Showing most recent 50 events</p>
            )}
          </SheetSection>
        </div>

        <div className="flex items-start gap-2 px-5 py-3 border-t border-default text-xs text-foreground-lighter">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            Built from {sourcesUsed.length > 0 ? sourcesUsed.join(', ') : 'Auth'} logs, in UTC ·
            Postgres errors only appear when they reference this user's id directly
          </span>
        </div>
      </SheetContent>
    </Sheet>
  )
}
