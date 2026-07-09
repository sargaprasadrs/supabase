import { useParams } from 'common'
import { useMemo } from 'react'

import type { ConnectMode } from './Connect.types'
import { useWarehouseProjectState } from '@/components/interfaces/Database/Warehouse/warehouseDemoStore'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'
import { useIsWarehouseEnabled } from '@/hooks/misc/useIsWarehouseEnabled'

export function useAvailableConnectModes(): ConnectMode[] {
  const { ref: projectRef } = useParams()
  const isWarehouseFeatureEnabled = useIsWarehouseEnabled()
  const warehouseState = useWarehouseProjectState(projectRef)
  const warehouseProjectEnabled = warehouseState.enabled
  const {
    projectConnectionShowAppFrameworks: showAppFrameworks,
    projectConnectionShowMobileFrameworks: showMobileFrameworks,
    projectConnectionShowOrms: showOrms,
  } = useIsFeatureEnabled([
    'project_connection:show_app_frameworks',
    'project_connection:show_mobile_frameworks',
    'project_connection:show_orms',
  ])

  return useMemo(() => {
    const allModes: { id: ConnectMode; enabled: boolean }[] = [
      { id: 'framework', enabled: showAppFrameworks || showMobileFrameworks },
      { id: 'server', enabled: true },
      { id: 'direct', enabled: true },
      { id: 'orm', enabled: showOrms },
      { id: 'mcp', enabled: true },
      { id: 'warehouse', enabled: isWarehouseFeatureEnabled && warehouseProjectEnabled },
    ]
    return allModes.filter((m) => m.enabled).map((m) => m.id)
  }, [
    showAppFrameworks,
    showMobileFrameworks,
    showOrms,
    isWarehouseFeatureEnabled,
    warehouseProjectEnabled,
  ])
}
