import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { AlertTriangle, CalendarDays, CheckCircle2, Clock } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'

export default function ProjectDeadlinesPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('project.deadlines', 'Дедлайны')}
        description={t('project.deadlinesDesc', 'Сроки и контрольные точки проекта')}
        eyebrow="Project"
        breadcrumbs={[
          { label: t('shell.project'), to: projectId ? `/project/${projectId}` : '/project' },
          { label: t('project.deadlines', 'Дедлайны') },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={AlertTriangle} label={t('project.overdue', 'Просрочено')} value={0} />
        <StatCard icon={Clock} label={t('project.upcoming', 'Предстоящие')} value={0} />
        <StatCard icon={CheckCircle2} label={t('project.completed', 'Завершены')} value={0} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <EmptyState
          icon={CalendarDays}
          title={t('project.noDeadlines', 'Нет дедлайнов')}
          description={t('project.noDeadlinesDesc', 'Дедлайны задач появятся здесь автоматически')}
        />
      </div>
    </div>
  )
}
