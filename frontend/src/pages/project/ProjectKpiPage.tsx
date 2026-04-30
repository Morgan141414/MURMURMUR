import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { BarChart3, Target, TrendingUp, Users } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'

export default function ProjectKpiPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('project.kpi', 'KPI')}
        description={t('project.kpiDesc', 'Ключевые показатели эффективности проекта')}
        eyebrow="Project"
        breadcrumbs={[
          { label: t('shell.project'), to: projectId ? `/project/${projectId}` : '/project' },
          { label: t('project.kpi', 'KPI') },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp} label={t('project.velocity', 'Velocity')} value="—" />
        <StatCard icon={Target} label={t('project.completion', 'Прогресс')} value="—" />
        <StatCard icon={Users} label={t('project.teamLoad', 'Загрузка команды')} value="—" />
        <StatCard icon={BarChart3} label={t('project.quality', 'Качество')} value="—" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <EmptyState
          icon={BarChart3}
          title={t('project.noKpiData', 'Нет данных KPI')}
          description={t('project.noKpiDataDesc', 'KPI рассчитываются на основе задач проекта. Создайте задачи для начала отслеживания.')}
        />
      </div>
    </div>
  )
}
