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

vi.mock('@/state/sidebar-manager-state', () => ({
  useSidebarManagerSnapshot: () => ({
    toggleSidebar: mockToggleSidebar,
    activeSidebar: undefined,
  }),
}))

describe('AdvisorButton', () => {
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

  it('shows a warning dot when advisor signals are present', () => {
    mockUseAdvisorAttention.mockReturnValue({
      hasCriticalIssues: false,
      hasWarningIssues: true,
      hasUnreadNotifications: false,
      criticalNotifications: [],
    })

    const { container } = render(<AdvisorButton projectRef="project-ref" />)

    expect(container.querySelector('.bg-warning')).toBeInTheDocument()
    expect(container.querySelector('.bg-destructive')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-brand')).not.toBeInTheDocument()
  })

  it('keeps the destructive dot when a critical issue is present', () => {
    mockUseAdvisorAttention.mockReturnValue({
      hasCriticalIssues: true,
      hasWarningIssues: false,
      hasUnreadNotifications: false,
      criticalNotifications: [],
    })

    const { container } = render(<AdvisorButton projectRef="project-ref" />)

    expect(container.querySelector('.bg-destructive')).toBeInTheDocument()
    expect(container.querySelector('.bg-warning')).not.toBeInTheDocument()
    expect(container.querySelector('.text-destructive')).toBeInTheDocument()
  })

  it('falls back to the brand dot for unread notifications when there are no issues', () => {
    mockUseAdvisorAttention.mockReturnValue({
      hasCriticalIssues: false,
      hasWarningIssues: false,
      hasUnreadNotifications: true,
      criticalNotifications: [],
    })

    const { container } = render(<AdvisorButton projectRef="project-ref" />)

    expect(container.querySelector('.bg-brand')).toBeInTheDocument()
    expect(container.querySelector('.bg-warning')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-destructive')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
