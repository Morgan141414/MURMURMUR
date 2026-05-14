import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Search, Users, Building2, MapPin, Briefcase, Star, ArrowRight, Globe, Loader2, Send, CalendarDays, FileText, HeartPulse } from 'lucide-react'
import { exploreOrgs, exploreUsers, exploreVacancies } from '@/api/explore'
import { joinOrg } from '@/api/orgs'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { AvatarImage } from '@/components/shared/AvatarImage'
import type { ExploreOrg, User, Vacancy } from '@/types'

type TabFilter = 'all' | 'patients' | 'appointments' | 'documents' | 'users' | 'companies' | 'vacancies'

const clinicalSearchSeed = {
  patients: [
    {
      id: 'p-1042',
      name: 'Айгерим Нурланова',
      meta: 'ИИН 890512450012 · +7 701 245 18 90 · терапевт · сегодня 10:30',
      alert: 'Анализы готовы, давление под контролем',
      to: '/clinic/patients/p-1042',
    },
    {
      id: 'p-1188',
      name: 'Марат Сейдахмет',
      meta: 'ИИН 760301300442 · +7 775 010 44 20 · кардиология',
      alert: 'Аллергия на лидокаин, долг 18 000 ₸',
      to: '/clinic/patients/p-1188',
    },
    {
      id: 'p-1220',
      name: 'Динара Касымова',
      meta: 'ИИН 920812600333 · +7 700 888 55 11 · новый пациент',
      alert: 'Нужна первичная карта и пакет документов',
      to: '/clinic/patients/p-1220',
    },
  ],
  appointments: [
    {
      id: 'apt-1030',
      title: '10:30 · Повторный прием',
      meta: 'Айгерим Нурланова · терапевт · кабинет 201',
      status: 'На приеме',
      to: '/clinic/calendar',
    },
    {
      id: 'apt-1100',
      title: '11:00 · Кардиология',
      meta: 'Марат Сейдахмет · кабинет 304 · требуется подтверждение',
      status: 'Запланирована',
      to: '/clinic/appointments',
    },
  ],
  documents: [
    {
      id: 'doc-template-therapy',
      title: 'Первичный прием терапевта',
      meta: 'Шаблон · 12 переменных · пациент/врач/прием',
      status: 'Готов к выпуску',
      to: '/clinic/documents',
    },
    {
      id: 'doc-result-ekg',
      title: 'ЭКГ и результаты анализов',
      meta: 'Айгерим Нурланова · прикреплено к карте пациента',
      status: 'Сформирован',
      to: '/clinic/patients/p-1042',
    },
  ],
}

function normalizeSkills(skills: User['skills']) {
  if (!skills) return []
  return Array.isArray(skills)
    ? skills
    : String(skills)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
}

function getPresence(user: User): { status: 'online' | 'offline'; label: string } {
  if (!user.last_seen_at) return { status: 'offline', label: 'Оффлайн' }
  const seenAt = new Date(user.last_seen_at)
  const diffMs = Date.now() - seenAt.getTime()
  if (diffMs <= 5 * 60 * 1000) return { status: 'online', label: 'Онлайн' }
  return { status: 'offline', label: `Был(а): ${seenAt.toLocaleString()}` }
}

