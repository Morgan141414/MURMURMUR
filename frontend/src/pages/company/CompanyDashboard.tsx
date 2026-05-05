import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  BadgeCheck,
  CalendarClock,
  FileText,
  FolderOpen,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Shield,
  Sparkles,
  UserCircle2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { useOrg } from '@/hooks/useOrg'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media'
import { ROLE_LABELS, type OrgRole } from '@/types'

function CompanyLogo({ logoUrl, companyName, className }: { logoUrl?: string | null; companyName: string; className?: string }) {
  const src = resolveMediaUrl(logoUrl)
  if (!src) {
    return <div className={cn('rounded-2xl border border-border bg-transparent', className)} aria-label={companyName} />
  }

  return (
    <img
      src={src}
      alt={companyName}
      className={cn('rounded-2xl border border-border object-cover', className)}
    />
  )
}

export default function CompanyDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fullName = useAuthStore((s) => s.fullName)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const activeOrg = useOrgStore((s) => s.activeOrg())
  const role = activeOrg?.role ?? null
  const { data: orgDetail } = useOrg(activeOrgId ?? null)

  const canEditCompany = role === 'founder' || role === 'ceo'
  const canSeeActivity = canEditCompany || role === 'admin'

  const notSpecified = t('common.notSpecified', 'Not specified')

  const moderation = useMemo(() => {
    const raw = (orgDetail?.moderation_status ?? activeOrg?.moderationStatus ?? 'active').toLowerCase()
    if (raw === 'approved' || raw === 'active') return t('company.dashboard.moderationStatus.approved', 'Approved')
    if (raw === 'pending') return t('company.dashboard.moderationStatus.pending', 'Pending')
    if (raw === 'rejected') return t('company.dashboard.moderationStatus.rejected', 'Rejected')
    if (raw === 'revision') return t('company.dashboard.moderationStatus.revision', 'Needs changes')
    return raw
  }, [activeOrg?.moderationStatus, orgDetail?.moderation_status, t])

  const roleLabel = useMemo(() => {
    const key = role || 'member'
    const fallback = (ROLE_LABELS as Partial<Record<OrgRole, string>>)[key as OrgRole] || key
    return t(`orgRoles.${key}`, fallback)
  }, [role, t])

  const company = useMemo(() => ({
    name: orgDetail?.name ?? activeOrg?.orgName ?? t('shell.company', 'Company'),
    description: orgDetail?.description || orgDetail?.welcome_message || t('company.dashboard.noDescription', 'No company description yet.'),
    logo: orgDetail?.logo_url ?? activeOrg?.logoUrl ?? null,
    industry: orgDetail?.industry ?? null,
    website: orgDetail?.website ?? null,
    email: orgDetail?.company_email ?? null,
    phone: orgDetail?.company_phone ?? null,
    location: (orgDetail as any)?.city || orgDetail?.legal_address || null,
    registrationKind: orgDetail?.registration_kind ?? null,
    legalName: orgDetail?.legal_name_ru || orgDetail?.legal_name_kz || null,
    organizationForm: orgDetail?.organization_form ?? null,
    oked: orgDetail?.oked ?? null,
    bin: orgDetail?.bin ?? null,
    moderation,
  }), [activeOrg?.logoUrl, activeOrg?.orgName, moderation, orgDetail, t])

  const activityEvents = useMemo(() => ([
    t('company.dashboard.activity.events.profileUpdated', 'Company profile details updated'),
    t('company.dashboard.activity.events.contactsUpdated', 'Website or contacts changed'),
    t('company.dashboard.activity.events.documentsUpdated', 'Company documents folder updated'),
    t('company.dashboard.activity.events.policyUpdated', 'Document access policy changed'),
  ]), [t])

  if (!activeOrgId) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t('company.noOrgSelected')}
        description={t('company.selectOrgHint')}
      />
    )
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/12 via-card to-card">
        <div className="h-24 w-full bg-gradient-to-r from-primary/22 via-emerald-500/10 to-sky-500/14" />

        <div className="relative -mt-10 flex flex-col gap-4 px-5 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <CompanyLogo logoUrl={company.logo} companyName={company.name} className="h-20 w-20 shrink-0 shadow-lg" />

            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{company.name}</h1>
                <span className="rounded-md border border-border bg-surface-2/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {company.moderation}
                </span>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">{company.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/explore/companies/${activeOrgId}`)}
              className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              {t('company.dashboard.publicView', 'Public View')}
            </button>
            {canEditCompany && (
              <button
                onClick={() => navigate('/company/profile')}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('company.dashboard.editCompany', 'Edit Company')}
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-border bg-card p-5">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-5">
              <TabsTrigger value="overview">{t('company.dashboard.tabs.about', 'About')}</TabsTrigger>
              <TabsTrigger value="documents">{t('company.dashboard.tabs.documents', 'Documents')}</TabsTrigger>
              <TabsTrigger value="contacts">{t('company.dashboard.tabs.contacts', 'Contacts')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <InfoLine label={t('company.dashboard.fields.industry', 'Industry')} value={company.industry ?? notSpecified} icon={Sparkles} isMissing={!company.industry} />
              <InfoLine label={t('company.dashboard.fields.location', 'Location')} value={company.location ?? notSpecified} icon={MapPin} isMissing={!company.location} />
              <InfoLine label={t('company.dashboard.fields.registration', 'Registration')} value={company.registrationKind ?? notSpecified} icon={ShieldCheck} isMissing={!company.registrationKind} />
              <InfoLine label={t('company.dashboard.fields.organizationForm', 'Organization form')} value={company.organizationForm ?? notSpecified} icon={ShieldCheck} isMissing={!company.organizationForm} />
              <InfoLine label={t('company.dashboard.fields.legalName', 'Legal name')} value={company.legalName ?? notSpecified} icon={ShieldCheck} isMissing={!company.legalName} />
              <InfoLine label={t('company.dashboard.fields.oked', 'OKED')} value={company.oked ?? notSpecified} icon={ShieldCheck} isMissing={!company.oked} />
              <InfoLine label={t('company.dashboard.fields.bin', 'BIN')} value={company.bin ?? notSpecified} icon={ShieldCheck} isMissing={!company.bin} />
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="rounded-lg border border-border bg-surface-2/55 p-4">
                <p className="text-sm font-semibold text-foreground">{t('company.dashboard.documents.title', 'Company Documents')}</p>
                <p className="mt-1 text-xs text-text-tertiary">
                  {t('company.dashboard.documents.description', 'Default company folder is always available. Employees see only documents linked to them.')}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate('/company/documents')}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    {t('company.dashboard.documents.openDocuments', 'Open Documents')}
                  </button>
                  {canEditCompany && (
                    <button
                      onClick={() => navigate('/company/documents')}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {t('company.dashboard.documents.manageFolders', 'Manage Folders')}
                    </button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              <InfoLine label={t('company.dashboard.fields.website', 'Website')} value={company.website ?? notSpecified} icon={Globe} isMissing={!company.website} />
              <InfoLine label={t('company.dashboard.fields.companyEmail', 'Company email')} value={company.email ?? notSpecified} icon={Mail} isMissing={!company.email} />
              <InfoLine label={t('company.dashboard.fields.companyPhone', 'Company phone')} value={company.phone ?? notSpecified} icon={Phone} isMissing={!company.phone} />
            </TabsContent>
          </Tabs>
        
          {/* Roles & Permissions */}
          <div className="mt-6 rounded-xl border border-border bg-surface-2/55 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-foreground">{t('settings.rolesAndPermissions', 'Роли и права')}</h3>
                  <p className="text-[12px] text-muted-foreground">{t('settings.rolesDescription', 'Настройка ролей и разрешений для сотрудников компании')}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/company/roles')}
                className="rounded-lg border border-border bg-surface-2/65 px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
              >
                {t('settings.openRoles', 'Открыть')}
              </button>
            </div>
          </div>
</section>

        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{t('company.dashboard.snapshot.title', 'Profile Snapshot')}</p>
            <div className="mt-3 space-y-2">
              <StatLine label={t('company.dashboard.snapshot.company', 'Company')} value={company.name} />
              <StatLine label={t('company.dashboard.snapshot.moderation', 'Moderation')} value={company.moderation} />
              <StatLine label={t('company.dashboard.snapshot.role', 'Role')} value={roleLabel} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{t('company.dashboard.activity.title', 'Recent Activity')}</h3>
            </div>

            {!canSeeActivity ? (
              <p className="rounded-xl border border-dashed border-border p-3 text-xs text-text-tertiary">
                {t('company.dashboard.activity.restricted', 'Activity is visible for CEO/Founder.')}
              </p>
            ) : (
              <div className="space-y-2">
                {activityEvents.map((event, idx) => (
                  <div key={event} className="rounded-xl border border-border bg-background px-3 py-2.5">
                    <p className="text-xs font-medium text-foreground">{event}</p>
                    <p className="mt-1 text-[11px] text-text-tertiary">
                      <UserCircle2 className="mr-1 inline h-3.5 w-3.5" />
                      {(fullName || t('company.dashboard.activity.system', 'System'))} • {t('company.dashboard.activity.daysAgo', { days: idx + 1 })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function InfoLine({
  label,
  value,
  icon: Icon,
  isMissing = false,
}: {
  label: string
  value: string
  icon: typeof Globe
  isMissing?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={cn('mt-1.5 flex items-center gap-2 text-sm font-medium', isMissing ? 'text-text-tertiary' : 'text-foreground')}>
        <Icon className="h-4 w-4" />
        {value}
      </p>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  )
}
