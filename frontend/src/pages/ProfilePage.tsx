import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getMe } from '@/api/profile'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { useNavigate } from 'react-router'
import {
  Mail, MapPin, Globe, Briefcase, GraduationCap, Clock,
  Heart, Pencil, FolderOpen, Users,
  Award, Star, Calendar, Shield, ClipboardCheck, BarChart3,
  Building2, MessageSquare,
} from 'lucide-react'
import { ROLE_LABELS, type OrgRole } from '@/types'
import { AvatarImage } from '@/components/shared/AvatarImage'

interface ProfileData {
  first_name?: string
  last_name?: string
  patronymic?: string
  email: string
  phone?: string
  bio?: string
  specialty?: string
  city?: string
  education?: string
  portfolio_url?: string
  experience_years?: number
  skills?: string[]
  is_looking_for_job?: boolean
  desired_salary?: number
  desired_salary_currency?: 'USD' | 'KZT' | 'RUB'
  position?: string
  avatar_url?: string
  created_at?: string
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const email = useAuthStore((s) => s.email)
  const { orgs, activeOrg } = useOrgStore()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData | null>(null)

  const current = activeOrg()
  const currentRole = current?.role ?? null

  useEffect(() => {
    getMe()
      .then(({ data }) => setProfile(data as ProfileData))
      .catch(() => toast.error(t('profile.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!profile) return null

  const fullName = [profile.last_name, profile.first_name, profile.patronymic].filter(Boolean).join(' ') || email || ''
  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((w) => w!.charAt(0))
    .join('')
    .toUpperCase() || 'U'

  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : null

  const stats = [
    { label: t('profile.projects'), value: 0 },
    { label: t('profile.teams'), value: orgs.length },
    { label: t('profile.experience'), value: profile.experience_years ?? 0 },
  ]

  return (
    <div className="page-enter mx-auto max-w-4xl space-y-6">
      {/* Profile header — GitHub / Instagram style */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Avatar */}
        <div className="shrink-0">
          {profile.avatar_url ? (
            <AvatarImage
              src={profile.avatar_url}
              name={fullName}
              alt="avatar"
              className="h-[120px] w-[120px] rounded-full border-2 border-border object-cover"
              fallbackClassName="border-2 border-border text-3xl font-bold"
            />
          ) : (
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-2 border-border bg-primary/10 text-3xl font-bold text-primary">
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
              {(profile.position || profile.specialty) && (
                <p className="mt-0.5 text-base text-text-secondary">
                  {[profile.position, profile.specialty].filter(Boolean).join(' · ')}
                </p>
              )}
              {currentRole && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Shield className="h-3 w-3" />
                  {ROLE_LABELS[currentRole]}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/profile/settings')}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              Редактировать профиль
            </button>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-3 text-sm text-foreground leading-relaxed max-w-lg">
              {profile.bio}
            </p>
          )}

          {/* Meta info row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
            {profile.city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />{profile.city}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />{email}
            </span>
            {profile.portfolio_url && (
              <a
                href={profile.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />{profile.portfolio_url.replace(/^https?:\/\//, '')}
              </a>
            )}
            {joinDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />{joinDate}
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="mt-4 flex gap-6">
            {stats.map((s) => (
              <div key={s.label}>
                <span className="text-lg font-bold text-foreground">{s.value}</span>
                <span className="ml-1.5 text-sm text-text-secondary">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Open to work badge */}
          {profile.is_looking_for_job && (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                <Heart className="h-3 w-3" />
                {t('profile.openToWork')}
                {profile.desired_salary ? ` · ${profile.desired_salary.toLocaleString()} ${profile.desired_salary_currency ?? 'USD'}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Role-specific content */}
      <RoleDashboard role={currentRole} profile={profile} />

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column — sidebar info */}
        <div className="space-y-4">
          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <section className="enterprise-card rounded-xl p-5">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-3">
                <div className="icon-container icon-container-sm icon-blue rounded-md">
                  <Award className="h-4 w-4" />
                </div>
                {t('profile.skills')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {profile.education && (
            <section className="enterprise-card rounded-xl p-5">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-2">
                <div className="icon-container icon-container-sm icon-violet rounded-md">
                  <GraduationCap className="h-4 w-4" />
                </div>
                {t('profile.education')}
              </h3>
              <p className="text-[13px] text-text-secondary">{profile.education}</p>
            </section>
          )}

          {/* Experience */}
          {profile.experience_years != null && profile.experience_years > 0 && (
            <section className="enterprise-card rounded-xl p-5">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-2">
                <div className="icon-container icon-container-sm icon-amber rounded-md">
                  <Clock className="h-4 w-4" />
                </div>
                {t('profile.experience')}
              </h3>
              <p className="text-[13px] text-text-secondary">
                {profile.experience_years} {t('profile.years')}
              </p>
            </section>
          )}

          {/* Organizations */}
          {orgs.length > 0 && (
            <section className="enterprise-card rounded-xl p-5">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-3">
                <div className="icon-container icon-container-sm icon-green rounded-md">
                  <Briefcase className="h-4 w-4" />
                </div>
                {t('dashboard.myCompanies')}
              </h3>
              <div className="space-y-2">
                {orgs.map((org) => (
                  <div key={org.orgId} className="flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      {org.orgName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{org.orgName}</p>
                      <span className="text-[11px] text-text-tertiary">{ROLE_LABELS[org.role]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Projects placeholder */}
          <section className="enterprise-card rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-3">
              {t('profile.projects')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-dashed border-border p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
                <FolderOpen className="h-6 w-6 text-text-tertiary/30 mb-2" />
                <p className="text-[13px] text-text-tertiary">{t('dashboard.noProjects')}</p>
              </div>
            </div>
          </section>

          {/* Teams */}
          <section className="enterprise-card rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-3">
              {t('profile.teams')}
            </h3>
            <div className="rounded-lg border border-dashed border-border p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
              <Users className="h-6 w-6 text-text-tertiary/30 mb-2" />
              <p className="text-[13px] text-text-tertiary">{t('profile.noTeams')}</p>
            </div>
          </section>

          {/* Achievements */}
          <section className="enterprise-card rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-3">
              {t('profile.achievements')}
            </h3>
            <div className="rounded-lg border border-dashed border-border p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
              <Award className="h-6 w-6 text-text-tertiary/30 mb-2" />
              <p className="text-[13px] text-text-tertiary">{t('profile.noAchievements')}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/** Role-specific dashboard section in the personal cabinet */
function RoleDashboard({ role, profile }: { role: OrgRole | null; profile: ProfileData }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!role) return null

  // Role-specific quick actions and info
  const roleConfigs: Partial<Record<OrgRole, { title: string; description: string; actions: { label: string; icon: typeof Shield; to: string }[] }>> = {
    founder: {
      title: t('cabinet.founderTitle', 'Панель Основателя'),
      description: t('cabinet.founderDesc', 'Полный доступ к управлению компанией'),
      actions: [
        { label: t('nav.employees', 'Сотрудники'), icon: Users, to: '/company/people' },
        { label: t('nav.departments', 'Отделы'), icon: FolderOpen, to: '/company/projects' },
        { label: t('nav.reports', 'Отчёты'), icon: BarChart3, to: '/reports' },
        { label: t('company.manageRoles', 'Роли и права'), icon: Shield, to: '/company/roles' },
      ],
    },
    ceo: {
      title: t('cabinet.ceoTitle', 'Панель CEO'),
      description: t('cabinet.ceoDesc', 'Управление компанией и её подразделениями'),
      actions: [
        { label: t('nav.employees', 'Сотрудники'), icon: Users, to: '/company/people' },
        { label: t('nav.departments', 'Отделы'), icon: FolderOpen, to: '/company/projects' },
        { label: t('nav.reports', 'Отчёты'), icon: BarChart3, to: '/company/analytics' },
      ],
    },
    superadmin: {
      title: t('cabinet.superAdminTitle', 'Панель Super Admin'),
      description: t('cabinet.superAdminDesc', 'Администрирование платформы и назначение ролей'),
      actions: [
        { label: t('nav.platformUsers', 'Пользователи'), icon: Users, to: '/platform/users' },
        { label: t('nav.departments', 'Отделы'), icon: FolderOpen, to: '/company/projects' },
      ],
    },
    hr: {
      title: t('cabinet.hrTitle', 'HR Панель'),
      description: t('cabinet.hrDesc', 'Кадровый учёт и управление сотрудниками'),
      actions: [
        { label: t('nav.employees', 'Сотрудники'), icon: Users, to: '/company/people' },
        { label: t('nav.hrWorkspace', 'HR Рабочий стол'), icon: ClipboardCheck, to: '/company/hr' },
        { label: t('nav.joinRequests', 'Заявки'), icon: MessageSquare, to: '/company/join-requests' },
      ],
    },
    sysadmin: {
      title: t('cabinet.sysadminTitle', 'Панель System Admin'),
      description: t('cabinet.sysadminDesc', 'Техническая поддержка пользователей'),
      actions: [
        { label: t('nav.support', 'Тех. поддержка'), icon: MessageSquare, to: '/support' },
      ],
    },
    team_lead: {
      title: t('cabinet.teamLeadTitle', 'Панель Team Lead'),
      description: t('cabinet.teamLeadDesc', 'Управление проектовой и задачами'),
      actions: [
        { label: t('nav.teams', 'Команды'), icon: Users, to: '/company/teams' },
        { label: t('nav.departments', 'Отделы'), icon: FolderOpen, to: '/department' },
      ],
    },
    project_manager: {
      title: t('cabinet.pmTitle', 'Панель Project Manager'),
      description: t('cabinet.pmDesc', 'Управление проектами и задачами'),
      actions: [
        { label: t('nav.departments', 'Отделы'), icon: FolderOpen, to: '/department' },
        { label: t('nav.teams', 'Команды'), icon: Users, to: '/company/teams' },
      ],
    },
    developer: {
      title: t('cabinet.devTitle', 'Рабочее пространство'),
      description: t('cabinet.devDesc', 'Ваши задачи и рабочие доски'),
      actions: [
        { label: t('board.myTasks', 'Моя доска'), icon: ClipboardCheck, to: '/company/my-board' },
        { label: t('nav.teams', 'Команды'), icon: Users, to: '/company/teams' },
      ],
    },
    member: {
      title: t('cabinet.memberTitle', 'Личный кабинет'),
      description: t('cabinet.memberDesc', 'Ваш профиль и информация о компании'),
      actions: [
        { label: t('nav.employees', 'Сотрудники'), icon: Users, to: '/company/people' },
      ],
    },
    admin: {
      title: t('cabinet.adminTitle', 'Панель Администратора'),
      description: t('cabinet.adminDesc', 'Настройка ролей и технические настройки компании'),
      actions: [
        { label: t('company.manageRoles', 'Роли и права'), icon: Shield, to: '/company/roles' },
        { label: t('nav.employees', 'Сотрудники'), icon: Users, to: '/company/people' },
      ],
    },
  }

  const config = roleConfigs[role]
  if (!config) return null

  return (
    <section className="enterprise-card rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="icon-container icon-container-sm icon-blue rounded-md">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">{config.title}</h2>
          <p className="text-[12px] text-text-tertiary">{config.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {config.actions.map((action) => (
          <button
            key={action.to}
            onClick={() => navigate(action.to)}
            className="enterprise-card-interactive flex flex-col items-center gap-2 rounded-lg p-4"
          >
            <div className="icon-container icon-container-sm icon-blue rounded-md">
              <action.icon className="h-4 w-4" />
            </div>
            <span className="text-[12px] font-medium text-foreground text-center">{action.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
