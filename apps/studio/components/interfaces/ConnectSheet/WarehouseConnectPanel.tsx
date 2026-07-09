import { useParams } from 'common'
import { useMemo } from 'react'
import { CodeBlock } from 'ui-patterns/CodeBlock'

import { useWarehouseProjectState } from '@/components/interfaces/Database/Warehouse/warehouseDemoStore'
import { buildWarehouseConnectionString } from '@/components/interfaces/Database/Warehouse/warehouseReplication.utils'

export function WarehouseConnectPanel() {
  const { ref: projectRef } = useParams()
  const warehouseState = useWarehouseProjectState(projectRef)

  const connectionString = useMemo(
    () =>
      buildWarehouseConnectionString({
        projectRef: projectRef ?? '',
        databaseName: 'postgres',
      }),
    [projectRef]
  )

  if (!warehouseState.enabled) {
    return (
      <div className="p-8">
        <p className="text-sm text-foreground-light">
          Enable Warehouse from Database → Replication to view connection credentials.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y">
      <div className="p-8 flex flex-col gap-y-4">
        <div>
          <p className="text-sm text-foreground">Warehouse endpoint</p>
          <p className="text-sm text-foreground-light mt-1">
            Connect directly to your Warehouse replica. Schema and table names match Postgres (for
            example, <code>public.events</code> on both endpoints).
          </p>
        </div>
        <div>
          <p className="text-sm text-foreground mb-2">Host</p>
          <CodeBlock language="bash" hideLineNumbers>
            {warehouseState.warehouseHost}
          </CodeBlock>
        </div>
        <div>
          <p className="text-sm text-foreground mb-2">Connection string</p>
          <CodeBlock language="bash" hideLineNumbers>
            {connectionString}
          </CodeBlock>
        </div>
        <p className="text-xs text-foreground-lighter">
          Replicated schemas: {warehouseState.includedSchemas.join(', ') || 'none'}
        </p>
      </div>
    </div>
  )
}
