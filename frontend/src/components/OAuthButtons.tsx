import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { googleLogin, appleLogin } from '@/api/auth'
import { getMe } from '@/api/profile'
import { listMyOrgs } from '@/api/orgs'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
          }) => void
          prompt: () => void
        }
      }
    }
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string
          scope: string
          redirectURI: string
          usePopup: boolean
        }) => void
        signIn: () => Promise<{
          authorization: {
            id_token: string
          }
          user?: {
            name?: { firstName?: string; lastName?: string }
          }
        }>
      }
    }
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || ''

export function OAuthButtons({ remember = true }: { remember?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const setOrgs = useOrgStore((s) => s.setOrgs)

  const handleOAuthSuccess = useCallback(
    async (tokenData: { access_token: string; refresh_token: string | null }) => {
      const token = tokenData.access_token
      const refreshTkn = tokenData.refresh_token ?? null

      const storage = remember ? localStorage : sessionStorage
      storage.setItem(
        'auth-storage',
        JSON.stringify({ state: { token, refreshToken: refreshTkn }, version: 0 }),
      )

      const { data: user } = await getMe()
      setAuth(token, refreshTkn, user, remember ? 'local' : 'session')

      try {
        const { data: orgs } = await listMyOrgs()
        setOrgs(
          orgs.map((o) => ({
            orgId: o.id,
            orgName: o.name,
            role: o.role,
            logoUrl: o.logo_url ?? undefined,
            isActive: o.is_active ?? true,
            moderationStatus: o.moderation_status ?? 'pending',
            moderationComment: o.moderation_comment ?? null,
          })),
        )
      } catch {
        // not critical
      }

      navigate('/dashboard')
    },
    [remember, navigate, setAuth, setOrgs],
  )

  const handleGoogle = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error(t('auth.googleNotConfigured'))
      return
    }

    if (!window.google) {
      toast.error(t('auth.googleSdkNotLoaded'))
      return
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const { data } = await googleLogin(response.credential)
          await handleOAuthSuccess(data)
        } catch (err: unknown) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail
          toast.error(detail || t('auth.googleError'))
        }
      },
    })

    window.google.accounts.id.prompt()
  }, [t, handleOAuthSuccess])

  const handleApple = useCallback(async () => {
    if (!APPLE_CLIENT_ID) {
      toast.error(t('auth.appleNotConfigured'))
      return
    }

    if (!window.AppleID) {
      toast.error(t('auth.appleSdkNotLoaded'))
      return
    }

    try {
      window.AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: window.location.origin,
        usePopup: true,
      })

      const response = await window.AppleID.auth.signIn()
      const idToken = response.authorization.id_token
      const userName = response.user?.name
      const fullName = userName
        ? [userName.firstName, userName.lastName].filter(Boolean).join(' ')
        : undefined

      const { data } = await appleLogin(idToken, fullName)
      await handleOAuthSuccess(data)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail
      if (detail) {
        toast.error(detail)
      }
    }
  }, [t, handleOAuthSuccess])

  return (
    <div className="space-y-3 mt-5">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{t('auth.orContinueWith')}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleGoogle}
          className="flex-1 flex items-center justify-center gap-2.5 h-10 rounded-lg border border-border text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>

        <button
          type="button"
          onClick={handleApple}
          className="flex-1 flex items-center justify-center gap-2.5 h-10 rounded-lg border border-border text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Apple
        </button>
      </div>
    </div>
  )
}
