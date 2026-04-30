import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, KeyRound, Loader2, Mail, Shield, UserRoundCheck, UserRoundX, Users } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User } from '@/types'

type ManagePlatformRole = 'superadmin' | 'admin' | 'moderator' | 'support'

type PlatformUser = User & {
  is_active: boolean
  platform_role: string | null
  is_superadmin: boolean
}

type PlatformEmployee = PlatformUser & {
  org_role?: string | null
  company_position?: string | null
}

type PlatformUsersGroup = {
  org_id: string | null
  org_name: string
  employees: PlatformEmployee[]
}

const ASSIGNABLE_ROLES: ManagePlatformRole[] = ['superadmin', 'admin', 'moderator', 'support']

const ROLE_LABELS: Record<ManagePlatformRole | 'none', string> = {
  superadmin: 'Суперадмин',
  admin: 'Админ',
  moderator: 'Модератор',
  support: 'Поддержка',
  none: 'Без роли',
}

const ROLE_COLOR: Record<ManagePlatformRole | 'none', string> = {
  superadmin: 'bg-blue-500/10 text-blue-600',
  admin: 'bg-indigo-500/10 text-indigo-600',
  moderator: 'bg-amber-500/10 text-amber-600',
  support: 'bg-cyan-500/10 text-cyan-600',
  none: 'bg-muted text-muted-foreground',
}

function normalizeRole(value: string | null | undefined): ManagePlatformRole | 'none' {
  const raw = (value || '').trim().toLowerCase()
  if (raw === 'tech_support') return 'support'
  if (raw === 'superadmin' || raw === 'admin' || raw === 'moderator' || raw === 'support') return raw
  return 'none'
}

