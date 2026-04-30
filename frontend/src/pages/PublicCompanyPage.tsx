import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowRight, Briefcase, Building2, Globe, Loader2, Lock, MapPin, Send, Shield, Users } from 'lucide-react'
import { getExploreOrg, getExploreOrgVacancies } from '@/api/explore'
import { joinOrg } from '@/api/orgs'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS } from '@/types'
import { useOrgStore } from '@/stores/orgStore'

export default function PublicCompanyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { orgId = '' } = useParams()
  const orgs = useOrgStore((s) => s.orgs)
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg)
  const [requestRole, setRequestRole] = useState('member')
  const [requestReason, setRequestReason] = useState('')
  const [requestComment, setRequestComment] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [requestSubmitted, setRequestSubmitted] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['explore-org', orgId],
    queryFn: () => getExploreOrg(orgId).then((res) => res.data),
    enabled: Boolean(orgId),
  })
  const { data: vacancies = [] } = useQuery({
    queryKey: ['explore-org-vacancies', orgId],
    queryFn: () => getExploreOrgVacancies(orgId).then((res) => res.data),
    enabled: Boolean(orgId),
  })

  const membership = useMemo(
    () => orgs.find((org) => org.orgId === orgId) ?? null,
    [orgId, orgs],
  )

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
        icon={Building2}
        title={t('search.noResults', 'Ничего не найдено')}
        description={t('search.tryDifferent', 'Попробуйте изменить запрос или фильтры')}
      />
    )
  }

  const orgData = data
  const initials = orgData.name.charAt(0).toUpperCase()

  async function handleSubmitJoinRequest() {
    if (!orgData.join_code) {
      toast.error('Для этой компании не настроен код вступления')
      return
    }
    setSubmittingRequest(true)
    try {
      const composedComment = [
        requestRole && `Желаемая роль: ${requestRole}`,
        requestReason && `Причина вступления: ${requestReason.trim()}`,
        requestComment && `Комментарий: ${requestComment.trim()}`,
      ].filter(Boolean).join('\n')
      await joinOrg(orgData.join_code, composedComment || undefined)
      setRequestSubmitted(true)
      toast.success('Заявка отправлена на модерацию компании')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось отправить заявку')
    } finally {
      setSubmittingRequest(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={orgData.name}
        description={
          orgData.is_member
            ? 'Открыта ваша рабочая компания. Переходите во внутреннее пространство только когда это действительно нужно.'
            : 'Публичный профиль компании. Внутренние отделы, проекты и команды скрыты до вступления.'
        }
        eyebrow={t('search.companies', 'Компании')}
        badge={
          orgData.viewer_role ? (
            <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
              {ROLE_LABELS[orgData.viewer_role]}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
              <Lock className="h-3 w-3" />
              Только публичный просмотр
            </span>
          )
        }
      />

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {orgData.logo_url ? (
            <img src={orgData.logo_url} alt={orgData.name} className="h-24 w-24 rounded-3xl object-cover ring-1 ring-border" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-3xl font-semibold text-primary ring-1 ring-border">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">{orgData.name}</h2>
              {orgData.description && (
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{orgData.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {orgData.industry && (
                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
                  <Building2 className="h-4 w-4" />
                  {orgData.industry}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
                <Users className="h-4 w-4" />
                {t('search.members', 'до {{count}} участников', { count: orgData.max_members ?? orgData.member_count })}
              </span>
              {orgData.website && (
                <a
                  href={orgData.website.startsWith('http') ? orgData.website : `https://${orgData.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-foreground transition-colors hover:bg-accent"
                >
                  <Globe className="h-4 w-4" />
                  {orgData.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {orgData.is_member ? 'Внутренний доступ доступен по вашему членству' : 'Внутренние данные компании скрыты'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {!orgData.is_member
                      ? 'Отделы, проекты, команды, кнопки редактирования и управленческие действия недоступны, пока вы не состоите в этой компании.'
                      : 'Вы можете перейти в рабочее пространство своей компании из переключателя контекста.'}
                  </p>
                </div>
              </div>
            </div>

            {membership && (
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    setActiveOrg(membership.orgId)
                    navigate('/company')
                  }}
                  className="gap-2"
                >
                  Открыть рабочее пространство
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {!orgData.is_member && !membership && (
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="max-w-3xl space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Запрос на вступление в компанию</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Доступ к внутренним данным и действиям открывается только после одобрения заявки компанией.
              </p>
            </div>

            {requestSubmitted ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
                <p className="text-sm font-medium text-foreground">Application pending</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ваша заявка отправлена. Модератор компании проверит запрос и вы получите уведомление после решения.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="text-muted-foreground">Желаемая роль</span>
                    <select value={requestRole} onChange={(e) => setRequestRole(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3">
                      <option value="member">member</option>
                      <option value="developer">developer</option>
                      <option value="team_lead">team_lead</option>
                      <option value="project_manager">project_manager</option>
                      <option value="hr">hr</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-muted-foreground">Причина вступления</span>
                    <input
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Например: участвую в проекте отдела маркетинга"
                      className="h-10 w-full rounded-lg border border-border bg-card px-3"
                    />
                  </label>
                </div>
                <label className="mt-4 block space-y-2 text-sm">
                  <span className="text-muted-foreground">Комментарий</span>
                  <textarea
                    value={requestComment}
                    onChange={(e) => setRequestComment(e.target.value)}
                    rows={4}
                    placeholder="Коротко поясните контекст, подразделение, руководителя и цель доступа."
                    className="w-full rounded-lg border border-border bg-card px-3 py-2"
                  />
                </label>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => { setRequestRole('member'); setRequestReason(''); setRequestComment('') }}>
                    Очистить
                  </Button>
                  <Button onClick={() => void handleSubmitJoinRequest()} disabled={submittingRequest}>
                    {submittingRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit request
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Your request will be reviewed by the company moderator.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Открытые вакансии</h2>
            <p className="text-sm text-muted-foreground">Публичные роли компании для найма и откликов.</p>
          </div>
          <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
            {vacancies.length} вакансий
          </span>
        </div>

        {vacancies.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Нет опубликованных вакансий"
            description="Когда компания откроет публичные роли, они появятся здесь."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {vacancies.map((vacancy) => (
              <button
                key={vacancy.id}
                onClick={() => {
                  if (membership) setActiveOrg(membership.orgId)
                  navigate(`/vacancies/${vacancy.id}?orgId=${orgId}`)
                }}
                className="rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:bg-accent"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{vacancy.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{vacancy.description || 'Описание появится после открытия карточки вакансии.'}</p>
                  </div>
                  <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{vacancy.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {vacancy.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {vacancy.city}
                    </span>
                  ) : null}
                  {vacancy.salary_from || vacancy.salary_to ? (
                    <span>
                      {(vacancy.salary_from ?? 0).toLocaleString()}
                      {vacancy.salary_to ? ` - ${vacancy.salary_to.toLocaleString()}` : '+'}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
