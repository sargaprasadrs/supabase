import { LOCAL_STORAGE_KEYS, useParams } from 'common'
import { cn } from 'ui'

import { isWarehouseProjectEnabled } from '@/components/interfaces/Database/Warehouse/warehouseDemoStore'
import { useIsWarehouseEnabled } from '@/hooks/misc/useIsWarehouseEnabled'
import { useLocalStorageQuery } from '@/hooks/misc/useLocalStorage'

export type SqlQueryTarget = 'postgres' | 'warehouse'

interface SqlWarehouseTargetToggleProps {
  className?: string
}

export function SqlWarehouseTargetToggle({ className }: SqlWarehouseTargetToggleProps) {
  const { ref: projectRef } = useParams()
  const isWarehouseFeatureEnabled = useIsWarehouseEnabled()
  const warehouseEnabled = isWarehouseProjectEnabled(projectRef)

  const [queryTarget, setQueryTarget] = useLocalStorageQuery<SqlQueryTarget>(
    LOCAL_STORAGE_KEYS.SQL_EDITOR_QUERY_TARGET(projectRef as string),
    'postgres'
  )

  if (!isWarehouseFeatureEnabled || !warehouseEnabled) return null

  return (
    <div
      className={cn(
        'flex items-center rounded-md border border-overlay bg-surface-200 p-0.5 text-xs',
        className
      )}
      role="group"
      aria-label="SQL query target"
    >
      <button
        type="button"
        className={cn(
          'rounded px-2 py-1 transition-colors',
          queryTarget === 'postgres'
            ? 'bg-surface-100 text-foreground shadow-sm'
            : 'text-foreground-light hover:text-foreground'
        )}
        onClick={() => setQueryTarget('postgres')}
      >
        Postgres
      </button>
      <button
        type="button"
        className={cn(
          'rounded px-2 py-1 transition-colors',
          queryTarget === 'warehouse'
            ? 'bg-surface-100 text-foreground shadow-sm'
            : 'text-foreground-light hover:text-foreground'
        )}
        onClick={() => setQueryTarget('warehouse')}
      >
        Warehouse
      </button>
    </div>
  )
}

export function useSqlQueryTarget(): SqlQueryTarget {
  const { ref: projectRef } = useParams()
  const [queryTarget] = useLocalStorageQuery<SqlQueryTarget>(
    LOCAL_STORAGE_KEYS.SQL_EDITOR_QUERY_TARGET(projectRef as string),
    'postgres'
  )
  return queryTarget
}
