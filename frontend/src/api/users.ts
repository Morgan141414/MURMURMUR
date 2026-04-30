import api from './client'
import type { OrgRole, User } from '../types'

export function listUsers(orgId: string) {
  return api.get<User[]>(`/orgs/${orgId}/users`)
}

export function updateUserRole(orgId: string, userId: string, role: OrgRole) {
  return api.patch<User>(`/orgs/${orgId}/users/${userId}/role`, { role })
}

export function updateUserHRProfile(orgId: string, userId: string, body: Record<string, unknown>) {
  return api.patch<User>(`/orgs/${orgId}/users/${userId}/hr-profile`, body)
}

export function removeOrgUser(orgId: string, userId: string) {
  return api.delete(`/orgs/${orgId}/users/${userId}`)
}

export function updateUserHrProfile(orgId: string, userId: string, body: Record<string, unknown>) {
  return api.patch<User>(`/orgs/${orgId}/users/${userId}/hr-profile`, body)
}


export async function getNotificationPreferences() {
  return api.get<{ email_notifications_enabled: boolean }>('/users/me/notification-preferences')
}

export async function updateNotificationPreferences(emailEnabled: boolean) {
  return api.patch<{ email_notifications_enabled: boolean }>('/users/me/notification-preferences', null, {
    params: { email_enabled: emailEnabled },
  })
}
