import type {
  ReplicationPhase,
  WarehousePipelineStatus,
  WarehouseProjectState,
} from './warehouseDemoStore'
import { isTableReplicated } from './warehouseDemoStore'

export function formatReplicationPhase(phase: ReplicationPhase): string {
  switch (phase) {
    case 'idle':
      return 'Not enabled'
    case 'provisioning':
      return 'Provisioning'
    case 'backfilling':
      return 'Backfilling'
    case 'streaming':
      return 'Streaming'
    case 'failed':
      return 'Error'
    default:
      return phase
  }
}

export function formatReplicationLagSeconds(lagSeconds: number | null): string {
  if (lagSeconds === null) return '—'
  if (lagSeconds === 0) return 'Caught up'
  if (lagSeconds < 60) return `${lagSeconds}s`
  if (lagSeconds < 3600) return `${Math.round(lagSeconds / 60)}m`
  return `${(lagSeconds / 3600).toFixed(1)}h`
}

export function getWarehouseDestinationStatusLabel(
  phase: ReplicationPhase,
  pipelineStatus: WarehousePipelineStatus = 'running'
): string {
  if (pipelineStatus === 'stopped' && phase === 'streaming') return 'Stopped'
  switch (phase) {
    case 'provisioning':
      return 'Starting'
    case 'backfilling':
      return 'Backfilling'
    case 'streaming':
      return 'Active'
    case 'failed':
      return 'Failed'
    default:
      return 'Unknown'
  }
}

export function getMockWarehouseHost(projectRef: string): string {
  return `warehouse.${projectRef}.supabase.co`
}

export function buildWarehouseConnectionString({
  projectRef,
  warehouseHost,
  databaseName = 'postgres',
  port = 5432,
}: {
  projectRef: string
  warehouseHost?: string
  databaseName?: string
  port?: number
}): string {
  const host = warehouseHost?.length ? warehouseHost : getMockWarehouseHost(projectRef)
  return `postgresql://postgres:[YOUR-PASSWORD]@${host}:${port}/${databaseName}`
}

export function isWarehouseReplicationHealthy(state: WarehouseProjectState): boolean {
  return (
    state.enabled &&
    state.replicationPhase === 'streaming' &&
    state.pipelineStatus === 'running' &&
    (state.lagSeconds ?? 0) < 120
  )
}

export type WarehousePipelineTableRow = {
  schema: string
  name: string
}

const MOCK_WAREHOUSE_TABLES_BY_SCHEMA: Record<string, string[]> = {
  public: ['users', 'profiles', 'events', 'orders'],
  auth: ['users', 'sessions', 'refresh_tokens'],
  storage: ['objects', 'buckets'],
}

type WarehousePipelineTablesState = {
  includedSchemas: readonly string[]
}

export function getMockWarehousePipelineTables(
  state: WarehousePipelineTablesState
): WarehousePipelineTableRow[] {
  const schemas = state.includedSchemas.length > 0 ? state.includedSchemas : ['public']

  return schemas.flatMap((schema) =>
    (MOCK_WAREHOUSE_TABLES_BY_SCHEMA[schema] ?? ['sample_table']).map((name) => ({
      schema,
      name,
    }))
  )
}

export function getWarehousePipelineTableLagSeconds(
  tableIndex: number,
  pipelineLagSeconds: number | null
): number | null {
  if (pipelineLagSeconds === null) return null
  if (pipelineLagSeconds === 0) return 0
  return Math.max(0, pipelineLagSeconds - tableIndex)
}

export function resolveWarehousePipelineTables({
  projectRef,
  state,
  tables,
}: {
  projectRef: string | undefined
  state: WarehousePipelineTablesState
  tables: WarehousePipelineTableRow[] | undefined
}): WarehousePipelineTableRow[] {
  if (!tables) return getMockWarehousePipelineTables(state)

  const replicated = tables
    .filter((table) => isTableReplicated(projectRef, table.schema, table.name))
    .sort((a, b) => `${a.schema}.${a.name}`.localeCompare(`${b.schema}.${b.name}`))

  if (replicated.length > 0) return replicated

  return getMockWarehousePipelineTables(state)
}
