import { ListFilter, X } from 'lucide-react'
import { useState } from 'react'
import { cn, Tabs, TabsList, TabsTrigger } from 'ui'

import { ButtonTooltip } from '@/components/ui/ButtonTooltip'
import { FilterPopover } from '@/components/ui/FilterPopover'
import { AdvisorSeverity, AdvisorTab } from '@/state/advisor-state'

const severityOptions = [
  { label: 'Critical', value: 'critical' },
  { label: 'Warning', value: 'warning' },
  { label: 'Info', value: 'info' },
]

const statusOptions = [
  { label: 'Unread', value: 'unread' },
  { label: 'Archived', value: 'archived' },
]

interface AdvisorFiltersProps {
  activeTab: AdvisorTab
  onTabChange: (tab: string) => void
  severityFilters: AdvisorSeverity[]
  onSeverityFiltersChange: (filters: AdvisorSeverity[]) => void
  statusFilters: string[]
  onStatusFiltersChange: (filters: string[]) => void
  onClose: () => void
  isPlatform?: boolean
}

export const AdvisorFilters = ({
  activeTab,
  onTabChange,
  severityFilters,
  onSeverityFiltersChange,
  statusFilters,
  onStatusFiltersChange,
  onClose,
  isPlatform = false,
}: AdvisorFiltersProps) => {
  const hasActiveFilters = severityFilters.length > 0 || statusFilters.length > 0
  const [showFilters, setShowFilters] = useState(hasActiveFilters)

  return (
    <div className="border-b">
      <div className="flex items-center justify-between gap-x-4 h-[calc(var(--header-height)-1px)] overflow-x-auto">
        <Tabs value={activeTab} onValueChange={onTabChange} className="h-full pl-4">
          <TabsList className="border-b-0 gap-4 h-full">
            <TabsTrigger value="all" className="h-full text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="security" className="h-full text-xs">
              Security
            </TabsTrigger>
            <TabsTrigger value="performance" className="h-full text-xs">
              Performance
            </TabsTrigger>
            {isPlatform && (
              <TabsTrigger value="messages" className="h-full text-xs flex items-center gap-2">
                Messages
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-x-2 pr-3">
          <div className="relative">
            <ButtonTooltip
              variant="text"
              className={cn('w-7 h-7 p-0', showFilters && 'text-foreground bg-surface-300')}
              icon={<ListFilter strokeWidth={1.5} />}
              onClick={() => setShowFilters((value) => !value)}
              aria-label="Toggle filters"
              tooltip={{ content: { side: 'bottom', text: 'Filter' } }}
            />
            {!showFilters && hasActiveFilters && (
              <span className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full bg-brand" />
            )}
          </div>
          <ButtonTooltip
            variant="text"
            className="w-7 h-7 p-0"
            icon={<X strokeWidth={1.5} />}
            onClick={onClose}
            tooltip={{ content: { side: 'bottom', text: 'Close Advisor Center' } }}
          />
        </div>
      </div>
      {showFilters && (
        <div className="flex items-center gap-2 border-t px-4 py-2">
          {isPlatform && (
            <FilterPopover
              name="Status"
              options={statusOptions}
              activeOptions={[...statusFilters]}
              valueKey="value"
              labelKey="label"
              isMinimized={true}
              onSaveFilters={onStatusFiltersChange}
            />
          )}
          <FilterPopover
            name="Severity"
            options={severityOptions}
            activeOptions={[...severityFilters]}
            valueKey="value"
            labelKey="label"
            isMinimized={true}
            onSaveFilters={(values) => onSeverityFiltersChange(values as AdvisorSeverity[])}
          />
        </div>
      )}
    </div>
  )
}
