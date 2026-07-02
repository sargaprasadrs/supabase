import { Check, Loader2, X } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from 'ui'

import type { CopyStatus } from './warehouseDemoStore'

const COPY_STATUS_LABELS: Record<CopyStatus, string> = {
  backfilling: 'Backfilling',
  live: 'Live',
  error: 'Error',
}

const COPY_STATUS_TOOLTIPS: Record<CopyStatus, string> = {
  backfilling:
    'Initial Warehouse copy in progress. Postgres remains the source of truth for writes.',
  live: 'Warehouse copy is caught up with the project replication stream.',
  error: 'Warehouse copy failed to sync. Check replication logs for details.',
}

type CopyStatusTone = 'positive' | 'destructive' | 'neutral'

const statusSegmentClassName =
  'inline-flex items-center justify-center rounded-md text-center font-mono uppercase whitespace-nowrap font-medium tracking-[0.06em] text-[11px] leading-[1.1] px-[5.5px] py-[3px] transition-all border'

const toneClassNames: Record<CopyStatusTone, string> = {
  positive: 'bg-brand bg-opacity-10 text-brand-600 border-brand-500',
  destructive: 'bg-destructive bg-opacity-10 text-destructive-600 border-destructive-500',
  neutral: 'bg-surface-75 text-foreground-light border-strong',
}

const COPY_STATUS_CONFIG: Record<
  CopyStatus,
  { tone: CopyStatusTone; icon: ComponentType<{ className?: string }> | 'spinner' }
> = {
  backfilling: { tone: 'neutral', icon: 'spinner' },
  live: { tone: 'positive', icon: Check },
  error: { tone: 'destructive', icon: X },
}

export function getCopyStatusTooltip(copyStatus: CopyStatus): string {
  return COPY_STATUS_TOOLTIPS[copyStatus]
}

interface WarehouseCopyStatusProps {
  copyStatus: CopyStatus
  className?: string
}

/**
 * Segmented copy-status indicator (icon + label). Matches StatusBadge from #44211;
 * uses a spinner while backfilling. Swap to StatusBadge when that PR merges.
 */
export function WarehouseCopyStatus({ copyStatus, className }: WarehouseCopyStatusProps) {
  const { tone, icon: IconOrSpinner } = COPY_STATUS_CONFIG[copyStatus]
  const toneClassName = toneClassNames[tone]
  const label = COPY_STATUS_LABELS[copyStatus]

  return (
    <div
      className={cn('inline-flex items-center whitespace-nowrap', className)}
      data-copy-status={copyStatus}
      aria-label={`Warehouse copy status: ${label}`}
    >
      <span
        aria-hidden="true"
        className={cn(statusSegmentClassName, toneClassName, 'rounded-r-none border-r-0')}
      >
        {IconOrSpinner === 'spinner' ? (
          <Loader2 className="size-3 shrink-0 animate-spin" />
        ) : (
          <IconOrSpinner className="size-3 shrink-0" />
        )}
      </span>
      <span className={cn(statusSegmentClassName, toneClassName, 'rounded-l-none')}>{label}</span>
    </div>
  )
}

/** @deprecated Use WarehouseCopyStatus */
export const WarehouseSyncChip = WarehouseCopyStatus
