import { useMemo } from 'react'

import { computeAdvisorAttention } from './useAdvisorAttention.utils'
import { useAdvisorSignals } from './useAdvisorSignals'
import { useProjectLintsQuery } from '@/data/lint/lint-query'
import { useNotificationsV2Query } from '@/data/notifications/notifications-v2-query'
import { IS_PLATFORM } from '@/lib/constants'

interface UseAdvisorAttentionOptions {
  projectRef?: string
  enabled?: boolean
}

export const useAdvisorAttention = ({
  projectRef,
  enabled = true,
}: UseAdvisorAttentionOptions = {}) => {
  const { data: lints } = useProjectLintsQuery({ projectRef }, { enabled: enabled && !!projectRef })

  const { data: signalItems } = useAdvisorSignals({
    projectRef,
    enabled: enabled && !!projectRef,
  })

  const { data: notificationsData } = useNotificationsV2Query(
    { filters: {}, limit: 20 },
    { enabled: enabled && IS_PLATFORM }
  )

  const notifications = useMemo(() => {
    return notificationsData?.pages.flatMap((page) => page) ?? []
  }, [notificationsData?.pages])

  return useMemo(
    () =>
      computeAdvisorAttention({
        lints,
        signalItems,
        notifications,
      }),
    [lints, signalItems, notifications]
  )
}
