import { useParams } from 'common'
import Link from 'next/link'
import { Button } from 'ui'
import { Admonition } from 'ui-patterns/admonition'

import { WarehouseConnectCredentials } from './WarehouseConnectCredentials'
import { useWarehouseProjectState } from '@/components/interfaces/Database/Warehouse/warehouseDemoStore'

export function WarehouseConnectPanel() {
  const { ref: projectRef } = useParams()
  const warehouseState = useWarehouseProjectState(projectRef)

  if (!warehouseState.enabled) {
    return (
      <div className="p-8">
        <Admonition
          type="default"
          layout="responsive"
          title="Enable Warehouse for analytical workloads"
          description="Replicate your project database into Warehouse, then connect analytical tools to a dedicated endpoint."
          actions={
            projectRef
              ? [
                  <Button asChild key="replication" variant="default">
                    <Link href={`/project/${projectRef}/database/replication`}>
                      Enable Warehouse
                    </Link>
                  </Button>,
                ]
              : undefined
          }
        />
      </div>
    )
  }

  if (!projectRef) return null

  return (
    <div className="flex flex-col divide-y">
      <div className="p-8">
        <WarehouseConnectCredentials
          projectRef={projectRef}
          warehouseHost={warehouseState.warehouseHost}
        />
      </div>
    </div>
  )
}
