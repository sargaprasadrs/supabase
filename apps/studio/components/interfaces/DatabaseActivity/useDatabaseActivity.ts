import { safeSql } from '@supabase/pg-meta'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { RawSession } from './DatabaseActivity.utils'
import { executeSql } from '@/data/sql/execute-sql-mutation'
import type { ResponseError } from '@/types'

const POLL_MARKER = 'database-activity-poll'

// The marker comment lets us filter out this very poll from the snapshot, since
// each poll runs as its own active query on some pooled backend.
const SESSIONS_SQL = safeSql`
  -- database-activity-poll
  select
    a.pid,
    a.usename as role_name,
    a.application_name,
    a.state,
    a.query,
    a.wait_event_type,
    a.wait_event,
    a.xact_start,
    a.query_start,
    a.state_change,
    pg_blocking_pids(a.pid) as blocked_by
  from pg_stat_activity a
  where a.datname = current_database()
    and a.pid <> pg_backend_pid()
  order by a.query_start asc nulls last;
`

const MAX_CONNECTIONS_SQL = safeSql`
  select setting::int as max_connections
  from pg_settings where name = 'max_connections';
`

export interface DatabaseActivityVariables {
  projectRef?: string
  connectionString?: string | null
}

async function getSessions(
  { projectRef, connectionString }: DatabaseActivityVariables,
  signal?: AbortSignal
) {
  const { result } = await executeSql(
    {
      projectRef,
      connectionString,
      sql: SESSIONS_SQL,
      queryKey: ['database-activity', 'sessions'],
    },
    signal
  )
  return ((result ?? []) as RawSession[]).filter((row) => !(row.query ?? '').includes(POLL_MARKER))
}

export function useDatabaseActivityQuery(
  { projectRef, connectionString }: DatabaseActivityVariables,
  { enabled = true, isPaused = false }: { enabled?: boolean; isPaused?: boolean } = {}
) {
  return useQuery<RawSession[], ResponseError>({
    queryKey: ['database-activity', 'sessions', projectRef, connectionString],
    queryFn: ({ signal }) => getSessions({ projectRef, connectionString }, signal),
    enabled: enabled && typeof projectRef !== 'undefined',
    refetchInterval: isPaused ? false : 5000,
    // Keep the last successful snapshot on screen between polls and on error —
    // the degraded case is exactly when the DB is wedged.
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  })
}

export function useMaxConnectionsQuery({
  projectRef,
  connectionString,
}: DatabaseActivityVariables) {
  return useQuery<number | null, ResponseError>({
    queryKey: ['database-activity', 'max-connections', projectRef, connectionString],
    queryFn: async ({ signal }) => {
      const { result } = await executeSql(
        {
          projectRef,
          connectionString,
          sql: MAX_CONNECTIONS_SQL,
          queryKey: ['database-activity', 'max-connections'],
        },
        signal
      )
      const row = (result ?? [])[0] as { max_connections?: number } | undefined
      return row?.max_connections ?? null
    },
    enabled: typeof projectRef !== 'undefined',
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
