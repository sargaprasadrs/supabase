import { useParams } from 'common'
import { parseAsBoolean, useQueryState } from 'nuqs'
import { useState } from 'react'
import { Button, Card, CardContent } from 'ui'

import { useWarehouseProjectState } from './warehouseDemoStore'
import { WarehouseDisableModal } from './WarehouseDisableModal'
import { WarehouseEnableModal } from './WarehouseEnableModal'
import { WarehouseObservabilityPanel } from './WarehouseObservabilityPanel'
import { WarehouseSchemaScope } from './WarehouseSchemaScope'
import { WarehouseSyncChip } from './WarehouseSyncChip'
import { useIsWarehouseEnabled } from '@/hooks/misc/useIsWarehouseEnabled'

export function WarehouseProjectCard() {
  const { ref: projectRef } = useParams()
  const isWarehouseFeatureEnabled = useIsWarehouseEnabled()
  const warehouseState = useWarehouseProjectState(projectRef)

  const [showEnableModal, setShowEnableModal] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [, setShowConnect] = useQueryState('showConnect', parseAsBoolean.withDefault(false))
  const [, setConnectTab] = useQueryState('connectTab')

  if (!isWarehouseFeatureEnabled) return null

  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-6 flex flex-col gap-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex flex-col gap-y-1">
              <div className="flex items-center gap-x-2">
                <h4 className="text-foreground text-base">Warehouse</h4>
                {warehouseState.enabled && (
                  <WarehouseSyncChip phase={warehouseState.replicationPhase} />
                )}
              </div>
              <p className="text-sm text-foreground-light max-w-2xl">
                {warehouseState.enabled
                  ? 'Analytical replica of your Postgres data on a separate Warehouse endpoint. Query the same schema and table names against the Warehouse host.'
                  : 'Enable an analytical replica of your Postgres data on a separate Warehouse endpoint for analytics workloads.'}
              </p>
            </div>
            <div className="flex items-center gap-x-2 shrink-0">
              {warehouseState.enabled ? (
                <>
                  <Button
                    variant="default"
                    onClick={() => {
                      setConnectTab('warehouse')
                      setShowConnect(true)
                    }}
                  >
                    Connect
                  </Button>
                  <Button variant="danger" onClick={() => setShowDisableModal(true)}>
                    Disable Warehouse
                  </Button>
                </>
              ) : (
                <Button onClick={() => setShowEnableModal(true)}>Enable Warehouse</Button>
              )}
            </div>
          </div>

          {warehouseState.enabled && (
            <>
              <WarehouseObservabilityPanel />
              <WarehouseSchemaScope
                disabled={
                  warehouseState.replicationPhase === 'provisioning' ||
                  warehouseState.replicationPhase === 'backfilling'
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      <WarehouseEnableModal open={showEnableModal} onOpenChange={setShowEnableModal} />
      <WarehouseDisableModal open={showDisableModal} onOpenChange={setShowDisableModal} />
    </>
  )
}
