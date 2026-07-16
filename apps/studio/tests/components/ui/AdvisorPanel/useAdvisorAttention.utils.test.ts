import { describe, expect, it } from 'vitest'

import type { AdvisorSignalItem } from '@/components/ui/AdvisorPanel/AdvisorPanel.types'
import {
  computeAdvisorAttention,
  isCriticalUnreadNotification,
} from '@/components/ui/AdvisorPanel/useAdvisorAttention.utils'
import type { Notification } from '@/data/notifications/notifications-v2-query'

const notification = (overrides: Partial<Notification> = {}) =>
  ({ id: '1', status: 'new', priority: 'Critical', ...overrides }) as Notification

const signal = (severity: AdvisorSignalItem['severity']) => ({ severity }) as AdvisorSignalItem

describe('computeAdvisorAttention', () => {
  it('derives critical, warning, and unread attention', () => {
    expect(
      computeAdvisorAttention({
        lints: [],
        signalItems: [],
        notifications: [notification()],
      }).hasCriticalIssues
    ).toBe(true)

    expect(
      computeAdvisorAttention({
        lints: [],
        signalItems: [],
        notifications: [notification({ status: 'seen' })],
      }).hasCriticalIssues
    ).toBe(false)

    expect(
      computeAdvisorAttention({
        lints: [{ level: 'ERROR' } as any],
        signalItems: [],
      }).hasCriticalIssues
    ).toBe(true)

    expect(
      computeAdvisorAttention({
        lints: [{ level: 'WARN' } as any],
        signalItems: [],
      }).hasWarningIssues
    ).toBe(true)

    expect(
      computeAdvisorAttention({
        lints: [],
        signalItems: [signal('warning')],
      }).hasWarningIssues
    ).toBe(true)

    expect(
      computeAdvisorAttention({
        lints: [],
        signalItems: [signal('info')],
      }).hasWarningIssues
    ).toBe(false)

    expect(
      computeAdvisorAttention({
        lints: [],
        signalItems: [signal('warning')],
        notifications: [notification()],
      })
    ).toMatchObject({ hasCriticalIssues: true, hasWarningIssues: false })

    expect(
      computeAdvisorAttention({
        lints: [],
        signalItems: [],
        notifications: [notification({ priority: 'Info' })],
      }).hasUnreadNotifications
    ).toBe(true)

    // Summary wins over the list (covers all pages, not just the first).
    expect(
      computeAdvisorAttention({
        lints: [],
        signalItems: [],
        notifications: [notification({ status: 'seen' })],
        notificationSummary: { has_critical: true, has_warning: true, unread_count: 2 },
      })
    ).toMatchObject({
      hasCriticalIssues: true,
      hasWarningIssues: false,
      hasUnreadNotifications: true,
    })
  })
})

describe('isCriticalUnreadNotification', () => {
  it('requires Critical priority and new status', () => {
    expect(isCriticalUnreadNotification(notification({ priority: 'Warning' }))).toBe(false)
    expect(isCriticalUnreadNotification(notification({ status: 'seen' }))).toBe(false)
    expect(isCriticalUnreadNotification(notification())).toBe(true)
  })
})
