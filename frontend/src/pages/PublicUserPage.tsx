import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarClock,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Shield,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react'
import { getExploreUser } from '@/api/explore'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS, type ExploreUser } from '@/types'

function normalizeSkills(data: ExploreUser | undefined): string[] {
  const source = data?.skills
  if (!source) return []
  if (Array.isArray(source)) {
    return source.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof source === 'object') {
    const nested = (source as { skills?: unknown }).skills
    if (Array.isArray(nested)) {
      return nested.map((item) => String(item).trim()).filter(Boolean)
    }
    return []
  }
  return String(source)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatSalary(value: unknown, currency: string = 'KZT') {
  if (value == null || value === '') return 'Not specified'
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return String(value)
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(parsed) + ' ' + currency
}

function formatPresence(lastSeenAt?: string | null) {
  if (!lastSeenAt) return 'Offline'
  const seenAt = new Date(lastSeenAt)
  const diffMs = Date.now() - seenAt.getTime()
  if (diffMs <= 5 * 60 * 1000) return 'Online'
  return `Last seen: ${seenAt.toLocaleString()}`
}

export default function PublicUserPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId = '' } = useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['explore-user', userId],
    queryFn: () => getExploreUser(userId).then((res) => res.data),
    enabled: Boolean(userId),
  })

  const skills = useMemo(() => normalizeSkills(data), [data])
  const affiliations = data?.org_affiliations ?? []
  const primaryOrg = data?.primary_org ?? affiliations[0]

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={Mail}
        title={t('search.noResults', 'Nothing found')}
        description={t('search.tryDifferent', 'Try changing your query or filters')}
      />
    )
  }

  const fullName =
    [data.last_name, data.first_name, data.patronymic].filter(Boolean).join(' ') ||
    data.full_name ||
    data.email
  const initials = fullName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const salaryCurrency = data.desired_salary_currency || 'KZT'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={fullName}
        description={data.bio || 'User profile with professional portfolio and work context.'}
        eyebrow={t('search.users', 'Users')}
        badge={
          data.org_role ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
              <Shield className="h-3 w-3" />
              {ROLE_LABELS[data.org_role] || data.org_role}
            </span>
          ) : undefined
        }
        actions={
          data.is_self ? (
            <Button variant="outline" onClick={() => navigate('/profile/settings')} className="gap-2">
              <Pencil className="h-4 w-4" />
              Редактировать профиль
            </Button>
          ) : undefined
        }
      />

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex items-center gap-4 lg:w-[360px] lg:flex-col lg:items-start">
            {data.avatar_url ? (
              <img src={data.avatar_url} alt={fullName} className="h-24 w-24 rounded-2xl object-cover ring-1 ring-border" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-semibold text-primary ring-1 ring-border">
                {initials}
              </div>
            )}
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-foreground">{fullName}</h2>
              <p className="text-sm text-muted-foreground">{[data.position, data.specialty].filter(Boolean).join(' - ') || 'Title not specified'}</p>
              <p className="text-xs text-muted-foreground">{formatPresence(data.last_seen_at)}</p>
            </div>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Briefcase} title="Experience" value={data.experience_years != null ? `${data.experience_years} years` : 'Not specified'} />
            <StatCard icon={Sparkles} title="Skills" value={String(skills.length)} />
            <StatCard icon={Building2} title="Companies" value={String(affiliations.length || (primaryOrg ? 1 : 0))} />
            <StatCard icon={Wallet} title="Salary target" value={formatSalary(data.desired_salary, salaryCurrency)} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="space-y-6">
          <article className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">About</h3>
            <p className="mt-3 text-sm leading-6 text-foreground">{data.bio || 'This user has not added profile summary yet.'}</p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Skills</h3>
            {skills.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No skills added.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Portfolio</h3>
            {data.portfolio_url ? (
              <a
                href={data.portfolio_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Globe className="h-4 w-4" />
                {data.portfolio_url.replace(/^https?:\/\//, '')}
              </a>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Portfolio link is not specified.</p>
            )}
          </article>
        </section>

        <section className="space-y-6">
          <article className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Current company</h3>
            {primaryOrg ? (
              <button
                type="button"
                onClick={() => navigate(`/explore/companies/${primaryOrg.org_id}`)}
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent"
              >
                {primaryOrg.org_logo_url ? (
                  <img src={primaryOrg.org_logo_url} alt={primaryOrg.org_name} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{primaryOrg.org_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{primaryOrg.role}{primaryOrg.org_industry ? ` - ${primaryOrg.org_industry}` : ''}</p>
                </div>
              </button>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Company is not specified.</p>
            )}
          </article>

          {affiliations.length > 1 && (
            <article className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Company history</h3>
              <div className="mt-3 space-y-2">
                {affiliations.map((aff) => (
                  <button
                    key={`${aff.org_id}:${aff.role}`}
                    type="button"
                    onClick={() => navigate(`/explore/companies/${aff.org_id}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <span className="truncate text-sm text-foreground">{aff.org_name}</span>
                    <span className="ml-3 text-xs text-muted-foreground">{aff.role}</span>
                  </button>
                ))}
              </div>
            </article>
          )}

          <article className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Professional details</h3>
            <div className="mt-3 space-y-2 text-sm">
              <InfoRow icon={Mail} label="Contact email" value={data.email || 'Not specified'} />
              <InfoRow icon={BadgeCheck} label="Work email" value={data.work_email || 'Not specified'} />
              <InfoRow icon={MapPin} label="City" value={data.city || 'Not specified'} />
              <InfoRow icon={UserRound} label="Department" value={data.department || 'Not specified'} />
              <InfoRow icon={CalendarClock} label="Work format" value={data.work_format || 'Not specified'} />
              <InfoRow icon={Shield} label="Employee status" value={data.employee_status || 'Not specified'} />
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, title, value }: { icon: typeof Briefcase; title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-wide">{title}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </span>
      <span className="max-w-[60%] truncate text-right text-foreground">{value}</span>
    </div>
  )
}
