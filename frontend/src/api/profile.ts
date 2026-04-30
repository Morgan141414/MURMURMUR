import api from './client'
import type { User } from '../types'

export function getMe() {
  return api.get('/auth/me').then(({ data }) => ({
    data: {
      id: String(data.id),
      email: data.person?.email ?? '',
      full_name: [data.person?.first_name, data.person?.last_name].filter(Boolean).join(' '),
      first_name: data.person?.first_name ?? '',
      last_name: data.person?.last_name ?? '',
      patronymic: data.person?.middle_name ?? '',
      phone: data.person?.phone ?? '',
      iin: data.person?.iin ?? '',
      bio: '',
      specialty: '',
      city: '',
      education: '',
      portfolio_url: '',
      experience_years: 0,
      skills: [],
      is_looking_for_job: false,
      desired_salary: 0,
      desired_salary_currency: 'KZT',
      is_private_profile: false,
      position: '',
      avatar_url: '',
      linkedin_url: '',
      github_url: '',
      telegram_username: '',
      instagram_username: '',
      is_superadmin: Boolean(data.is_superuser),
    } satisfies User,
  }))
}

export function updateMe(data: Partial<Omit<User, 'id' | 'email'>>) {
  return api.patch<User>('/users/me', data)
}

export function uploadAvatar(file: File) {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ avatar_url: string }>('/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
