import { useParams } from 'common'
import { Card, CardContent } from 'ui'
import { ChartMetric } from 'ui-patterns/Chart'

import { useWarehouseProjectState } from './warehouseDemoStore'
import { formatReplicationLagSeconds, formatReplicationPhase } from './warehouseReplication.utils'
import { WarehouseSyncChip } from './WarehouseSyncChip'

export function WarehouseObservabilityPanel() {
  const { ref: projectRef } = useParams()
  const state = useWarehouseProjectState(projectRef)

  if (!state.enabled) return null

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
          <div className="px-4 py-3">
            <ChartMetric
              label="Replication phase"
              value={formatReplicationPhase(state.replicationPhase)}
              tooltip="Project-wide Warehouse pipeline phase."
              className="[&_span]:text-sm"
            />
            <div className="mt-2">
              <WarehouseSyncChip phase={state.replicationPhase} />
            </div>
          </div>
          <div className="px-4 py-3">
            <ChartMetric
              label="Replication lag"
              value={formatReplicationLagSeconds(state.lagSeconds)}
              tooltip="Approximate lag between Postgres and Warehouse."
              className="[&_span]:text-sm"
            />
          </div>
          <div className="px-4 py-3">
            <ChartMetric
              label="Replicated schemas"
              value={state.includedSchemas.length.toLocaleString()}
              tooltip="Schemas currently replicated to Warehouse."
              className="[&_span]:text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
