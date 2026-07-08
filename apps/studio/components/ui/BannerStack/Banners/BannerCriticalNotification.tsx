import { AlertTriangle } from 'lucide-react'
import { Badge, Button } from 'ui'

import { BannerCard } from '../BannerCard'
import type { Notification, NotificationData } from '@/data/notifications/notifications-v2-query'

interface BannerCriticalNotificationProps {
  notification: Notification
  onArchive: () => void
  onViewDetails: () => void
}

export const BannerCriticalNotification = ({
  notification,
  onArchive,
  onViewDetails,
}: BannerCriticalNotificationProps) => {
  const data = notification.data as NotificationData
  const title = data.title || 'Critical notification'
  const message = data.message?.replace(/[#*_`[\]]/g, '').trim()

  return (
    <BannerCard variant="critical" onDismiss={onArchive}>
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2 items-start">
          <div className="p-2 rounded-lg bg-destructive-200 text-destructive">
            <AlertTriangle size={16} />
          </div>
        </div>
        <div className="flex flex-col gap-y-1 mb-2">
          <Badge variant="destructive" className="w-min uppercase">
            Critical
          </Badge>
          <p className="text-sm font-medium pr-6">{title}</p>
          {message ? (
            <p className="text-xs text-foreground-lighter text-balance line-clamp-3">{message}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="default" size="tiny" onClick={onViewDetails}>
            View details
          </Button>
        </div>
      </div>
    </BannerCard>
  )
}
