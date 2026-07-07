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

describe('useAdvisorAttention.utils', () => {
  describe('computeAdvisorAttention', () => {
    it('marks critical notifications as critical issues', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [],
        notifications: [createNotification({})],
      })

      expect(result.hasCriticalIssues).toBe(true)
      expect(result.hasWarningIssues).toBe(false)
      expect(result.criticalNotifications).toHaveLength(1)
    })

    it('marks error lints as critical issues', () => {
      const result = computeAdvisorAttention({
        lints: [{ level: 'ERROR' } as any],
        signalItems: [],
        notifications: [],
      })

      expect(result.hasCriticalIssues).toBe(true)
      expect(result.criticalNotifications).toHaveLength(0)
    })

    it('shows warning issues from signals when there are no critical issues', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [
          {
            id: 'signal-1',
            dismissalKey: 'signal-1',
            source: 'signal',
            type: 'banned-ip',
            severity: 'warning',
            tab: 'security',
            title: 'Banned IP address',
            summary: 'Summary',
            description: 'Description',
            actions: [],
            sourceData: { type: 'banned-ip', ip: '203.0.113.10' },
          },
        ],
        notifications: [],
      })

      expect(result.hasCriticalIssues).toBe(false)
      expect(result.hasWarningIssues).toBe(true)
    })

    it('prioritises critical issues over warning signals', () => {
      const result = computeAdvisorAttention({
        lints: [],
        signalItems: [
          {
            id: 'signal-1',
            dismissalKey: 'signal-1',
            source: 'signal',
            type: 'banned-ip',
            severity: 'warning',
            tab: 'security',
            title: 'Banned IP address',
            summary: 'Summary',
            description: 'Description',
            actions: [],
            sourceData: { type: 'banned-ip', ip: '203.0.113.10' },
          },
        ],
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
  })

  describe('isCriticalUnreadNotification', () => {
    it('ignores non-critical or read notifications', () => {
      expect(isCriticalUnreadNotification(createNotification({ priority: 'Warning' }))).toBe(false)
      expect(isCriticalUnreadNotification(createNotification({ status: 'seen' }))).toBe(false)
      expect(isCriticalUnreadNotification(createNotification({}))).toBe(true)
    })
  })
})
