import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PauseProjectButton from './PauseProjectButton'

const {
  mockUseAsyncCheckPermissions,
  mockUseCheckEntitlements,
  mockUseProjectPauseMutation,
  mockUseSelectedOrganizationQuery,
  mockUseSelectedProjectQuery,
  mockUseSetProjectStatus,
  mockPauseProject,
} = vi.hoisted(() => ({
  mockUseAsyncCheckPermissions: vi.fn(),
  mockUseCheckEntitlements: vi.fn(),
  mockUseProjectPauseMutation: vi.fn(),
  mockUseSelectedOrganizationQuery: vi.fn(),
  mockUseSelectedProjectQuery: vi.fn(),
  mockUseSetProjectStatus: vi.fn(),
  mockPauseProject: vi.fn(),
}))

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('ui', () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/ButtonTooltip', () => ({
  ButtonTooltip: ({
    children,
    onClick,
    disabled,
    tooltip,
  }: {
    children: ReactNode
    onClick?: () => void
    disabled?: boolean
    tooltip: { content: { text?: string } }
  }) => (
    <button disabled={disabled} onClick={onClick} title={tooltip.content.text}>
      {children}
    </button>
  ),
}))

vi.mock('@/data/projects/project-detail-query', () => ({
  useSetProjectStatus: mockUseSetProjectStatus,
}))

vi.mock('@/data/projects/project-pause-mutation', () => ({
  useProjectPauseMutation: mockUseProjectPauseMutation,
}))

vi.mock('@/hooks/misc/useCheckEntitlements', () => ({
  useCheckEntitlements: mockUseCheckEntitlements,
}))

vi.mock('@/hooks/misc/useCheckPermissions', () => ({
  useAsyncCheckPermissions: mockUseAsyncCheckPermissions,
}))

vi.mock('@/hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: mockUseSelectedOrganizationQuery,
}))

vi.mock('@/hooks/misc/useSelectedProject', () => ({
  useSelectedProjectQuery: mockUseSelectedProjectQuery,
  useIsProjectActive: () => true,
}))

describe('PauseProjectButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseSetProjectStatus.mockReturnValue({ setProjectStatus: vi.fn() })
    mockUseProjectPauseMutation.mockReturnValue({ mutate: mockPauseProject, isPending: false })
    mockUseAsyncCheckPermissions.mockReturnValue({ can: true })
    mockUseSelectedOrganizationQuery.mockReturnValue({ data: { plan: { id: 'pro' }, slug: 'org' } })
    mockUseCheckEntitlements.mockReturnValue({ hasAccess: true })
  })

  it('disables pausing and explains why for branch projects', () => {
    mockUseSelectedProjectQuery.mockReturnValue({
      data: {
        ref: 'branch-project',
        parent_project_ref: 'main-project',
        status: 'ACTIVE_HEALTHY',
      },
    })

    render(<PauseProjectButton />)

    const button = screen.getAllByRole('button', { name: 'Pause project' })[0]
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Branch projects cannot be paused')

    fireEvent.click(button)
    expect(mockPauseProject).not.toHaveBeenCalled()
  })

  it('allows pausing a regular active project', () => {
    mockUseSelectedProjectQuery.mockReturnValue({
      data: {
        ref: 'main-project',
        parent_project_ref: undefined,
        status: 'ACTIVE_HEALTHY',
      },
    })

    render(<PauseProjectButton />)

    const button = screen.getAllByRole('button', { name: 'Pause project' })[0]
    expect(button).not.toBeDisabled()
  })
})
