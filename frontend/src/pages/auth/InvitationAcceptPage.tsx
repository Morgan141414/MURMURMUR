import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowRight, Building2, CheckCircle2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { acceptInvitation, getInvitation } from '@/api/orgs'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'

export default function InvitationAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const addOrg = useOrgStore((s) => s.addOrg)
  const [loading, setLoading] = useState(false)
  const [loadingInvitation, setLoadingInvitation] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof getInvitation>>['data'] | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Invitation token is missing.')
      setLoadingInvitation(false)
      return
    }
    setLoadingInvitation(true)
    getInvitation(token)
      .then((response) => setInvitation(response.data))
      .catch(() => setError('Failed to load invitation. The link may have expired.'))
      .finally(() => setLoadingInvitation(false))
  }, [token])

  async function handleAccept() {
    if (!token) return
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await acceptInvitation(token)
      const org = response.data
      addOrg({
        orgId: org.id,
        orgName: org.name,
        role: org.role,
        logoUrl: org.logo_url ?? undefined,
        isActive: org.is_active ?? true,
        moderationStatus: org.moderation_status ?? 'approved',
        moderationComment: org.moderation_comment ?? null,
      })
      setAccepted(true)
      toast.success('Приглашение принято')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation. The link may have expired.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(320px,0.9fr)_minmax(420px,0.7fr)]">
      <section className="hidden border-r border-border bg-card lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Invitation</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">ProjectsControl workspace</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Безопасное приглашение в организацию. После принятия вы попадёте в корпоративный workspace с ролью и доступами, которые назначил администратор.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="text-sm font-medium text-foreground">What happens next</p>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Вас добавят в организацию и откроют доступ к назначенным shell-модулям.</span>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Контекст компании, роль и доступы будут применены автоматически после входа.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>

          {loadingInvitation ? (
            <div className="mt-5">
              <h2 className="text-2xl font-semibold text-foreground">Loading invitation</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Проверяем ссылку приглашения и срок её действия.
              </p>
            </div>
          ) : accepted ? (
          
            <div className="mt-5">
              <h2 className="text-2xl font-semibold text-foreground">Invitation accepted</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You have successfully joined the organization and can continue to your dashboard.
              </p>
              <Link
                to="/dashboard"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-5">
              <h2 className="text-2xl font-semibold text-foreground">Organization invitation</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {invitation
                  ? `Вы приглашены в компанию с ролью "${invitation.role}". Ссылка действует до ${new Date(invitation.expires_at).toLocaleString('ru-RU')}.`
                  : 'You have been invited to join an organization on ProjectsControl.'}
              </p>

              {error ? (
                <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <button
                onClick={handleAccept}
                disabled={loading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Accepting...' : isAuthenticated ? 'Accept Invitation' : 'Login to Accept'}
                {!loading ? <ArrowRight className="h-4 w-4" /> : null}
              </button>

              <p className="mt-4 text-sm text-muted-foreground">
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Back to login
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