export default function SearchExplorePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [companies, setCompanies] = useState<ExploreOrg[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningOrgId, setJoiningOrgId] = useState<string | null>(null)

  // Load ALL companies and ALL users on mount
  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)

      const [orgsRes, usersRes, vacanciesRes] = await Promise.allSettled([
        exploreOrgs(),
        exploreUsers(),
        exploreVacancies(),
      ])

      if (!cancelled) {
        setCompanies(orgsRes.status === 'fulfilled' ? orgsRes.value.data : [])
        setUsers(usersRes.status === 'fulfilled' ? usersRes.value.data : [])
        setVacancies(vacanciesRes.status === 'fulfilled' ? vacanciesRes.value.data : [])
        setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  // Filter results based on query
  const filteredCompanies = useMemo(() => {
    if (!query.trim()) return companies
    const q = query.toLowerCase()
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    )
  }, [companies, query])

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users
    const q = query.toLowerCase()
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.position?.toLowerCase().includes(q) ||
        u.specialty?.toLowerCase().includes(q) ||
        u.city?.toLowerCase().includes(q) ||
        normalizeSkills(u.skills).some((skill) => skill.toLowerCase().includes(q)),
    )
  }, [users, query])

  const filteredVacancies = useMemo(() => {
    if (!query.trim()) return vacancies
    const q = query.toLowerCase()
    return vacancies.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q) ||
        v.skills.some((skill) => skill.toLowerCase().includes(q)),
    )
  }, [vacancies, query])

  const filteredPatients = useMemo(() => {
    if (!query.trim()) return clinicalSearchSeed.patients
    const q = query.toLowerCase()
    return clinicalSearchSeed.patients.filter((patient) =>
      `${patient.name} ${patient.meta} ${patient.alert}`.toLowerCase().includes(q),
    )
  }, [query])

  const filteredAppointments = useMemo(() => {
    if (!query.trim()) return clinicalSearchSeed.appointments
    const q = query.toLowerCase()
    return clinicalSearchSeed.appointments.filter((appointment) =>
      `${appointment.title} ${appointment.meta} ${appointment.status}`.toLowerCase().includes(q),
    )
  }, [query])

  const filteredDocuments = useMemo(() => {
    if (!query.trim()) return clinicalSearchSeed.documents
    const q = query.toLowerCase()
    return clinicalSearchSeed.documents.filter((document) =>
      `${document.title} ${document.meta} ${document.status}`.toLowerCase().includes(q),
    )
  }, [query])

  const showUsers = activeTab === 'all' || activeTab === 'users'
  const showCompanies = activeTab === 'all' || activeTab === 'companies'
  const showVacancies = activeTab === 'all' || activeTab === 'vacancies'
  const showPatients = activeTab === 'all' || activeTab === 'patients'
  const showAppointments = activeTab === 'all' || activeTab === 'appointments'
  const showDocuments = activeTab === 'all' || activeTab === 'documents'

  const tabs: { key: TabFilter; label: string; icon: typeof Search }[] = [
    { key: 'all', label: t('search.tabAll', 'Все'), icon: Search },
    { key: 'patients', label: 'Пациенты', icon: HeartPulse },
    { key: 'appointments', label: 'Записи', icon: CalendarDays },
    { key: 'documents', label: 'Документы', icon: FileText },
    { key: 'users', label: t('search.tabUsers', 'Пользователи'), icon: Users },
    { key: 'companies', label: t('search.tabCompanies', 'Компании'), icon: Building2 },
    { key: 'vacancies', label: t('search.tabVacancies', 'Вакансии'), icon: Briefcase },
  ]



  async function handleJoinFromSearch(company: ExploreOrg) {
    if (!company.join_code) {
      toast.error('У компании отсутствует код для вступления')
      return
    }
    setJoiningOrgId(company.id)
    try {
      await joinOrg(company.join_code)
      toast.success('Заявка на вступление отправлена')
      setCompanies((prev) => prev.map((item) => (
        item.id === company.id
          ? { ...item, is_member: true, viewer_role: item.viewer_role ?? 'member' }
          : item
      )))
    } catch {
      toast.error('Не удалось отправить заявку на вступление')
    } finally {
      setJoiningOrgId(null)
    }
  }

  const hasResults =
    (showPatients && filteredPatients.length > 0) ||
    (showAppointments && filteredAppointments.length > 0) ||
    (showDocuments && filteredDocuments.length > 0) ||
    (showUsers && filteredUsers.length > 0) ||
    (showCompanies && filteredCompanies.length > 0) ||
    (showVacancies && filteredVacancies.length > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('search.title', 'Поиск')}
        description={t(
          'search.description',
          'Находите пациентов по ФИО, ИИН и телефону, открывайте записи, документы, сотрудников и компании',
        )}
        eyebrow={t('search.eyebrow', 'Explore')}
      />

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder', 'Пациент, ИИН, телефон, запись, документ, сотрудник...')}
          className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {/* Tab filters */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section title */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          {query.trim()
            ? t('search.results', 'Результаты поиска')
            : t('search.recommendations', 'Рекомендации')}
        </h2>
        {query.trim() && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {filteredPatients.length + filteredAppointments.length + filteredDocuments.length + filteredUsers.length + filteredCompanies.length + filteredVacancies.length}
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasResults && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16">
          <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">
            {t('search.noResults', 'Ничего не найдено')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('search.tryDifferent', 'Попробуйте изменить запрос или фильтры')}
          </p>
        </div>
      )}

      {!loading && showPatients && filteredPatients.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Пациенты</h3>
            <span className="text-xs text-muted-foreground">({filteredPatients.length})</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredPatients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => navigate(patient.to)}
                className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-surface-hover"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {patient.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{patient.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{patient.meta}</span>
                    <span className="mt-2 inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-500">
                      {patient.alert}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && showAppointments && filteredAppointments.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Записи</h3>
            <span className="text-xs text-muted-foreground">({filteredAppointments.length})</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredAppointments.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() => navigate(appointment.to)}
                className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-surface-hover"
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{appointment.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{appointment.meta}</span>
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">{appointment.status}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && showDocuments && filteredDocuments.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Документы</h3>
            <span className="text-xs text-muted-foreground">({filteredDocuments.length})</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredDocuments.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => navigate(document.to)}
                className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-surface-hover"
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{document.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{document.meta}</span>
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">{document.status}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Users section */}
      {!loading && showUsers && filteredUsers.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('search.users', 'Пользователи')}
            </h3>
            <span className="text-xs text-muted-foreground">({filteredUsers.length})</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredUsers.map((user) => (
              <UserCard key={user.id} user={user} navigate={navigate} t={t} />
            ))}
          </div>
        </section>
      )}

      {/* Companies section */}
      {!loading && showCompanies && filteredCompanies.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('search.companies', 'Компании')}
            </h3>
            <span className="text-xs text-muted-foreground">({filteredCompanies.length})</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredCompanies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                navigate={navigate}
                t={t}
                onJoin={() => void handleJoinFromSearch(company)}
                joining={joiningOrgId === company.id}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && showVacancies && filteredVacancies.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('search.vacancies', 'Вакансии')}
            </h3>
            <span className="text-xs text-muted-foreground">({filteredVacancies.length})</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredVacancies.map((vacancy) => (
              <VacancyCard key={vacancy.id} vacancy={vacancy} navigate={navigate} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/*  User Card                                                   */
/* ──────────────────────────────────────────────────────────── */

function UserCard({
  user,
  navigate,
  t,
}: {
  user: User
  navigate: ReturnType<typeof useNavigate>
  t: ReturnType<typeof useTranslation>['t']
}) {
  const skills = normalizeSkills(user.skills)
  const presence = getPresence(user)

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          <AvatarImage
            src={user.avatar_url}
            name={user.full_name}
            alt={user.full_name}
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-border"
            fallbackClassName="bg-gradient-to-br from-primary/20 to-primary/5 text-base"
          />
          <span className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2 ring-card ${presence.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/60'}`} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{user.full_name}</p>
          {(user.position || user.specialty) && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3 shrink-0" />
              <span className="truncate">{user.position || user.specialty}</span>
            </div>
          )}
          {user.city && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{user.city}</span>
            </div>
          )}
          <div className="mt-0.5 text-xs text-muted-foreground">{presence.label}</div>
        </div>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
            >
              {skill}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              +{skills.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Action */}
      <div className="mt-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/users/${user.id}`)}
          className="gap-1.5 rounded-xl text-xs"
        >
          {t('search.openProfile', 'Открыть профиль')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/*  Company Card                                                */
/* ──────────────────────────────────────────────────────────── */

function CompanyCard({
  company,
  navigate,
  t,
  onJoin,
  joining,
}: {
  company: ExploreOrg
  navigate: ReturnType<typeof useNavigate>
  t: ReturnType<typeof useTranslation>['t']
  onJoin: () => void
  joining: boolean
}) {
  const initial = company.name.charAt(0).toUpperCase()
  const truncatedDescription =
    company.description && company.description.length > 100
      ? company.description.slice(0, 100) + '...'
      : company.description

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start gap-4">
        {/* Logo / Initial */}
        {company.logo_url ? (
          <img
            src={company.logo_url}
            alt={company.name}
            className="h-14 w-14 shrink-0 rounded-xl object-cover ring-2 ring-border"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-lg font-bold text-blue-600 ring-2 ring-border dark:text-blue-400">
            {initial}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{company.name}</p>
          {company.industry && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3 shrink-0" />
              <span className="truncate">{company.industry}</span>
            </div>
          )}
          {company.website && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{company.website}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {truncatedDescription && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {truncatedDescription}
        </p>
      )}

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {company.max_members && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <Users className="h-3 w-3" />
            {t('search.members', 'до {{count}} участников', { count: company.max_members })}
          </span>
        )}
        {company.is_active !== false && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <Star className="h-3 w-3" />
            {t('search.active', 'Активна')}
          </span>
        )}
      </div>

      {/* Action */}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {!company.is_member && (
          <Button
            variant="default"
            size="sm"
            onClick={onJoin}
            disabled={joining}
            className="gap-1.5 rounded-xl text-xs"
          >
            {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {t('search.joinCompany', 'Запросить вступление')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/explore/companies/${company.id}`)}
          className="gap-1.5 rounded-xl text-xs"
        >
          {t('search.openCompany', 'Открыть компанию')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function VacancyCard({
  vacancy,
  navigate,
  t,
}: {
  vacancy: Vacancy
  navigate: ReturnType<typeof useNavigate>
  t: ReturnType<typeof useTranslation>['t']
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-2 ring-border">
          <Briefcase className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{vacancy.title}</p>
          {vacancy.city ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{vacancy.city}</span>
            </div>
          ) : null}
          {vacancy.employment_type ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3 shrink-0" />
              <span className="truncate">{vacancy.employment_type}</span>
            </div>
          ) : null}
        </div>
      </div>

      {vacancy.description ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {vacancy.description.length > 100 ? `${vacancy.description.slice(0, 100)}...` : vacancy.description}
        </p>
      ) : null}

      {vacancy.skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {vacancy.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/vacancies/${vacancy.id}?orgId=${vacancy.org_id}`)}
          className="gap-1.5 rounded-xl text-xs"
        >
          {t('search.openVacancy', 'Открыть вакансию')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
