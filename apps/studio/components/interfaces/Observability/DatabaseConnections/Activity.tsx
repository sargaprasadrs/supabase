import dayjs from 'dayjs'
import { Minus, MoreVertical, StopCircle } from 'lucide-react'
import { parseAsJson, useQueryState } from 'nuqs'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'ui'
import { CodeBlock } from 'ui-patterns/CodeBlock'

import { ReportsSelectFilter, selectFilterSchema } from '../../Reports/v2/ReportsSelectFilter'
import { formatDuration } from '@/components/interfaces/QueryPerformance/QueryPerformance.utils'
import { useDatabaseActivityQuery, type DatabaseActivity } from '@/data/database/activity-query'
import { useQueryAbortMutation } from '@/data/sql/abort-query-mutation'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'

const getDuration = (activity: DatabaseActivity) => {
  const { state } = activity
  if (state === 'active' && activity.query_start) {
    return dayjs().utc().diff(dayjs(activity.query_start).utc(), 'second')
  }
  if (state === 'idle') {
    return dayjs().utc().diff(dayjs(activity.state_change).utc(), 'second')
  }
  if (state === 'idle in transaction' || state === 'idle in transaction (aborted)') {
    return dayjs().utc().diff(dayjs(activity.transaction_start).utc(), 'second')
  }
  return null
}

interface ActivityProps {
  live?: boolean
}

export const Activity = ({ live }: ActivityProps) => {
  const { data: project } = useSelectedProjectQuery()

  const [, setNow] = useState(() => dayjs())
  const [stateFilter, setStateFilter] = useQueryState(
    'functions',
    parseAsJson(selectFilterSchema.parse)
  )

  const { data, isPending } = useDatabaseActivityQuery(
    {
      projectRef: project?.ref,
      connectionString: project?.connectionString,
    },
    { refetchInterval: live ? 3000 : false }
  )

  const activities =
    stateFilter && stateFilter.length > 0
      ? data?.filter((activity) => activity.state !== null && stateFilter.includes(activity.state))
      : data

  const stateOptions = [
    'Idle',
    'Active',
    'Idle in transaction',
    'Idle in transaction (aborted)',
    'Fastpath function call',
    'Disabled',
  ].map((x) => ({
    label: x,
    value: x.toLowerCase(),
    quantity: data?.filter((y) => y.state === x.toLowerCase()).length,
  }))

  // [Joshen] Just to trigger a UI re-render for the duration to be "live"
  useEffect(() => {
    const interval = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex gap-x-4">
        <h2>Sessions</h2>
        <ReportsSelectFilter
          label="State"
          options={stateOptions}
          value={stateFilter ?? []}
          onChange={setStateFilter}
          isLoading={isPending}
          popoverClassName="w-60"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead className="max-w-[300px]">Query · Session</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Blocked by</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            {activities?.map((activity) => (
              <ActivityRow key={activity.pid} activity={activity} />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

const ActivityRow = ({ activity }: { activity: DatabaseActivity }) => {
  const { data: project } = useSelectedProjectQuery()
  const [showTerminateConfirmDialog, setShowTerminateConfirmDialog] = useState(false)

  const { mutateAsync: abortQuery } = useQueryAbortMutation({
    onSuccess: () => {
      toast.success(`Successfully aborted query (ID: ${activity.pid})`)
    },
  })

  const getBadgeVariant = (state: DatabaseActivity['state']) => {
    if (state === 'active') return 'success'
    if (state === 'idle in transaction') return 'warning'
    return 'default'
  }

  const durationSeconds = getDuration(activity)

  /**
   * Queries in "active state": 30s threshold is long enough (most CRUD queries should be quick)
   * Queries in "idle in transaction" state: This actively holds locks and blocks autovacuum while contributing nothing, so important to surface early at 10s threshold
   */
  const queryRunningLongWarning =
    !!durationSeconds &&
    ((activity.state === 'active' && durationSeconds >= 30) ||
      (activity.state === 'idle in transaction' && durationSeconds >= 10))

  const onConfirmTerminate = async () => {
    try {
      await abortQuery({
        pid: activity.pid,
        projectRef: project?.ref,
        connectionString: project?.connectionString,
      })
    } catch (error) {}
  }

  return (
    <>
      <TableRow id={activity.pid.toString()} key={activity.pid}>
        <TableCell>
          <Badge variant={getBadgeVariant(activity.state)}>{activity.state}</Badge>
        </TableCell>
        <TableCell className="max-w-[300px]">
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger>
              <p className="truncate font-mono tracking-tighter">{activity.query}</p>
            </HoverCardTrigger>
            <HoverCardContent align="start" className="w-96 p-0">
              <CodeBlock
                hideLineNumbers
                className={cn(
                  'max-w-96 border-none [&>code]:text-xs',
                  '[&>code]:m-0 [&>code>span]:flex [&>code>span]:flex-wrap min-h-11'
                )}
                wrapperClassName={cn('[&_pre]:px-4 [&_pre]:py-0')}
                language="pgsql"
                value={activity.query}
              />
            </HoverCardContent>
          </HoverCard>
          <p className="text-xs text-foreground-lighter flex items-center gap-x-1 mt-0.5 truncate">
            <span>PID: {activity.pid}</span>
            <span>·</span>
            <span>{activity.role_name}</span>
            {activity.application_name && (
              <>
                <span>·</span>
                <span>{activity.application_name}</span>
              </>
            )}
          </p>
        </TableCell>

        <TableCell>
          <p
            className={cn(
              'tabular-nums truncate',
              queryRunningLongWarning ? 'text-warning' : undefined
            )}
          >
            {durationSeconds !== null ? (
              formatDuration(durationSeconds * 1000, 0)
            ) : (
              <Minus size={12} className="text-foreground-lighter" />
            )}
          </p>
        </TableCell>

        <TableCell>
          {activity.blocked_by.length > 0 ? (
            activity.blocked_by.join(', ')
          ) : (
            <Minus size={12} className="text-foreground-lighter" />
          )}
        </TableCell>

        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="More actions"
                variant="text"
                className="px-1"
                icon={<MoreVertical />}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="gap-x-2"
                onClick={() => setShowTerminateConfirmDialog(true)}
              >
                <StopCircle size={12} />
                <span>Terminate</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <AlertDialog open={showTerminateConfirmDialog} onOpenChange={setShowTerminateConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm to terminate this process?</AlertDialogTitle>
            <AlertDialogDescription>
              This will force the query to stop running.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="warning" onClick={onConfirmTerminate}>
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
