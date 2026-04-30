import api from './client'

export function setup2FA() {
  return api.post<{ secret: string; qr_uri: string }>('/auth/2fa/setup')
}

export function verify2FA(code: string) {
  return api.post<{ success: boolean }>('/auth/2fa/verify', { code })
}

export function disable2FA(code: string) {
  return api.post<{ success: boolean }>('/auth/2fa/disable', { code })
}
