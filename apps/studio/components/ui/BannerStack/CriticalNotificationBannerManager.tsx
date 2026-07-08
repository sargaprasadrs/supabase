import { useParams } from 'common'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef } from 'react'

import { BannerCriticalNotification } from './Banners/BannerCriticalNotification'
import { CRITICAL_NOTIFICATION_BANNER_PRIORITY, useBannerStack } from './BannerStackProvider'
import {
  addSessionDismissedCriticalNotificationId,
  getCriticalNotificationBannerId,
  getSessionDismissedCriticalNotificationIds,
  shouldSurfaceCriticalNotification,
} from './CriticalNotificationBannerManager.utils'
import { SIDEBAR_KEYS } from '@/components/layouts/ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import { useAdvisorAttention } from '@/components/ui/AdvisorPanel/useAdvisorAttention'
import { useNotificationsV2UpdateMutation } from '@/data/notifications/notifications-v2-update-mutation'
import { IS_PLATFORM } from '@/lib/constants'
import { useTrack } from '@/lib/telemetry/track'
import { advisorState } from '@/state/advisor-state'
import { useSidebarManagerSnapshot } from '@/state/sidebar-manager-state'

export const CriticalNotificationBannerManager = () => {
  const { ref: projectRef } = useParams()
  const router = useRouter()
  const track = useTrack()
  const { addBanner, dismissBanner } = useBannerStack()
  const { openSidebar } = useSidebarManagerSnapshot()
  const { mutate: updateNotifications } = useNotificationsV2UpdateMutation()
  const activeBannerIdsRef = useRef(new Set<string>())

  const { criticalNotifications } = useAdvisorAttention({ projectRef, enabled: IS_PLATFORM })

  const surfacedNotifications = useMemo(() => {
    const sessionDismissedIds = new Set(getSessionDismissedCriticalNotificationIds())

    return criticalNotifications
      .filter((notification) =>
        shouldSurfaceCriticalNotification(notification, {
          projectRef,
          pathname: router.pathname,
        })
      )
      .filter((notification) => !sessionDismissedIds.has(notification.id))
      .sort((a, b) => {
        const aTime = a.inserted_at ? new Date(a.inserted_at).getTime() : 0
        const bTime = b.inserted_at ? new Date(b.inserted_at).getTime() : 0
        return bTime - aTime
      })
  }, [criticalNotifications, projectRef, router.pathname])

  useEffect(() => {
    if (!IS_PLATFORM) return

    const activeBannerIds = new Set(
      surfacedNotifications.map((notification) => getCriticalNotificationBannerId(notification.id))
    )

    activeBannerIdsRef.current.forEach((bannerId) => {
      if (!activeBannerIds.has(bannerId)) {
        dismissBanner(bannerId)
      }
    })
    activeBannerIdsRef.current = activeBannerIds

    surfacedNotifications.forEach((notification) => {
      const bannerId = getCriticalNotificationBannerId(notification.id)

      addBanner({
        id: bannerId,
        isDismissed: false,
        priority: CRITICAL_NOTIFICATION_BANNER_PRIORITY,
        content: (
          <BannerCriticalNotification
            notification={notification}
            onArchive={() => {
              track('critical_notification_banner_archive_clicked', {
                notificationId: notification.id,
              })
              addSessionDismissedCriticalNotificationId(notification.id)
              dismissBanner(bannerId)
              updateNotifications({ ids: [notification.id], status: 'archived' })
            }}
            onViewDetails={() => {
              track('critical_notification_banner_cta_clicked', {
                notificationId: notification.id,
              })
              advisorState.focusItem({
                id: notification.id,
                tab: 'messages',
                source: 'notification',
              })
              openSidebar(SIDEBAR_KEYS.ADVISOR_PANEL)
              // Once the user is looking at the item in the panel, retire the loud
              // banner for the session (without archiving — the inbox entry stays).
              addSessionDismissedCriticalNotificationId(notification.id)
              dismissBanner(bannerId)
            }}
          />
        ),
      })
    })
  }, [surfacedNotifications, addBanner, dismissBanner, track, openSidebar, updateNotifications])

  return null
}
