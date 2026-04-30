import api from './client'
import type { NotificationFeedItem, NotificationHook } from '../types'

export function listNotificationHooks(orgId: string) {
  return api.get<NotificationHook[]>(`/orgs/${orgId}/notifications`)
}

export function createNotificationHook(
  orgId: string,
  data: { event_type: string; url: string },
) {
  return api.post<NotificationHook>(`/orgs/${orgId}/notifications`, data)
}

export function updateNotificationHook(
  orgId: string,
  hookId: string,
  data: Partial<{ event_type: string; url: string }>,
) {
  return api.patch<NotificationHook>(`/orgs/${orgId}/notifications/${hookId}`, data)
}

export function deleteNotificationHook(orgId: string, hookId: string) {
  return api.delete(`/orgs/${orgId}/notifications/${hookId}`)
}

export function getNotificationFeed(limit = 20) {
  return api.get<{ items: NotificationFeedItem[]; unread_count: number }>('/notifications/feed', { params: { limit } })
}

export function markNotificationRead(notificationId: string) {
  return api.post(`/notifications/${notificationId}/read`)
}

export function markAllNotificationsRead() {
  return api.post('/notifications/read-all')
}

export function markMessengerNotificationsRead() {
  return api.post<{ success: boolean; count: number }>('/notifications/messenger/read-all')
}
