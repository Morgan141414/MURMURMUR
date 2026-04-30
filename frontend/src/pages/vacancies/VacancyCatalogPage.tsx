import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowRight, Briefcase, Building2, CheckCircle2, Clock3, DollarSign, Loader2, MapPin, Plus, Search, ShieldCheck, Sparkles, Users2 } from 'lucide-react'
import { exploreVacancies } from '@/api/explore'
import { useCreateVacancy, useUpdateVacancy, useUpdateVacancyBudgetApproval, useVacancies, useVacancyAnalytics, useVacancyApprovalQueue } from '@/hooks/useVacancies'
import { useOrgStore } from '@/stores/orgStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { queryKeys } from '@/lib/queryKeys'
import type { Vacancy } from '@/types'

const inputClass = 'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none'

function formatMoney(vacancy: Vacancy) {
  if (vacancy.salary_from && vacancy.salary_to) return `${vacancy.salary_from.toLocaleString()} - ${vacancy.salary_to.toLocaleString()}`
  if (vacancy.salary_from) return `от ${vacancy.salary_from.toLocaleString()}`
  if (vacancy.salary_to) return `до ${vacancy.salary_to.toLocaleString()}`
  return 'По договоренности'
}

function collectHighlights(vacancies: Vacancy[]) {
  const skillCounts = new Map<string, number>()
  const cityCounts = new Map<string, number>()
  for (const vacancy of vacancies) {
    for (const skill of vacancy.skills.slice(0, 5)) {
      skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1)
    }
    if (vacancy.city) cityCounts.set(vacancy.city, (cityCounts.get(vacancy.city) || 0) + 1)
  }
  return {
    topSkills: [...skillCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill]) => skill),
    topCities: [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city]) => city),
  }
}

