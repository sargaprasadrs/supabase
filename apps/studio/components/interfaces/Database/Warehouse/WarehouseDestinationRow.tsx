import { useParams } from 'common'
import { Database, Minus } from 'lucide-react'
import { TableCell, TableRow, Tooltip, TooltipContent, TooltipTrigger } from 'ui'

import { MANAGED_WAREHOUSE_PUBLICATION_TOOLTIP } from './managedWarehouse.resources'
import { useWarehouseProjectState } from './warehouseDemoStore'
import {
  formatReplicationLagSeconds,
  getWarehouseDestinationStatusLabel,
} from './warehouseReplication.utils'
import { WarehouseSyncChip } from './WarehouseSyncChip'

export function WarehouseDestinationRow() {
  const { ref: projectRef } = useParams()
  const state = useWarehouseProjectState(projectRef)

  if (!state.enabled || !state.pipelineId) return null

  const statusLabel = getWarehouseDestinationStatusLabel(state.replicationPhase)
  const lag = formatReplicationLagSeconds(state.lagSeconds)
  const isCaughtUp = state.lagSeconds === 0 || state.lagSeconds === 2

  return (
    <TableRow>
      <TableCell>
        <Database size={18} className="text-foreground-light" />
      </TableCell>
      <TableCell className="max-w-[180px]">
        <div>
          <p>DuckLake (Pipeline ID: {state.pipelineId})</p>
          <p className="text-foreground-lighter">{state.destinationName}</p>
        </div>
      </TableCell>
      <TableCell>
        <WarehouseSyncChip phase={state.replicationPhase} />
        {statusLabel === 'Failed' && (
          <p className="text-xs text-foreground-lighter mt-1">Managed Warehouse pipeline</p>
        )}
      </TableCell>
      <TableCell>
        {state.replicationPhase === 'streaming' || state.replicationPhase === 'backfilling' ? (
          isCaughtUp ? (
            <p className="text-foreground-light">Caught up</p>
          ) : (
            <p className="text-foreground-light">{lag}</p>
          )
        ) : (
          <Minus size={18} className="text-foreground-lighter" />
        )}
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-foreground-light">{state.publicationName}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {MANAGED_WAREHOUSE_PUBLICATION_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell />
    </TableRow>
  )
}
