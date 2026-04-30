import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, Users } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { listUsers } from '@/api/users'
import type { User } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'

export default function UsersPage() {
  const { t } = useTranslation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const response = await listUsers(orgId)
      setUsers(response.data)
    } catch {
      toast.error(t('admin.usersLoadError'))
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: t('admin.usersColumnUser'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={row.original.full_name} size="md" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">{row.original.full_name}</p>
              <p className="text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: t('admin.usersColumnEmail'),
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
      },
      {
        accessorKey: 'org_role',
        header: t('admin.usersColumnRole'),
        cell: ({ row }) => (
          <StatusBadge
            variant={
              row.original.org_role === 'founder' || row.original.org_role === 'ceo'
                ? 'error'
                : row.original.org_role === 'team_lead' || row.original.org_role === 'project_manager'
                  ? 'warning'
                  : 'info'
            }
          >
            {row.original.org_role ?? t('admin.roleMember')}
          </StatusBadge>
        ),
      },
    ],
    [t],
  )

  if (!orgId) {
    return (
      <EmptyState
        icon={Users}
        title={t('admin.usersTab')}
        description={t('admin.noOrg')}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin.usersTab')}
        description={t('admin.usersDesc')}
        eyebrow={t('admin.sectionLabel', 'Admin')}
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('admin.usersTab') },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label={t('admin.members')} value={users.length} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title={t('admin.usersEmptyTitle')} description={t('admin.usersEmptyDesc')} />
        ) : (
          <DataTable
            columns={columns}
            data={users}
            searchable
            globalFilter={search}
            onGlobalFilterChange={setSearch}
            searchPlaceholder="Search users by name, email, role..."
          />
        )}
      </div>
    </div>
  )
}
