import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { FileText, Upload, FolderOpen, Clock3, ShieldCheck } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useOrgStore } from '@/stores/orgStore'
import { Button } from '@/components/ui/button'

export default function ProjectFilesPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const org = useOrgStore((s) => s.activeOrg())

  function handleFileAction() {
    toast.info('Загрузка файлов будет доступна после подключения storage workflow')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('project.files', 'Files')}
        description="Project files, approvals, handoff materials, and linked operational documents."
        eyebrow="Project workspace"
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('shell.project'), to: '/project' },
          { label: t('project.files', 'Files') },
        ]}
        actions={
          <Button type="button" onClick={handleFileAction}>
            <Upload className="mr-1.5 h-4 w-4" />
            {t('project.uploadFile', 'Upload')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={FolderOpen} label="Files" value="0" />
        <MetricCard icon={Clock3} label="Pending review" value="0" />
        <MetricCard icon={ShieldCheck} label="Approved docs" value="0" />
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-12">
        <EmptyState
          icon={FolderOpen}
          title={t('project.noFiles', 'Нет файлов')}
          description={t('project.noFilesDesc', 'Загрузите файлы проекта или перетащите их сюда')}
          action={
            <button type="button" onClick={handleFileAction} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
              <Upload className="h-4 w-4" />
              {t('project.selectFiles', 'Выбрать файлы')}
            </button>
          }
        />
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}
