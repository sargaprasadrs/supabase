import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdvisorButton } from '@/components/layouts/AppLayout/AdvisorButton'
import { render } from '@/tests/helpers'

const { mockUseAdvisorAttention, mockToggleSidebar } = vi.hoisted(() => ({
  mockUseAdvisorAttention: vi.fn(),
  mockToggleSidebar: vi.fn(),
}))

vi.mock('@/components/ui/AdvisorPanel/useAdvisorAttention', () => ({
  useAdvisorAttention: mockUseAdvisorAttention,
}))

vi.mock('@/lib/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/constants')>()),
  IS_PLATFORM: false,
}))

vi.mock('@/state/sidebar-manager-state', () => ({
  useSidebarManagerSnapshot: () => ({
    toggleSidebar: mockToggleSidebar,
    activeSidebar: undefined,
  }),
}))

describe('AdvisorButton on self-hosted', () => {
  beforeEach(() => {
    mockUseAdvisorAttention.mockReturnValue({
      hasCriticalIssues: false,
      hasWarningIssues: false,
      hasUnreadNotifications: false,
      criticalNotifications: [],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders without platform notification state', () => {
    render(<AdvisorButton projectRef="project-ref" />)

    expect(mockUseAdvisorAttention).toHaveBeenCalledWith({ projectRef: 'project-ref' })
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
