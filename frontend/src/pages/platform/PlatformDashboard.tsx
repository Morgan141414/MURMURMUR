import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  Activity, AlertTriangle, ArrowRight, Building2, CheckCircle2,
  Clock, CreditCard, DollarSign, HeadphonesIcon, Megaphone,
  Scale, Shield, TrendingUp, TrendingDown, Users, ChevronRight,
  Zap, Eye, BarChart3, Globe,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import api from '@/api/client'

interface DashboardStats {
  total_companies: number
  active_companies: number
  pending_moderation: number
  total_users: number
  open_tickets: number
  overdue_companies: number
  total_revenue: number
  recent_activity: AuditEntry[]
}

interface AuditEntry {
  id: string
  event: string
  user_name: string | null
  user_email: string | null
  role: string | null
  org_name: string | null
  severity: string
  created_at: string
}

const EVENT_LABELS: Record<string, string> = {
  platform_moderation_approve: 'platform.eventLabels.companyApproved',
  platform_moderation_reject: 'platform.eventLabels.companyRejected',
  moderation_revision: 'platform.eventLabels.revisionRequested',
  billing_discount_set: 'platform.eventLabels.discountApplied',
  billing_company_suspended: 'platform.eventLabels.companySuspended',
  billing_company_restored: 'platform.eventLabels.companyRestored',
  billing_marked_overdue: 'platform.eventLabels.markedOverdue',
  billing_marked_paid: 'platform.eventLabels.paymentConfirmed',
  content_block_created: 'platform.eventLabels.contentCreated',
  content_block_updated: 'platform.eventLabels.contentUpdated',
  content_block_deleted: 'platform.eventLabels.contentDeleted',
  password_verify_success: 'platform.eventLabels.passwordVerified',
  password_verify_failed: 'platform.eventLabels.passwordFailed',
  admin_org_suspend: 'platform.eventLabels.companySuspended',
  admin_org_activate: 'platform.eventLabels.companyActivated',
}

