import { Lightbulb } from 'lucide-react'
import { cn } from 'ui'

import { SIDEBAR_KEYS } from '@/components/layouts/ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import { useAdvisorAttention } from '@/components/ui/AdvisorPanel/useAdvisorAttention'
import { ButtonTooltip } from '@/components/ui/ButtonTooltip'
import { useTrack } from '@/lib/telemetry/track'
import { useSidebarManagerSnapshot } from '@/state/sidebar-manager-state'

export const AdvisorButton = ({ projectRef }: { projectRef?: string }) => {
  const { toggleSidebar, activeSidebar } = useSidebarManagerSnapshot()
  const track = useTrack()
  const { hasCriticalIssues, hasWarningIssues, hasUnreadNotifications } = useAdvisorAttention({
    projectRef,
  })

  const isOpen = activeSidebar?.id === SIDEBAR_KEYS.ADVISOR_PANEL

  const statusLabel = hasCriticalIssues
    ? 'Critical advisor issues'
    : hasWarningIssues
      ? 'Advisor warnings'
      : hasUnreadNotifications
        ? 'Unread advisor notifications'
        : undefined

  const accessibleLabel = statusLabel ? `Advisor Center, ${statusLabel}` : 'Advisor Center'

  const handleClick = () => {
    track('header_advisor_button_clicked')
    toggleSidebar(SIDEBAR_KEYS.ADVISOR_PANEL)
  }

  return (
    <div className="relative">
      <ButtonTooltip
        variant="outline"
        size="tiny"
        id="advisor-center-trigger"
        aria-label={accessibleLabel}
        className={cn(
          'rounded-full w-[32px] h-[32px] flex items-center justify-center p-0 group',
          // Critical fill/border only when idle — selected matches the other
          // header circles (foreground fill, no destructive outline).
          hasCriticalIssues && !isOpen && 'bg-destructive-200 border-destructive-500',
          isOpen && 'bg-foreground text-background'
        )}
        onClick={handleClick}
        tooltip={{
          content: {
            text: 'Advisor Center',
          },
        }}
      >
        <Lightbulb
          size={16}
          strokeWidth={1.5}
          className={cn(
            'text-foreground-light group-hover:text-foreground',
            isOpen && 'text-background group-hover:text-background'
          )}
        />
      </ButtonTooltip>
      {hasCriticalIssues ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full',
            // Slightly lighter on the inverted selected fill in light mode only.
            isOpen ? 'bg-destructive-500 dark:bg-destructive' : 'bg-destructive'
          )}
        />
      ) : hasWarningIssues ? (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-warning"
        />
      ) : hasUnreadNotifications ? (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand"
        />
      ) : null}
    </div>
  )
}
