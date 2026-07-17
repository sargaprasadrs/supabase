import { AlertTriangle, Archive, ArchiveRestore, ChevronRight, Inbox } from 'lucide-react'
import { Badge, Button, cn } from 'ui'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import type { AdvisorItem } from './AdvisorPanel.types'
import {
  formatItemDate,
  getAdvisorItemSecondaryText,
  getAdvisorPanelItemDisplayTitle,
  severityBadgeVariants,
  severityColorClasses,
  severityLabels,
  tabIconMap,
} from './AdvisorPanel.utils'
import { EmptyAdvisor } from './EmptyAdvisor'
import { ButtonTooltip } from '@/components/ui/ButtonTooltip'
import type { Notification } from '@/data/notifications/notifications-v2-query'
import type { AdvisorSeverity, AdvisorTab } from '@/state/advisor-state'

const NoProjectNotice = () => {
  return (
    <div className="absolute top-28 px-6 flex flex-col items-center justify-center w-full gap-y-2">
      <Inbox className="text-foreground-muted" strokeWidth={1} />
      <div className="text-center">
        <p className="heading-default">Project required</p>
        <p className="text-foreground-light text-sm">
          Select a project to view security and performance advisories
        </p>
      </div>
    </div>
  )
}

interface AdvisorPanelBodyProps {
  isLoading: boolean
  isError: boolean
  filteredItems: AdvisorItem[]
  activeTab: AdvisorTab
  severityFilters: AdvisorSeverity[]
  onItemClick: (item: AdvisorItem) => void
  onArchiveNotification?: (item: AdvisorItem) => void
  onClearFilters: () => void
  hiddenItemsCount: number
  hasAnyFilters: boolean
  hasProjectRef?: boolean
  projectNameByRef?: ReadonlyMap<string, string>
}

export const AdvisorPanelBody = ({
  isLoading,
  isError,
  filteredItems,
  activeTab,
  severityFilters,
  onItemClick,
  onArchiveNotification,
  onClearFilters,
  hiddenItemsCount,
  hasAnyFilters,
  hasProjectRef = true,
  projectNameByRef,
}: AdvisorPanelBodyProps) => {
  // Show notice if no project ref and trying to view project-specific tabs
  if (!hasProjectRef && activeTab !== 'messages' && activeTab !== 'all') {
    return <NoProjectNotice />
  }

  if (isLoading) {
    return (
      <div>
        <GenericSkeletonLoader className="w-full p-4" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="h-full mx-4 flex flex-col items-center justify-center gap-y-2">
        <AlertTriangle className="text-destructive" />
        <div className="flex flex-col items-center justify-center">
          <h4 className="text-base font-normal text-foreground-light">Error loading advisories</h4>
          <p className="text-sm text-foreground-lighter">Please try again later.</p>
        </div>
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return (
      <EmptyAdvisor
        activeTab={activeTab}
        hasFilters={hasAnyFilters}
        onClearFilters={onClearFilters}
      />
    )
  }

  return (
    <>
      <div className="flex flex-col">
        {filteredItems.map((item) => {
          const SeverityIcon = tabIconMap[item.tab as Exclude<AdvisorTab, 'all'>]
          const severityClass = severityColorClasses[item.severity]
          const isNotification = item.source === 'notification'
          const notification = isNotification ? (item.original as Notification) : null
          const isUnread = notification?.status === 'new'
          const isArchived = notification?.status === 'archived'
          const canArchive = isNotification && onArchiveNotification !== undefined
          const archiveLabel = !canArchive
            ? 'This issue cannot be archived and must be addressed'
            : isArchived
              ? 'Unarchive'
              : 'Archive'

          const primaryText = getAdvisorPanelItemDisplayTitle(item)
          const secondaryText = getAdvisorItemSecondaryText(item, projectNameByRef)
          const metadataText =
            secondaryText ?? (item.createdAt ? formatItemDate(item.createdAt) : undefined)
          // Date strings (e.g. "a few seconds ago") come from formatItemDate and
          // need sentence-case capitalisation; entity strings (lint / signal) don't.
          const metadataCapitalize = secondaryText === undefined && item.createdAt !== undefined

          return (
            <div key={`${item.source}-${item.id}`} className="group relative border-b">
              <Button
                variant="text"
                className={cn(
                  'justify-start w-full block rounded-none h-auto py-3 pl-4 pr-16 hover:text-foreground',
                  isUnread && 'bg-surface-100/50'
                )}
                onClick={() => onItemClick(item)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <SeverityIcon
                      size={16}
                      strokeWidth={1.5}
                      className={cn('shrink-0', severityClass)}
                    />
                    <div className="text-left flex flex-col gap-0.5 truncate flex-1 min-w-0">
                      <div className="truncate">{primaryText}</div>
                      {metadataText && (
                        <div className="flex items-center gap-1 text-xs text-foreground-light">
                          <span
                            className={cn('truncate', metadataCapitalize && 'capitalize-sentence')}
                          >
                            {metadataText}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.severity === 'critical' && (
                    <Badge variant={severityBadgeVariants[item.severity]} className="shrink-0">
                      {severityLabels[item.severity]}
                    </Badge>
                  )}
                </div>
              </Button>
              <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <ButtonTooltip
                  variant="text"
                  disabled={!canArchive}
                  aria-label={archiveLabel}
                  className={cn(
                    'pointer-events-auto h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                    !canArchive && 'group-hover:opacity-30 focus-visible:opacity-30'
                  )}
                  icon={
                    canArchive && isArchived ? (
                      <ArchiveRestore size={16} strokeWidth={1.5} />
                    ) : (
                      <Archive size={16} strokeWidth={1.5} />
                    )
                  }
                  onClick={canArchive ? () => onArchiveNotification?.(item) : undefined}
                  tooltip={{
                    content: {
                      side: 'bottom',
                      className: canArchive ? undefined : 'w-52 text-center',
                      text: archiveLabel,
                    },
                  }}
                />
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className="shrink-0 text-foreground-lighter"
                />
              </div>
            </div>
          )
        })}
      </div>
      {severityFilters.length > 0 && hiddenItemsCount > 0 && (
        <div className="px-4 py-3">
          <Button variant="text" className="w-full" onClick={onClearFilters}>
            Show {hiddenItemsCount} more issue{hiddenItemsCount !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </>
  )
}