export default function PlatformUsersPage() {
  const { t } = useTranslation()
  const currentUserId = useAuthStore((s) => s.userId)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)

  const [groups, setGroups] = useState<PlatformUsersGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const [passwordVerified, setPasswordVerified] = useState(false)
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)

  const needsPasswordGate = isSuperAdmin || platformRole === 'admin'

  const flatEmployees = useMemo(() => groups.flatMap((group) => group.employees), [groups])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<PlatformUsersGroup[]>('/platform/users')
      setGroups(res.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось загрузить пользователей платформы')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const roleCounts = useMemo(() => {
    return flatEmployees.reduce<Record<string, number>>((acc, user) => {
      const role = normalizeRole(user.platform_role)
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {})
  }, [flatEmployees])

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups
      .map((group) => {
        const employees = group.employees.filter((user) => {
          const role = normalizeRole(user.platform_role)
          const byRole = roleFilter === 'all' || role === roleFilter
          const bySearch =
            !q ||
            group.org_name.toLowerCase().includes(q) ||
            (user.full_name || '').toLowerCase().includes(q) ||
            (user.email || '').toLowerCase().includes(q) ||
            (user.company_position || user.position || '').toLowerCase().includes(q) ||
            (user.org_role || '').toLowerCase().includes(q)
          return byRole && bySearch
        })
        return { ...group, employees }
      })
      .filter((group) => group.employees.length > 0)
  }, [groups, roleFilter, search])

  async function verifyPassword() {
    if (!password.trim()) {
      toast.error('Введите пароль')
      return
    }
    setVerifying(true)
    try {
      await api.post('/platform/verify-password', { password })
      setPasswordVerified(true)
      setPassword('')
      toast.success('Доступ подтверждён')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Пароль неверный')
    } finally {
      setVerifying(false)
    }
  }

  async function assignRole(user: PlatformEmployee, role: ManagePlatformRole) {
    setBusyUserId(user.id)
    try {
      await api.patch(`/platform/users/${user.id}/platform-role`, { role })
      await loadUsers()
      toast.success(`Роль назначена: ${ROLE_LABELS[role]}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось назначить роль')
    } finally {
      setBusyUserId(null)
    }
  }

  async function removeRole(user: PlatformEmployee) {
    setBusyUserId(user.id)
    try {
      await api.delete(`/platform/users/${user.id}/platform-role`)
      await loadUsers()
      toast.success('Роль снята')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось снять роль')
    } finally {
      setBusyUserId(null)
    }
  }

  async function toggleBan(user: PlatformEmployee) {
    setBusyUserId(user.id)
    try {
      const banned = !!user.is_active
      await api.post(`/platform/users/${user.id}/ban`, { banned })
      await loadUsers()
      toast.success(banned ? 'Пользователь забанен' : 'Пользователь разблокирован')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось изменить статус блокировки')
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.platformUsers', 'Пользователи')}
        description="Сотрудники сгруппированы по компаниям. Доступны действия: назначить/снять платформенную роль и бан."
        eyebrow={t('users.platformAccess', 'Platform Access')}
        badge={
          <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            {flatEmployees.length} сотрудников
          </span>
        }
      />

      <div className="flex flex-wrap gap-2">
        <RoleChip active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
          Все ({flatEmployees.length})
        </RoleChip>
        {(['superadmin', 'admin', 'moderator', 'support', 'none'] as const).map((role) => (
          <RoleChip key={role} active={roleFilter === role} onClick={() => setRoleFilter(role)}>
            {ROLE_LABELS[role]} ({roleCounts[role] || 0})
          </RoleChip>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по компании, ФИО, email, должности..."
          className="mb-4"
        />

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-lg border border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
            Нет сотрудников под текущие фильтры.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map((group) => (
              <section key={group.org_id || 'unassigned'} className="rounded-lg border border-border bg-background p-4">
                <h3 className="text-sm font-semibold text-foreground">{group.org_name}</h3>
                <ol className="mt-3 space-y-3">
                  {group.employees.map((user, index) => {
                    const isSelf = user.id === currentUserId
                    const busy = busyUserId === user.id
                    const platformRoleName = user.is_superadmin ? 'superadmin' : normalizeRole(user.platform_role)
                    const positionText = user.company_position || user.position || 'должность не указана'
                    return (
                      <li key={`${group.org_id || 'none'}:${user.id}`} className="rounded-md border border-border bg-card p-3">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="pt-2 text-xs font-semibold text-muted-foreground">{index + 1}</div>
                            <UserAvatar name={user.full_name} src={user.avatar_url} size="md" status={user.is_active ? 'online' : 'offline'} />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{user.full_name || 'Без имени'}</p>
                              <p className="text-xs text-muted-foreground">
                                {positionText} {user.org_role ? `• ${user.org_role}` : ''}
                              </p>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{user.email}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${ROLE_COLOR[platformRoleName]}`}>
                                  <Shield className="h-3 w-3" />
                                  {ROLE_LABELS[platformRoleName]}
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${user.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                  {user.is_active ? <UserRoundCheck className="h-3 w-3" /> : <UserRoundX className="h-3 w-3" />}
                                  {user.is_active ? 'Активен' : 'Забанен'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              disabled={busy || isSelf}
                              defaultValue=""
                              onChange={(event) => {
                                const role = event.target.value as ManagePlatformRole
                                if (!role) return
                                void assignRole(user, role)
                                event.currentTarget.value = ''
                              }}
                              className="h-9 min-w-[170px] rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-ring focus:outline-none disabled:opacity-50"
                            >
                              <option value="">Назначить роль...</option>
                              {ASSIGNABLE_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy || isSelf || normalizeRole(user.platform_role) === 'none'}
                              onClick={() => void removeRole(user)}
                            >
                              Снять роль
                            </Button>
                            <Button
                              variant={user.is_active ? 'destructive' : 'outline'}
                              size="sm"
                              disabled={busy || isSelf}
                              onClick={() => void toggleBan(user)}
                            >
                              <Ban className="mr-1.5 h-3.5 w-3.5" />
                              {user.is_active ? 'Забанить' : 'Разбанить'}
                            </Button>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>

      {needsPasswordGate && !passwordVerified ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-foreground">
              <KeyRound className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Подтверждение доступа</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Для входа в раздел управления пользователями подтвердите пароль от текущего аккаунта.
            </p>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void verifyPassword()
              }}
              autoFocus
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={() => void verifyPassword()} disabled={verifying}>
                {verifying ? 'Проверка...' : 'Подтвердить'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function RoleChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
