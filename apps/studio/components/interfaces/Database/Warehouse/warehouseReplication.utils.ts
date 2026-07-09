import type { ReplicationPhase, WarehouseProjectState } from './warehouseDemoStore'

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

export function getWarehouseDestinationStatusLabel(phase: ReplicationPhase): string {
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
  databaseName = 'postgres',
  port = 5432,
}: {
  projectRef: string
  databaseName?: string
  port?: number
}): string {
  const host = getMockWarehouseHost(projectRef)
  return `postgresql://postgres.[YOUR-PASSWORD]@${host}:${port}/${databaseName}`
}

export function isWarehouseReplicationHealthy(state: WarehouseProjectState): boolean {
  return state.enabled && state.replicationPhase === 'streaming' && (state.lagSeconds ?? 0) < 120
}
