import { create } from 'zustand'
import api from '@/api/client'

export interface JoinRequestNotification {
  id: string
  type: 'join_request_incoming' | 'join_request_result'
  title: string
  message: string
  read: boolean
  createdAt: string
  orgId?: string
  userId?: string
}

interface NotificationState {
  notifications: JoinRequestNotification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: (orgId: string) => Promise<void>
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  addNotification: (n: JoinRequestNotification) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (orgId: string) => {
    set({ loading: true })
    try {
      // Fetch incoming join requests (for managers)
      const [incomingRes, myRes] = await Promise.allSettled([
        api.get(`/orgs/${orgId}/join-requests`),
        api.get(`/orgs/${orgId}/my-join-requests`),
      ])

      const notifications: JoinRequestNotification[] = []

      if (incomingRes.status === 'fulfilled' && Array.isArray(incomingRes.value.data)) {
        for (const req of incomingRes.value.data) {
          if (req.status === 'pending') {
            notifications.push({
              id: `incoming-${req.id}`,
              type: 'join_request_incoming',
              title: '\u041d\u043e\u0432\u0430\u044f \u0437\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 \u0432\u0441\u0442\u0443\u043f\u043b\u0435\u043d\u0438\u0435',
              message: `${req.user_name || req.user_email || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c'} \u0445\u043e\u0447\u0435\u0442 \u0432\u0441\u0442\u0443\u043f\u0438\u0442\u044c \u0432 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044e`,
              read: false,
              createdAt: req.created_at || new Date().toISOString(),
              orgId,
              userId: req.user_id,
            })
          }
        }
      }

      if (myRes.status === 'fulfilled' && Array.isArray(myRes.value.data)) {
        for (const req of myRes.value.data) {
          if (req.status === 'approved' || req.status === 'rejected') {
            notifications.push({
              id: `result-${req.id}`,
              type: 'join_request_result',
              title: req.status === 'approved'
                ? '\u0417\u0430\u044f\u0432\u043a\u0430 \u043e\u0434\u043e\u0431\u0440\u0435\u043d\u0430'
                : '\u0417\u0430\u044f\u0432\u043a\u0430 \u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0430',
              message: req.status === 'approved'
                ? '\u0412\u0430\u0448\u0430 \u0437\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 \u0432\u0441\u0442\u0443\u043f\u043b\u0435\u043d\u0438\u0435 \u0431\u044b\u043b\u0430 \u043e\u0434\u043e\u0431\u0440\u0435\u043d\u0430'
                : '\u0412\u0430\u0448\u0430 \u0437\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 \u0432\u0441\u0442\u0443\u043f\u043b\u0435\u043d\u0438\u0435 \u0431\u044b\u043b\u0430 \u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0430',
              read: false,
              createdAt: req.updated_at || req.created_at || new Date().toISOString(),
              orgId: req.org_id,
            })
          }
        }
      }

      const unreadCount = notifications.filter((n) => !n.read).length
      set({ notifications, unreadCount, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  markAsRead: (id: string) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      )
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
    })
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  addNotification: (n: JoinRequestNotification) => {
    set((state) => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + (n.read ? 0 : 1),
    }))
  },
}))
