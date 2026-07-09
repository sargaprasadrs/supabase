import { Badge } from 'ui'

import type { ReplicationPhase } from './warehouseDemoStore'
import { getWarehouseDestinationStatusLabel } from './warehouseReplication.utils'

interface WarehouseSyncChipProps {
  phase: ReplicationPhase
}

export function WarehouseSyncChip({ phase }: WarehouseSyncChipProps) {
  const label = getWarehouseDestinationStatusLabel(phase)

  const variant =
    phase === 'failed'
      ? 'destructive'
      : phase === 'backfilling' || phase === 'provisioning'
        ? 'warning'
        : phase === 'streaming'
          ? 'success'
          : 'default'

  return <Badge variant={variant}>{label}</Badge>
}