export default function VacancyCatalogPage() {
  const { t } = useTranslation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const role = useOrgStore((s) => s.activeOrgRole())
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [title, setTitle] = useState('')
  const [city, setCity] = useState('')
  const [skills, setSkills] = useState('')
  const [newVacancyStatus, setNewVacancyStatus] = useState('draft')

  const { data: orgVacancies = [], isLoading: orgLoading } = useVacancies(orgId, statusFilter === 'all' ? undefined : statusFilter)
  const { data: approvalQueue = [] } = useVacancyApprovalQueue(orgId)
  const { data: analytics } = useVacancyAnalytics(orgId)
  const { data: publicVacancies = [], isLoading: publicLoading } = useQuery({
    queryKey: queryKeys.explore.vacancies({ q: search, city: cityFilter, employment_type: employmentTypeFilter }),
    queryFn: () => exploreVacancies({
      q: search.trim() || undefined,
      city: cityFilter.trim() || undefined,
      employment_type: employmentTypeFilter || undefined,
    }).then((r) => r.data),
    enabled: !orgId,
  })

  const createVacancy = useCreateVacancy(orgId ?? '')
  const updateVacancy = useUpdateVacancy(orgId ?? '')
  const updateBudgetApproval = useUpdateVacancyBudgetApproval(orgId ?? '')

  const vacancies = orgId ? orgVacancies : publicVacancies
  const loading = orgId ? orgLoading : publicLoading
  const canManageVacancies = ['hr', 'ceo', 'founder', 'superadmin', 'recruiter', 'hiring_manager'].includes(role ?? '')
  const canPublishVacancies = ['hr', 'ceo', 'founder', 'superadmin'].includes(role ?? '')
  const canApproveBudget = ['accountant', 'ceo', 'founder', 'superadmin'].includes(role ?? '')

  const filtered = useMemo(() => {
    return vacancies.filter((vacancy) => {
      const q = search.trim().toLowerCase()
      const matchesQuery = !q || vacancy.title.toLowerCase().includes(q) || vacancy.description?.toLowerCase().includes(q) || vacancy.city?.toLowerCase().includes(q) || vacancy.skills.some((skill) => skill.toLowerCase().includes(q))
      const matchesCity = !cityFilter.trim() || vacancy.city?.toLowerCase().includes(cityFilter.trim().toLowerCase())
      const matchesEmployment = !employmentTypeFilter || vacancy.employment_type === employmentTypeFilter
      return matchesQuery && matchesCity && matchesEmployment
    })
  }, [cityFilter, employmentTypeFilter, search, vacancies])

  const highlights = useMemo(() => collectHighlights(vacancies), [vacancies])

  function handlePublicSearch() {
    if (loading) {
      toast.info('Поиск обновляется...')
      return
    }
    const resultLabel = filtered.length === 1 ? 'вакансия' : filtered.length >= 2 && filtered.length <= 4 ? 'вакансии' : 'вакансий'
    toast.success(`Найдено ${filtered.length} ${resultLabel}`)
  }

  async function handleCreateVacancy() {
    if (!title.trim()) return toast.error('Укажите название вакансии')
    try {
      await createVacancy.mutateAsync({
        title: title.trim(),
        city: city || undefined,
        skills: skills.split(',').map((item) => item.trim()).filter(Boolean),
        status: newVacancyStatus,
      })
      setTitle('')
      setCity('')
      setSkills('')
      setNewVacancyStatus('draft')
      toast.success(canPublishVacancies && newVacancyStatus === 'published' ? 'Вакансия опубликована' : 'Вакансия сохранена в hiring workflow')
    } catch {
      toast.error('Не удалось создать вакансию')
    }
  }

  async function handleBudgetDecision(vacancyId: string, budgetStatus: 'approved' | 'rejected') {
    try {
      await updateBudgetApproval.mutateAsync({ vacancyId, body: { budget_status: budgetStatus } })
      toast.success(budgetStatus === 'approved' ? t('vacancies.budgetApproved') : t('vacancies.budgetRejected'))
    } catch {
      toast.error(t('vacancies.budgetUpdateError'))
    }
  }

  async function handlePublishDecision(vacancyId: string, status: 'approved' | 'published') {
    try {
      await updateVacancy.mutateAsync({ vacancyId, body: { status } })
      toast.success(status === 'published' ? t('vacancies.vacancyPublished') : t('vacancies.vacancyApproved'))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('vacancies.approvalUpdateError')
      toast.error(message)
    }
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={orgId ? t('vacancies.title') : 'Найти работу'}
        description={
          orgId
            ? 'Recruiting cockpit компании: intake, budget gate, approval board, публикация и воронка кандидатов.'
            : 'Витрина вакансий в стиле job marketplace: быстрый поиск, фильтры и плотная выдача по открытым ролям.'
        }
      />

      {!orgId ? (
        <section className="overflow-hidden rounded-[28px] border border-border bg-card">
          <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_32%),linear-gradient(135deg,#ffffff_0%,#f5f7fb_100%)] px-6 py-7 md:grid-cols-[1.3fr_0.7fr] md:px-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                HH-grade поиск вакансий
              </div>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Работайте с выдачей вакансий как в сильном job marketplace
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Ищите по названию, навыкам, городу и формату занятости. Выдача собрана как плотный job board, а не как набор случайных карточек.
                </p>
              </div>
              <div className="grid gap-3 rounded-2xl border border-border bg-background/90 p-3 md:grid-cols-[minmax(0,1.4fr)_0.8fr_0.8fr_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-border bg-background py-2.5 pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" placeholder="Должность, стек, компания" />
                </div>
                <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={inputClass} placeholder="Город" />
                <select value={employmentTypeFilter} onChange={(e) => setEmploymentTypeFilter(e.target.value)} className={inputClass}>
                  <option value="">Любая занятость</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
                <Button type="button" className="h-auto rounded-xl px-5" onClick={handlePublicSearch}>Искать</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {highlights.topSkills.map((skill) => (
                  <button key={skill} onClick={() => setSearch(skill)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                    {skill}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              <MarketStat icon={Briefcase} label="Открытые роли" value={String(vacancies.length)} />
              <MarketStat icon={MapPin} label="Топ города" value={highlights.topCities[0] || 'Almaty'} />
              <MarketStat icon={Users2} label="Популярный формат" value={employmentTypeFilter || 'Full-time'} />
            </div>
          </div>
        </section>
      ) : analytics ? (
        <section className="grid gap-4 md:grid-cols-4">
          <MarketStat icon={Briefcase} label="Открытые роли" value={String(analytics.total_vacancies)} sublabel={`${analytics.published_vacancies} published`} />
          <MarketStat icon={ShieldCheck} label="Approval Queue" value={String(analytics.approval_queue)} sublabel={`${analytics.budget_pending} ждут budget gate`} />
          <MarketStat icon={Users2} label="Кандидаты" value={String(analytics.total_applications)} sublabel={`${analytics.hired_candidates} hired`} />
          <MarketStat icon={CheckCircle2} label="Офферы" value={String(analytics.offers_sent)} sublabel="Hiring velocity" />
        </section>
      ) : null}

      {orgId && approvalQueue.length > 0 && (canApproveBudget || canPublishVacancies) ? (
        <section className="rounded-[28px] border border-border bg-card p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Approval Board</h2>
              <p className="text-sm text-muted-foreground">Очередь позиций, которые проходят финансовый и публикационный контроль.</p>
            </div>
            <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              {approvalQueue.length} позиций в работе
            </div>
          </div>
          <div className="space-y-3">
            {approvalQueue.map((vacancy) => (
              <div key={vacancy.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{vacancy.title}</p>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">{vacancy.status}</span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">approval {vacancy.approval_status}</span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">budget {vacancy.budget_status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{vacancy.city || 'Remote / гибко'} · {formatMoney(vacancy)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canApproveBudget && vacancy.budget_status !== 'approved' ? (
                      <Button size="sm" variant="outline" onClick={() => void handleBudgetDecision(vacancy.id, 'approved')}>Budget approve</Button>
                    ) : null}
                    {canApproveBudget && vacancy.budget_status !== 'rejected' ? (
                      <Button size="sm" variant="destructive" onClick={() => void handleBudgetDecision(vacancy.id, 'rejected')}>Budget reject</Button>
                    ) : null}
                    {canPublishVacancies && vacancy.budget_status === 'approved' && vacancy.status === 'in_review' ? (
                      <Button size="sm" variant="outline" onClick={() => void handlePublishDecision(vacancy.id, 'approved')}>Approve</Button>
                    ) : null}
                    {canPublishVacancies && vacancy.budget_status === 'approved' && vacancy.status !== 'published' ? (
                      <Button size="sm" onClick={() => void handlePublishDecision(vacancy.id, 'published')}>Publish</Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {orgId && canManageVacancies ? (
        <section className="rounded-[28px] border border-border bg-card p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">New Vacancy Intake</h2>
              <p className="text-sm text-muted-foreground">
                {canPublishVacancies
                  ? 'Создавайте позицию, отправляйте на review и публикуйте после approval.'
                  : 'Вы создаёте intake и отдаёте позицию в approval board. Публикацию выполняет HR или CEO.'}
              </p>
            </div>
            <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              workflow-first hiring
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr_1fr_0.9fr_auto]">
            <FormField label="Название вакансии" required>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Senior Backend Engineer" />
            </FormField>
            <FormField label="Город">
              <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="Almaty" />
            </FormField>
            <FormField label="Навыки">
              <input value={skills} onChange={(e) => setSkills(e.target.value)} className={inputClass} placeholder="Python, FastAPI, PostgreSQL" />
            </FormField>
            <FormField label="Статус запуска">
              <select value={newVacancyStatus} onChange={(e) => setNewVacancyStatus(e.target.value)} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="in_review">Send for review</option>
                {canPublishVacancies ? <option value="approved">Approved</option> : null}
                {canPublishVacancies ? <option value="published">Published</option> : null}
              </select>
            </FormField>
            <div className="flex items-end">
              <Button onClick={() => void handleCreateVacancy()} disabled={createVacancy.isPending} className="w-full lg:w-auto">
                <Plus className="h-4 w-4" />
                {canPublishVacancies && newVacancyStatus === 'published' ? 'Publish' : 'Save'}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className={`grid gap-6 ${orgId ? 'xl:grid-cols-[280px_minmax(0,1fr)]' : 'xl:grid-cols-[280px_minmax(0,1fr)]'}`}>
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-[24px] border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">Фильтры</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Поиск</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-border bg-background py-2.5 pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" placeholder="Должность или стек" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Город</label>
                <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={inputClass} placeholder="Almaty" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Занятость</label>
                <select value={employmentTypeFilter} onChange={(e) => setEmploymentTypeFilter(e.target.value)} className={inputClass}>
                  <option value="">Любая</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
              {orgId ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Workflow</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="in_review">In review</option>
                    <option value="approved">Approved</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              ) : null}
            </div>
          </div>

          {!orgId && highlights.topCities.length > 0 ? (
            <div className="rounded-[24px] border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Горячие направления</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {highlights.topCities.map((item) => (
                  <button key={item} onClick={() => setCityFilter(item)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{orgId ? 'Все вакансии компании' : 'Результаты поиска'}</h2>
              <p className="text-sm text-muted-foreground">{filtered.length} позиций найдено</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {highlights.topSkills.slice(0, 4).map((skill) => (
                <button key={skill} onClick={() => setSearch(skill)} className="rounded-full bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/12">
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[28px] border border-border bg-card p-12 text-center">
              <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground">{t('vacancies.noVacancies')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('vacancies.noVacanciesDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((vacancy) => (
                <Link
                  key={vacancy.id}
                  to={orgId ? `/vacancies/${vacancy.id}` : `/vacancies/${vacancy.id}?orgId=${vacancy.org_id}`}
                  className="group block rounded-[28px] border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-[0_16px_50px_-28px_rgba(15,23,42,0.45)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-foreground transition-colors group-hover:text-primary">{vacancy.title}</h3>
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">{vacancy.status}</span>
                        {orgId ? (
                          <>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">approval {vacancy.approval_status}</span>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${vacancy.budget_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              budget {vacancy.budget_status}
                            </span>
                          </>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" />{formatMoney(vacancy)}</span>
                        {vacancy.city ? <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{vacancy.city}</span> : null}
                        {vacancy.employment_type ? <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{vacancy.employment_type}</span> : null}
                      </div>
                      {vacancy.description ? (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {vacancy.description}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {vacancy.skills.slice(0, 6).map((skill) => (
                          <span key={skill} className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Открыть карточку</p>
                        <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                          Смотреть вакансию
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function MarketStat({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: typeof Briefcase
  label: string
  value: string
  sublabel?: string
}) {
  return (
    <div className="rounded-[24px] border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </div>
      {sublabel ? <p className="mt-3 text-sm text-muted-foreground">{sublabel}</p> : null}
    </div>
  )
}
