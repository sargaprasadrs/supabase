import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAdvisorAttention } from '@/components/ui/AdvisorPanel/useAdvisorAttention'

const { mockUseProjectLintsQuery, mockUseNotificationsV2Query, mockUseAdvisorSignals } = vi.hoisted(
  () => ({
    mockUseProjectLintsQuery: vi.fn(),
    mockUseNotificationsV2Query: vi.fn(),
    mockUseAdvisorSignals: vi.fn(),
  })
)

vi.mock('@/data/lint/lint-query', () => ({
  useProjectLintsQuery: mockUseProjectLintsQuery,
}))

vi.mock('@/data/notifications/notifications-v2-query', () => ({
  useNotificationsV2Query: mockUseNotificationsV2Query,
}))

vi.mock('@/components/ui/AdvisorPanel/useAdvisorSignals', () => ({
  useAdvisorSignals: mockUseAdvisorSignals,
}))

vi.mock('@/lib/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/constants')>()),
  IS_PLATFORM: false,
}))

describe('useAdvisorAttention on self-hosted', () => {
  beforeEach(() => {
    mockUseProjectLintsQuery.mockReturnValue({ data: [], isPending: false, isError: false })
    mockUseNotificationsV2Query.mockReturnValue({
      data: { pages: [[]] },
      isPending: false,
      isError: false,
    })
    mockUseAdvisorSignals.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      dismissSignal: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('disables the notifications query so no request is made to the platform endpoint', () => {
    renderHook(() => useAdvisorAttention({ projectRef: 'project-ref' }))

    expect(mockUseNotificationsV2Query).toHaveBeenCalledWith(
      { filters: {}, limit: 20 },
      { enabled: false }
    )
  })
})
