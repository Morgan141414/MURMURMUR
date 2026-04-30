import api from './client'

export interface Permission {
  codename: string
  name: string
  description?: string
  category?: string
}

export interface RolePermissions {
  role: string
  role_id?: string
  is_custom?: boolean
  permissions: string[]
}

export function listAllPermissions() {
  return api.get<{ permissions: string[] }>('/roles/permissions')
}

export function listPermissionsByCategory() {
  return api.get<{ categories: Record<string, Permission[]> }>('/roles/permissions/by-category')
}

export function getOrgRolePermissions(orgId: string) {
  return api.get<{ org_id: string; roles: Record<string, { role_id: string; is_custom: boolean; permissions: string[] }>; all_permissions: string[] }>(`/orgs/${orgId}/role-permissions`)
}

export function updateRolePermissions(orgId: string, role: string, permissions: string[]) {
  return api.put<{ role: string; permissions: string[] }>(`/orgs/${orgId}/role-permissions/${role}`, { permissions })
}

export function resetRolePermissions(orgId: string, role: string) {
  return api.post<{ role: string; permissions: string[] }>(`/orgs/${orgId}/role-permissions/${role}/reset`)
}

export function resetAllRolesPermissions(orgId: string) {
  return api.post<{ reset_roles: string[] }>(`/orgs/${orgId}/role-permissions/reset-all`)
}

// Org role CRUD
export function listOrgRoles(orgId: string) {
  return api.get<RolePermissions[]>(`/orgs/${orgId}/roles`)
}

export function createCustomRole(orgId: string, data: { name: string; permissions: string[] }) {
  return api.post(`/orgs/${orgId}/roles`, data)
}

export function updateRole(orgId: string, roleId: string, data: { name?: string; permissions?: string[] }) {
  return api.put(`/orgs/${orgId}/roles/${roleId}`, data)
}

export function deleteCustomRole(orgId: string, roleId: string) {
  return api.delete(`/orgs/${orgId}/roles/${roleId}`)
}

// Assign role to member
export function assignRoleToMember(orgId: string, userId: string, roleName: string) {
  return api.post(`/orgs/${orgId}/members/${userId}/role`, { role_name: roleName })
}