const SEVERITY_STYLES: Record<string, { icon: string; bg: string; dot: string }> = {
  info: { icon: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' },
  warning: { icon: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' },
  error: { icon: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
}

/* ── Sparkline ── */
function Sparkline({ data, color = '#3B82F6', width = 80, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="shrink-0 opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

/* ── Stat Colors ── */
const STAT_COLORS: Record<string, { iconClass: string; spark: string; glow: string }> = {
  blue: { iconClass: 'icon-blue', spark: '#3B82F6', glow: 'rgba(59,130,246,0.15)' },
  green: { iconClass: 'icon-green', spark: '#10B981', glow: 'rgba(16,185,129,0.15)' },
  amber: { iconClass: 'icon-amber', spark: '#F59E0B', glow: 'rgba(245,158,11,0.15)' },
  violet: { iconClass: 'icon-violet', spark: '#8B5CF6', glow: 'rgba(139,92,246,0.15)' },
  red: { iconClass: 'icon-red', spark: '#EF4444', glow: 'rgba(239,68,68,0.15)' },
  cyan: { iconClass: 'icon-cyan', spark: '#06B6D4', glow: 'rgba(6,182,212,0.15)' },
}

export default function PlatformDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fullName = useAuthStore((s) => s.fullName)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/platform/dashboard-stats')
      setStats(res.data)
    } catch { /* API may not be ready */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadStats() }, [loadStats])

  const roleLabel = isSuperAdmin
    ? t('platform.roleLabels.superAdmin', 'Super Admin')
    : platformRole === 'admin' ? t('platform.roleLabels.admin', 'Admin')
    : platformRole === 'moderator' ? t('platform.roleLabels.moderator', 'Moderator')
    : platformRole === 'accounting' ? t('platform.roleLabels.accounting', 'Accounting')
    : platformRole === 'tech_support' ? t('platform.roleLabels.techSupport', 'Tech Support')
    : platformRole === 'marketing' ? t('platform.roleLabels.marketing', 'Marketing')
    : t('platform.roleLabels.platform', 'Platform')

  const quickActions = [
    { label: t('platform.quickActions.companies.label', 'Companies'), icon: Building2, to: '/platform/companies', description: t('platform.quickActions.companies.description', 'Registry of all platform companies'), roles: ['superadmin', 'moderator'], color: 'icon-blue' },
    { label: t('platform.quickActions.moderation.label', 'Moderation'), icon: Scale, to: '/platform/moderation', description: t('platform.quickActions.moderation.description', 'Review queue for company applications'), roles: ['superadmin', 'moderator'], alert: stats?.pending_moderation, color: 'icon-amber' },
    { label: t('platform.quickActions.billing.label', 'Billing'), icon: DollarSign, to: '/platform/billing', description: t('platform.quickActions.billing.description', 'Financial control and payments'), roles: ['superadmin'], alert: stats?.overdue_companies, color: 'icon-green' },
    { label: t('platform.quickActions.support.label', 'Support'), icon: HeadphonesIcon, to: '/platform/support', description: t('platform.quickActions.support.description', 'Support tickets and requests'), roles: ['superadmin', 'tech_support'], alert: stats?.open_tickets, color: 'icon-cyan' },
    { label: t('platform.quickActions.marketing.label', 'Marketing'), icon: Megaphone, to: '/platform/marketing', description: t('platform.quickActions.marketing.description', 'Website content management'), roles: ['superadmin', 'marketing'], color: 'icon-pink' },
    { label: t('platform.quickActions.users.label', 'Users'), icon: Users, to: '/platform/users', description: t('platform.quickActions.users.description', 'All platform users'), roles: ['superadmin', 'admin'], color: 'icon-violet' },
  ].filter((a) => isSuperAdmin || (platformRole && a.roles.includes(platformRole)))

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
  }

  // Fake sparkline data
  const sparkData = [
    [120, 145, 132, 158, 142, 175, 168],
    [85, 92, 88, 95, 102, 98, 110],
    [4200, 4800, 5100, 4900, 5500, 5800, 6200],
    [42, 48, 45, 52, 50, 55, 58],
  ]

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title={t('platform.dashboard.title', 'Platform Control Center')}
        description={t('platform.dashboard.description', 'Monitor companies, moderation, finances, and platform security.')}
        eyebrow={t('platform.dashboard.eyebrow', 'Platform')}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Shield className="h-3 w-3" />
            {roleLabel}
          </span>
        }
      />

      {/* ═══ Welcome + Alerts Banner ═══ */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/8 via-card to-violet-500/5 p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-violet-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="icon-container icon-container-lg icon-violet rounded-xl">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{fullName || t('platform.roleLabels.admin', 'Administrator')}</h2>
              <p className="text-[13px] text-text-secondary">{t('platform.dashboard.controlOversight', 'Platform control & security oversight')}</p>
            </div>
          </div>

          {/* Alert badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {stats?.pending_moderation ? (
              <button
                onClick={() => navigate('/platform/moderation')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] font-medium text-amber-500 hover:bg-amber-500/15 transition-colors"
              >
                <Clock className="h-3.5 w-3.5" />
                {t('platform.dashboard.pendingModeration', { count: stats.pending_moderation })}
              </button>
            ) : null}
            {stats?.overdue_companies ? (
              <button
                onClick={() => navigate('/platform/billing')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] font-medium text-red-500 hover:bg-red-500/15 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('platform.dashboard.overdue', { count: stats.overdue_companies })}
              </button>
            ) : null}
            {stats?.open_tickets ? (
              <button
                onClick={() => navigate('/platform/support')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[12px] font-medium text-blue-500 hover:bg-blue-500/15 transition-colors"
              >
                <HeadphonesIcon className="h-3.5 w-3.5" />
                {t('platform.dashboard.openTickets', { count: stats.open_tickets })}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* ═══ Stats Grid with Sparklines ═══ */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Building2, label: t('platform.dashboard.stats.totalCompanies', 'Total Companies'), value: stats?.total_companies ?? '—', color: 'blue', data: sparkData[0] },
          { icon: Users, label: t('platform.dashboard.stats.totalUsers', 'Total Users'), value: stats?.total_users ?? '—', color: 'violet', data: sparkData[1] },
          { icon: TrendingUp, label: t('platform.dashboard.stats.revenue', 'Revenue'), value: stats ? formatCurrency(stats.total_revenue) : '—', color: 'green', data: sparkData[2] },
          { icon: CheckCircle2, label: t('platform.dashboard.stats.activeCompanies', 'Active Companies'), value: stats?.active_companies ?? '—', color: 'cyan', data: sparkData[3] },
        ].map((item, i) => {
          const Icon = item.icon
          const clr = STAT_COLORS[item.color] || STAT_COLORS.blue
          return (
            <div key={item.label} className="stat-card relative overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full opacity-40" style={{ background: `radial-gradient(circle at top right, ${clr.glow}, transparent 70%)` }} />
              <div className="relative flex items-start justify-between">
                <div className={cn('icon-container icon-container-md rounded-lg', clr.iconClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <Sparkline data={item.data} color={clr.spark} />
              </div>
              <div className="relative mt-3">
                <p className="text-[1.75rem] font-bold tracking-tight leading-none text-foreground">
                  {loading ? '...' : item.value}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-text-secondary">{item.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══ Main Grid: Activity + Quick Actions ═══ */}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">

        {/* Recent activity */}
        <section className="enterprise-card rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-sm icon-amber rounded-md">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-foreground">{t('platform.dashboard.activity.title', 'Recent Activity')}</h3>
                <p className="text-[12px] text-text-tertiary">{t('platform.dashboard.activity.description', 'Platform audit log')}</p>
              </div>
            </div>
            {isSuperAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/platform/audit-log')} className="text-[12px]">
                {t('platform.dashboard.activity.viewAll', 'View all')}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>

          {!stats?.recent_activity?.length ? (
            <EmptyState
              icon={Activity}
              title={t('platform.dashboard.activity.emptyTitle', 'No recent activity')}
              description={t('platform.dashboard.activity.emptyDescription', 'System events will appear here as the platform operates.')}
            />
          ) : (
            <div className="space-y-1">
              {stats.recent_activity.map((entry) => {
                const sev = SEVERITY_STYLES[entry.severity] || SEVERITY_STYLES.info
                return (
                  <div key={entry.id} className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover">
                    <div className="mt-1.5">
                      <div className={cn('h-2 w-2 rounded-full', sev.dot)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground">
                        {t(EVENT_LABELS[entry.event] || entry.event, entry.event)}
                      </p>
                      <p className="text-[11px] text-text-tertiary">
                        {entry.user_name || entry.user_email || t('platform.dashboard.activity.system', 'System')}
                        {entry.org_name && ` · ${entry.org_name}`}
                        {' · '}
                        {new Date(entry.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      sev.bg, sev.icon,
                    )}>
                      {entry.severity}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="enterprise-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-violet rounded-md">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">{t('platform.dashboard.quickActions.title', 'Quick Actions')}</h3>
              <p className="text-[12px] text-text-tertiary">{t('platform.dashboard.quickActions.description', 'Key platform sections')}</p>
            </div>
          </div>

          <div className="space-y-1">
            {quickActions.map((action) => (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                className="group flex w-full items-center gap-3 rounded-lg border border-border/60 px-3.5 py-3 text-left transition-all hover:bg-surface-hover hover:-translate-y-px hover:shadow-sm"
              >
                <div className={cn('icon-container icon-container-sm rounded-md', action.color)}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-foreground">{action.label}</p>
                    {action.alert ? (
                      <span className="inline-flex items-center rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                        {action.alert}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-text-tertiary line-clamp-1">{action.description}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-quaternary group-hover:text-text-tertiary transition-colors" />
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ═══ Platform Health Overview ═══ */}
      {isSuperAdmin && (
        <section className="enterprise-card rounded-xl p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-container icon-container-sm icon-green rounded-md">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">{t('platform.dashboard.health.title', 'Platform Health')}</h3>
              <p className="text-[12px] text-text-tertiary">{t('platform.dashboard.health.description', 'System status and key metrics')}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: t('platform.dashboard.health.apiUptime', 'API Uptime'), value: '99.99%', status: 'healthy', icon: Globe },
              { name: t('platform.dashboard.health.responseTime', 'Response Time'), value: '45ms', status: 'healthy', icon: Zap },
              { name: t('platform.dashboard.health.errorRate', 'Error Rate'), value: '0.02%', status: 'healthy', icon: AlertTriangle },
              { name: t('platform.dashboard.health.activeSessions', 'Active Sessions'), value: '—', status: 'normal', icon: Eye },
            ].map((metric) => {
              const Icon = metric.icon
              return (
                <div key={metric.name} className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-text-tertiary" />
                      <h4 className="text-[12px] font-medium text-text-secondary">{metric.name}</h4>
                    </div>
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      metric.status === 'healthy' ? 'bg-success animate-pulse' : 'bg-text-quaternary',
                    )} />
                  </div>
                  <p className="text-xl font-bold text-foreground">{metric.value}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
