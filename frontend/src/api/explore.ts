import api from './client'
import type { ExploreOrg, ExploreUser, Vacancy } from '@/types'

export function exploreOrgs() {
  return api.get<ExploreOrg[]>('/explore/orgs')
}

export function exploreUsers() {
  return api.get<ExploreUser[]>('/explore/users')
}

export function getExploreOrg(orgId: string) {
  return api.get<ExploreOrg>(`/explore/orgs/${orgId}`)
}

export function getExploreOrgVacancies(orgId: string) {
  return api.get<Vacancy[]>(`/explore/orgs/${orgId}/vacancies`)
}

export function exploreVacancies(params?: { q?: string; city?: string; employment_type?: string }) {
  return api.get<Vacancy[]>('/explore/vacancies', { params })
}

export function getExploreVacancy(vacancyId: string) {
  return api.get<Vacancy>(`/explore/vacancies/${vacancyId}`)
}

export function getExploreUser(userId: string) {
  return api.get<ExploreUser>(`/explore/users/${userId}`)
}
