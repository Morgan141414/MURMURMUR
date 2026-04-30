import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Clock, Key, Shield, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'

type RequestStatus = 'pending' | 'approved' | 'denied' | 'expired'

interface AccessRequest {
  id: string
  requestedBy: string
  role: string
  reason: string
  targetEntity: string
  status: RequestStatus
  requestedAt: string
  reviewedBy?: string
  duration: string
}

export default function AccessRequestsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const requests: AccessRequest[] = []

  const columns: ColumnDef<AccessRequest>[] = [
    {
      accessorKey: 'id',
      header: t('platform.request', 'Запрос'),
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{row.original.id}</p>
          <p className="text-xs text-muted-foreground">{row.original.reason}</p>
        </div>
      ),
    },
    {
      id: 'actor',
      header: t('platform.requestedBy', 'Запросил'),
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="text-sm text-foreground">{row.original.requestedBy}</p>
          <p className="text-xs text-muted-foreground">{row.original.role}</p>
        </div>
      ),
    },
    {
      accessorKey: 'targetEntity',
      header: t('platform.target', 'Объект доступа'),
    },
    {
      accessorKey: 'status',
      header: t('platform.status', 'Статус'),
      cell: ({ row }) => {
        const tone =
          row.original.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600'
          : row.original.status === 'pending' ? 'bg-amber-500/10 text-amber-600'
          : 'bg-red-500/10 text-red-600'

        return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${tone}`}>{row.original.status}</span>
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.accessRequests')}
        description={t('accessRequests.description', 'Emergency access requests, approvals, denials, and short-lived privileged sessions across the platform.')}
        eyebrow={t('accessRequests.eyebrow', 'Platform controls')}
        breadcrumbs={[
          { label: t('shell.platform'), to: '/platform' },
          { label: t('nav.accessRequests') },
        ]}
        actions={
          <Button variant="outline">
            <Shield className="mr-1.5 h-4 w-4" />
            {t('platform.accessPolicy', 'Политика доступа')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Clock} label={t('platform.pending', 'Ожидают')} value="—" />
        <StatCard icon={CheckCircle2} label={t('platform.approved', 'Одобрено')} value="—" />
        <StatCard icon={XCircle} label={t('platform.denied', 'Отклонено')} value="—" />
        <StatCard icon={Key} label={t('platform.accessWindow', 'Окно доступа')} value={t('platform.onDemand', 'По запросу')} />
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        {t('platform.accessRequestsNote', 'Запросы привилегированного доступа будут отображаться здесь только после подключения реального workflow approvals.')}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <DataTable
          columns={columns}
          data={requests}
          searchable
          globalFilter={search}
          onGlobalFilterChange={setSearch}
          searchPlaceholder={t('platform.searchAccessRequests', 'Поиск по запросам, ролям и основаниям...')}
          emptyTitle={t('platform.noAccessRequests', 'Нет активных запросов доступа')}
          emptyDescription={t('platform.noAccessRequestsDesc', 'Когда пользователи начнут запрашивать привилегированный доступ, записи появятся в этой таблице.')}
        />
      </div>
    </div>
  )
}
