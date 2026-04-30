import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  RefreshCw,
  Server,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'

type ServiceStatus = 'ok' | 'degraded' | 'down'

interface ServiceInfo {
  name: string
  status: ServiceStatus
  responseTime?: string
  uptime?: string
  lastChecked: string
}

const services: ServiceInfo[] = []

export default function PlatformHealthPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const columns: ColumnDef<ServiceInfo>[] = [
    {
      accessorKey: 'name',
      header: t('health.service', 'Service'),
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">Проверено в {row.original.lastChecked}</p>
        </div>
      ),
    },
    {
      accessorKey: 'responseTime',
      header: 'Задержка',
    },
    {
      accessorKey: 'uptime',
      header: 'Доступность',
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => (
        <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">
          {row.original.status}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.platformHealth')}
        description="Состояние платформенных сервисов и инфраструктуры будет отображаться здесь после подключения реального мониторинга."
        eyebrow="Платформа"
        breadcrumbs={[
          { label: t('shell.platform'), to: '/platform' },
          { label: t('nav.platformHealth') },
        ]}
        actions={
          <Button variant="outline">
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Обновить
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card p-4">
        <DataTable
          columns={columns}
          data={services}
          searchable
          globalFilter={search}
          onGlobalFilterChange={setSearch}
          searchPlaceholder="Поиск по сервисам платформы..."
          emptyTitle="Мониторинг пока не подключён"
          emptyDescription="Как только появится реальный источник инфраструктурных метрик, сервисы и их статус будут показаны здесь без демо-показателей."
          emptyIcon={Server}
        />
      </div>
    </div>
  )
}
