import { describe, expect, it } from 'vitest'

import {
  computeAdvisorAttention,
  isCriticalUnreadNotification,
} from '@/components/ui/AdvisorPanel/useAdvisorAttention.utils'
import type { Notification } from '@/data/notifications/notifications-v2-query'

const createNotification = (
  overrides: Partial<Notification> & { data?: Record<string, unknown> }
): Notification =>
  ({
    id: 'notification-1',
    status: 'new',
    priority: 'Critical',
    inserted_at: '2026-06-10T10:00:00Z',
    data: {
      title: 'Capacity unavailable',
      message: 'Unable to resize due to capacity.',
      actions: [],
    },
    ...overrides,
  }) as Notification

const warningSignal = {
  id: 'signal-1',
  dismissalKey: 'signal-1',
  source: 'signal' as const,
  type: 'banned-ip' as const,
  severity: 'warning' as const,
  tab: 'security' as const,
  title: 'Banned IP address',
  summary: 'Summary',
  description: 'Description',
  actions: [],
  sourceData: { type: 'banned-ip' as const, ip: '203.0.113.10' },
}

describe('useAdvisorAttention.utils', () => {
  describe('computeAdvisorAttention', () => {
    it('marks unread critical notifications as critical issues', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [],
        notifications: [createNotification({})],
      })

      expect(result.hasCriticalIssues).toBe(true)
      expect(result.hasWarningIssues).toBe(false)
    })

    it('does not treat seen critical notifications as critical issues', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [],
        notifications: [createNotification({ status: 'seen' })],
      })

      expect(result.hasCriticalIssues).toBe(false)
      expect(result.hasUnreadNotifications).toBe(false)
    })

    it('marks error lints as critical issues', () => {
      const result = computeAdvisorAttention({
        lints: [{ level: 'ERROR' } as any],
        signalItems: [],
        notifications: [],
      })

      expect(result.hasCriticalIssues).toBe(true)
    })

    it('shows warning issues from warning-severity signals when there are no critical issues', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [warningSignal],
        notifications: [],
      })

      expect(result.hasCriticalIssues).toBe(false)
      expect(result.hasWarningIssues).toBe(true)
    })

    it('does not treat non-warning signals as warning issues', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [{ ...warningSignal, severity: 'info' as any }],
        notifications: [],
      })

      expect(result.hasWarningIssues).toBe(false)
    })

    it('shows warning issues from WARN lints when there are no critical issues', () => {
      const result = computeAdvisorAttention({
        lints: [{ level: 'WARN' } as any],
        signalItems: [],
        notifications: [],
      })

      expect(result.hasCriticalIssues).toBe(false)
      expect(result.hasWarningIssues).toBe(true)
    })

    it('prioritises critical issues over warning signals', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [warningSignal],
        notifications: [createNotification({})],
      })

      expect(result.hasCriticalIssues).toBe(true)
      expect(result.hasWarningIssues).toBe(false)
    })

    it('reports unread notifications without critical issues', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [],
        notifications: [createNotification({ priority: 'Info' })],
      })

      expect(result.hasUnreadNotifications).toBe(true)
      expect(result.hasCriticalIssues).toBe(false)
    })

    it('uses the notification summary when provided', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [],
        // Seen critical in the list would not count, but the summary says critical.
        notifications: [createNotification({ status: 'seen' })],
        notificationSummary: {
          has_critical: true,
          has_warning: false,
          unread_count: 0,
        },
      })

      expect(result.hasCriticalIssues).toBe(true)
      expect(result.hasUnreadNotifications).toBe(false)
    })

    it('uses summary warning and unread flags', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [],
        notificationSummary: {
          has_critical: false,
          has_warning: true,
          unread_count: 3,
        },
      })

      expect(result.hasCriticalIssues).toBe(false)
      expect(result.hasWarningIssues).toBe(true)
      expect(result.hasUnreadNotifications).toBe(true)
    })
  })

  describe('isCriticalUnreadNotification', () => {
    it('ignores non-critical or read notifications', () => {
      expect(isCriticalUnreadNotification(createNotification({ priority: 'Warning' }))).toBe(false)
      expect(isCriticalUnreadNotification(createNotification({ status: 'seen' }))).toBe(false)
      expect(isCriticalUnreadNotification(createNotification({}))).toBe(true)
    })
  })
})
