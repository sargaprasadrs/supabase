import type { AdvisorSignalItem } from './AdvisorPanel.types'
import type { Lint } from '@/data/lint/lint-query'
import type { Notification } from '@/data/notifications/notifications-v2-query'

export type NotificationAttentionSummary = {
  has_critical: boolean
  has_warning: boolean
  unread_count: number
}

export function isCriticalUnreadNotification(notification: Notification) {
  return notification.status === 'new' && notification.priority === 'Critical'
}

export function computeAdvisorAttention({
  lints,
  signalItems,
  notifications = [],
  notificationSummary,
}: {
  lints?: Lint[]
  signalItems: AdvisorSignalItem[]
  notifications?: Notification[]
  notificationSummary?: NotificationAttentionSummary
}) {
  // Prefer the platform summary when available — it covers all notifications,
  // not just the first page of the list query. Fall back to the list for tests
  // and for callers that only have notification rows.
  const hasCriticalNotifications = notificationSummary
    ? notificationSummary.has_critical
    : notifications.some(isCriticalUnreadNotification)
  const hasWarningNotifications = notificationSummary ? notificationSummary.has_warning : false
  const hasUnreadNotifications = notificationSummary
    ? notificationSummary.unread_count > 0
    : notifications.some((notification) => notification.status === 'new')

  const hasCriticalSignals = signalItems.some((item) => item.severity === 'critical')
  const hasWarningSignals = signalItems.some((item) => item.severity === 'warning')
  const hasCriticalLint = Array.isArray(lints) && lints.some((lint) => lint.level === 'ERROR')
  const hasWarningLint = Array.isArray(lints) && lints.some((lint) => lint.level === 'WARN')

  const hasCriticalIssues = hasCriticalNotifications || hasCriticalSignals || hasCriticalLint
  const hasWarningIssues =
    (hasWarningNotifications || hasWarningSignals || hasWarningLint) && !hasCriticalIssues

  return {
    hasCriticalIssues,
    hasWarningIssues,
    hasUnreadNotifications,
  }
}
