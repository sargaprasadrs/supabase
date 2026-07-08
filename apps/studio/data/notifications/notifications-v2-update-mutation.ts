import { InfiniteData, QueryKey, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { notificationKeys } from './keys'
import type { Notification, NotificationsData } from './notifications-v2-query'
import { handleError, patch } from '@/data/fetchers'
import type { ResponseError, UseCustomMutationOptions } from '@/types'

export type NotificationsUpdateVariables = {
  ids: string[]
  status: 'new' | 'seen' | 'archived'
}

export async function updateNotifications({ ids, status }: NotificationsUpdateVariables) {
  const { data, error } = await patch('/platform/notifications', {
    body: ids.map((id) => {
      return { id, status }
    }),
    headers: { Version: '2' },
  })
  if (error) handleError(error)
  return data
}

type NotificationsUpdateData = Awaited<ReturnType<typeof updateNotifications>>
type NotificationsUpdateContext = { previous: [QueryKey, unknown][] }

const getListStatus = (key: QueryKey) => {
  const options = Array.isArray(key) ? (key[1] as { status?: string } | undefined) : undefined
  return options?.status
}

export const useNotificationsV2UpdateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseCustomMutationOptions<NotificationsUpdateData, ResponseError, NotificationsUpdateVariables>,
  'mutationFn' | 'onMutate'
> = {}) => {
  const queryClient = useQueryClient()
  return useMutation<
    NotificationsUpdateData,
    ResponseError,
    NotificationsUpdateVariables,
    NotificationsUpdateContext
  >({
    mutationFn: (vars) => updateNotifications(vars),
    async onMutate({ ids, status }): Promise<NotificationsUpdateContext> {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() })

      const previous = queryClient.getQueriesData({ queryKey: notificationKeys.list() })
      const idSet = new Set(ids)

      previous.forEach(([key, data]) => {
        if (data == null || typeof data !== 'object' || !('pages' in data)) return

        const listStatus = getListStatus(key)
        const allowedStatuses = listStatus ? [listStatus] : ['new', 'seen']
        const infiniteData = data as InfiniteData<NotificationsData>

        queryClient.setQueryData<InfiniteData<NotificationsData>>(key, {
          ...infiniteData,
          pages: infiniteData.pages.map((page) =>
            (page ?? [])
              .map((notification: Notification) =>
                idSet.has(notification.id) ? { ...notification, status } : notification
              )
              .filter((notification: Notification) => allowedStatuses.includes(notification.status))
          ),
        })
      })

      return { previous }
    },
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.list() })
      await onSuccess?.(data, variables, context)
    },
    async onError(error, variables, context) {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      if (onError === undefined) {
        toast.error(`Failed to update notifications: ${error.message}`)
      } else {
        onError(error, variables, context)
      }
    },
    ...options,
  })
}
