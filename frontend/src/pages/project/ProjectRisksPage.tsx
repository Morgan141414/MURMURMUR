import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { AlertCircle, AlertTriangle, Plus, Shield, TrendingDown } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'

export default function ProjectRisksPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()

  function handleAddRisk() {
    toast.info('Форма добавления риска будет доступна после подключения risk workflow')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('project.risks', 'Риски')}
        description={t('project.risksDesc', 'Управление рисками проекта')}
        eyebrow="Project"
        breadcrumbs={[
          { label: t('shell.project'), to: projectId ? `/project/${projectId}` : '/project' },
          { label: t('project.risks', 'Риски') },
        ]}
        actions={
          <Button type="button" onClick={handleAddRisk}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('project.addRisk', 'Добавить риск')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={AlertTriangle} label={t('project.highRisks', 'Высокие')} value={0} />
        <StatCard icon={AlertCircle} label={t('project.mediumRisks', 'Средние')} value={0} />
        <StatCard icon={Shield} label={t('project.mitigated', 'Снижены')} value={0} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <EmptyState
          icon={TrendingDown}
          title={t('project.noRisks', 'Нет зарегистрированных рисков')}
          description={t('project.noRisksDesc', 'Добавьте риски проекта для их мониторинга и управления')}
        />
      </div>
    </div>
  )
}
