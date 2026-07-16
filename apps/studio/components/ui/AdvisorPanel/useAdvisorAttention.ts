import { useMemo } from 'react'

import { computeAdvisorAttention } from './useAdvisorAttention.utils'
import { useAdvisorSignals } from './useAdvisorSignals'
import { useProjectLintsQuery } from '@/data/lint/lint-query'
import { useNotificationsSummaryQuery } from '@/data/notifications/notifications-v2-summary-query'
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

  const { data: notificationSummary } = useNotificationsSummaryQuery({
    enabled: enabled && IS_PLATFORM,
  })

  return useMemo(
    () =>
      computeAdvisorAttention({
        lints,
        signalItems: signalItems ?? [],
        notificationSummary,
      }),
    [lints, signalItems, notificationSummary]
  )
}
