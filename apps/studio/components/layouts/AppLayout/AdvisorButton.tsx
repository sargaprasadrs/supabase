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
    <div className="relative">
      <ButtonTooltip
        variant="outline"
        size="tiny"
        id="advisor-center-trigger"
        className={cn(
          'rounded-full w-[32px] h-[32px] flex items-center justify-center p-0 group',
          hasCriticalIssues && 'bg-destructive-200 border-destructive-500',
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
            hasCriticalIssues && !isOpen && 'text-destructive group-hover:text-destructive',
            !hasCriticalIssues && 'text-foreground-light group-hover:text-foreground',
            isOpen && 'text-background group-hover:text-background'
          )}
        />
        <span className="sr-only">Advisor Center</span>
      </ButtonTooltip>
      {hasCriticalIssues ? (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
      ) : hasWarningIssues ? (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-warning" />
      ) : hasUnreadNotifications ? (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand" />
      ) : null}
    </div>
  )
}
