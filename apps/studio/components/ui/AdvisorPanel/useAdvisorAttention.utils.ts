import type { AdvisorSignalItem } from './AdvisorPanel.types'
import type { Lint } from '@/data/lint/lint-query'
import type { Notification } from '@/data/notifications/notifications-v2-query'

export function isCriticalUnreadNotification(notification: Notification) {
  return notification.status === 'new' && notification.priority === 'Critical'
}

export function computeAdvisorAttention({
  lints,
  signalItems,
  notifications,
}: {
  lints?: Lint[]
  signalItems: AdvisorSignalItem[]
  notifications: Notification[]
}) {
  const hasCriticalNotifications = notifications.some(
    (notification) => notification.priority === 'Critical'
  )
  const hasUnreadNotifications = notifications.some((notification) => notification.status === 'new')
  const hasSignals = signalItems.length > 0
  const hasCriticalSignals = signalItems.some((item) => item.severity === 'critical')
  const hasCriticalLint = Array.isArray(lints) && lints.some((lint) => lint.level === 'ERROR')

  const hasCriticalIssues = hasCriticalNotifications || hasCriticalSignals || hasCriticalLint
  const hasWarningIssues = hasSignals && !hasCriticalIssues

  const criticalNotifications = notifications.filter(isCriticalUnreadNotification)

  return {
    hasCriticalIssues,
    hasWarningIssues,
    hasUnreadNotifications,
    criticalNotifications,
  }
}
