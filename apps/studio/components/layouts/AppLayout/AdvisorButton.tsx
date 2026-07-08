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

  const handleClick = () => {
    track('header_advisor_button_clicked')
    toggleSidebar(SIDEBAR_KEYS.ADVISOR_PANEL)
  }

  return (
    <div className="relative inline-flex size-8 items-center justify-center">
      <ButtonTooltip
        variant="outline"
        size="tiny"
        id="advisor-center-trigger"
        className={cn(
          'rounded-full w-[32px] h-[32px] flex items-center justify-center p-0 group',
          hasCriticalIssues &&
            !isOpen &&
            'bg-destructive-200 border-destructive-500 hover:border-destructive-600',
          hasCriticalIssues &&
            isOpen &&
            'bg-destructive-300 border-destructive-500 hover:border-destructive-600',
          !hasCriticalIssues && isOpen && 'bg-foreground text-background'
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
            hasCriticalIssues && 'text-destructive group-hover:text-destructive',
            !hasCriticalIssues && !isOpen && 'text-foreground-light group-hover:text-foreground',
            !hasCriticalIssues && isOpen && 'text-background group-hover:text-background'
          )}
        />
        <span className="sr-only">Advisor Center</span>
      </ButtonTooltip>
      {hasCriticalIssues ? (
        <span className="pointer-events-none absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
      ) : hasWarningIssues ? (
        <span className="pointer-events-none absolute top-1 right-1 w-2 h-2 rounded-full bg-warning" />
      ) : hasUnreadNotifications ? (
        <span className="pointer-events-none absolute top-1 right-1 w-2 h-2 rounded-full bg-brand" />
      ) : null}
    </div>
  )
}
