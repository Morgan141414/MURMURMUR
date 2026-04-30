import api from './client'

interface TokenResponse {
  access_token: string
  refresh_token: string | null
  token_type: string
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return {
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' ') || parts[0] || '',
  }
}

export function register(iin: string, password: string, full_name: string, email?: string) {
  const name = splitFullName(full_name)
  return api.post('/auth/register', {
    iin,
    password,
    first_name: name.first_name,
    last_name: name.last_name,
    email: email || undefined,
  })
}

export function login(iin: string, password: string) {
  return api.post<TokenResponse>('/auth/login', { iin, password })
}

export function refreshToken(_refresh_token: string) {
  return Promise.reject(new Error('Refresh token is not available in the MVP1 backend yet'))
}

export function logout(_refresh_token: string) {
  return api.post('/auth/logout')
}

export function googleLogin(idToken: string) {
  return api.post<TokenResponse>('/auth/google', { id_token: idToken })
}

export function appleLogin(idToken: string, fullName?: string) {
  return api.post<TokenResponse>('/auth/apple', { id_token: idToken, full_name: fullName })
}

export function forgotPassword(email: string) {
  return api.post('/auth/forgot-password', { email })
}

export function resetPassword(token: string, new_password: string) {
  return api.post('/auth/reset-password', { token, new_password })
}

export function confirmAction(password: string, action: string = 'generic', payload?: Record<string, unknown>) {
  return api.post('/auth/confirm-action', { password, action, payload })
}

export function changePassword(current_password: string, new_password: string) {
  return api.post('/auth/change-password', { current_password, new_password })
}
