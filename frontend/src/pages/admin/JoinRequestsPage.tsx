import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Check, Copy, Hash, Link2, Loader2, UserPlus, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { listJoinRequests, approveJoinRequest, rejectJoinRequest, createOrgInvitation, listOrgInvitations } from '@/api/orgs'
import type { JoinRequest, OrgInvitation } from '@/types'
import { useOrg } from '@/hooks/useOrg'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'

export default function JoinRequestsPage() {
  const { t } = useTranslation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const activeRole = useOrgStore((s) => s.activeOrgRole())
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const { data: orgDetail } = useOrg(orgId)
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [invitations, setInvitations] = useState<OrgInvitation[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selectedRequestId, setSelectedRequestId] = useState<string>('')
  const [decisionReason, setDecisionReason] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteHours, setInviteHours] = useState(72)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  async function copyText(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }

  function handleCopyJoinCode() {
    const code = orgDetail?.join_code
    if (!code) return
    void copyText(code).then(() => {
      setCodeCopied(true)
      toast.success('Код приглашения скопирован')
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  const canViewJoinRequests = isSuperAdmin || ['founder', 'ceo'].includes(activeRole ?? '')
  const canViewInvites = isSuperAdmin || ['founder', 'ceo', 'hr', 'admin'].includes(activeRole ?? '')

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [requestsResponse, invitationsResponse] = await Promise.all([
        canViewJoinRequests ? listJoinRequests(orgId) : Promise.resolve({ data: [] }),
        canViewInvites ? listOrgInvitations(orgId) : Promise.resolve({ data: [] }),
      ])
      setRequests(requestsResponse.data)
      setInvitations(invitationsResponse.data)
    } catch {
      toast.error(`${t('admin.joinRequests')}: load error`)
    } finally {
      setLoading(false)
    }
  }, [canViewInvites, canViewJoinRequests, orgId, t])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase()
    return requests.filter((item) => {
      const statusOk = statusFilter === 'all' || item.status === statusFilter
      if (!statusOk) return false
      if (!query) return true
      const haystack = [
        item.user_full_name || '',
        item.user_email || '',
        item.status,
        item.org_name || '',
        item.comment || '',
      ].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [requests, search, statusFilter])

  useEffect(() => {
    if (selectedRequestId && filteredRequests.some((item) => item.id === selectedRequestId)) return
    setSelectedRequestId(filteredRequests[0]?.id ?? '')
  }, [filteredRequests, selectedRequestId])

  const selectedRequest = useMemo(
    () => requests.find((item) => item.id === selectedRequestId) || null,
    [requests, selectedRequestId],
  )

  async function handleApprove(id: string) {
    if (!orgId) return
    setActionLoadingId(id)
    try {
      await approveJoinRequest(orgId, id)
      toast.success(t('admin.approveSuccess', 'Заявка одобрена'))
      setDecisionReason('')
      await load()
    } catch {
      toast.error(t('admin.approveError', 'Не удалось одобрить заявку'))
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleReject(id: string) {
    if (!orgId) return
    setActionLoadingId(id)
    try {
      await rejectJoinRequest(orgId, id, decisionReason.trim() || undefined)
      toast.success(t('admin.rejectSuccess', 'Заявка отклонена'))
      setDecisionReason('')
      await load()
    } catch {
      toast.error(t('admin.rejectError', 'Не удалось отклонить заявку'))
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleCreateInvite() {
    if (!orgId) return
    setCreatingInvite(true)
    try {
      const response = await createOrgInvitation(orgId, {
        email: inviteEmail.trim() || undefined,
        role: inviteRole,
        expires_in_hours: inviteHours,
      })
      const absoluteUrl = `${window.location.origin}${response.data.invite_url}`
      await copyText(absoluteUrl)
      toast.success('Ссылка приглашения создана и скопирована')
      setInviteEmail('')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать приглашение')
    } finally {
      setCreatingInvite(false)
    }
  }

  if (!orgId) {
    return (
      <EmptyState
        icon={UserPlus}
        title={t('admin.joinRequests')}
        description={t('admin.noOrg')}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin.joinRequests')}
        description="Review queue заявок на вступление: кто подал, что запросил, какое решение принято."
        eyebrow="Access requests"
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('admin.joinRequests') },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={UserPlus} label="Pending" value={requests.filter((item) => item.status === 'pending').length} />
        <StatCard icon={Check} label="Approved" value={requests.filter((item) => item.status === 'approved').length} />
        <StatCard icon={X} label="Rejected" value={requests.filter((item) => item.status === 'rejected').length} />
        <StatCard icon={Link2} label="Active invites" value={invitations.filter((item) => item.status === 'active').length} />
      </div>

      {orgDetail?.join_code && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Join code</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">{orgDetail.join_code}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Используется сотрудниками для подачи запроса на вступление</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyJoinCode}>
              {codeCopied ? <Check className="mr-1.5 h-4 w-4 text-emerald-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {codeCopied ? 'Скопировано' : 'Копировать'}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Email сотрудника</span>
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="optional@company.com" className="h-10 w-full rounded-lg border border-border bg-background px-3" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Роль</span>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3">
                <option value="member">member</option>
                <option value="hr">hr</option>
                <option value="employee">employee</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Срок действия (часы)</span>
              <input type="number" min={1} max={168} value={inviteHours} onChange={(e) => setInviteHours(Number(e.target.value) || 72)} className="h-10 w-full rounded-lg border border-border bg-background px-3" />
            </label>
          </div>
          <Button onClick={handleCreateInvite} disabled={creatingInvite}>
            {creatingInvite ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Link2 className="mr-1 h-4 w-4" />}
            Создать invite-ссылку
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="space-y-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск заявителя"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${statusFilter === status ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : filteredRequests.length === 0 ? (
              <EmptyState icon={UserPlus} title="Нет заявок" description="Попробуйте изменить фильтр." />
            ) : filteredRequests.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedRequestId(item.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedRequestId === item.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-accent'}`}
              >
                <p className="truncate text-sm font-medium text-foreground">{item.user_full_name || 'Пользователь'}</p>
                <p className="truncate text-xs text-muted-foreground">{item.user_email || item.user_id}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusBadge variant={item.status === 'pending' ? 'warning' : item.status === 'approved' ? 'success' : 'error'}>
                    {item.status}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          {!selectedRequest ? (
            <EmptyState icon={UserPlus} title="Выберите заявку" description="Слева отображается очередь на согласование." />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">Детали заявки</h3>
                <StatusBadge variant={selectedRequest.status === 'pending' ? 'warning' : selectedRequest.status === 'approved' ? 'success' : 'error'}>
                  {selectedRequest.status}
                </StatusBadge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard label="Заявитель" value={selectedRequest.user_full_name || 'Не указано'} />
                <DetailCard label="Email" value={selectedRequest.user_email || selectedRequest.user_id} mono />
                <DetailCard label="Подано" value={new Date(selectedRequest.created_at).toLocaleString('ru-RU')} />
                <DetailCard label="Обработал" value={selectedRequest.reviewed_by_name || selectedRequest.reviewed_by_email || 'Не обработано'} />
              </div>

              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Комментарий заявителя</p>
                <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{selectedRequest.comment || 'Комментарий не указан'}</p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Панель действий</h3>
          {!selectedRequest ? (
            <p className="mt-3 text-sm text-muted-foreground">Выберите заявку из очереди слева.</p>
          ) : selectedRequest.status !== 'pending' ? (
            <p className="mt-3 text-sm text-muted-foreground">Для завершённых заявок доступны только просмотр и аудит.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Комментарий решения (необязательно)</span>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Причина отклонения или служебная заметка"
                  className="min-h-[96px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void handleApprove(selectedRequest.id)}
                disabled={actionLoadingId === selectedRequest.id}
              >
                {actionLoadingId === selectedRequest.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Approve
              </Button>
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => void handleReject(selectedRequest.id)}
                disabled={actionLoadingId === selectedRequest.id}
              >
                {actionLoadingId === selectedRequest.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                Reject
              </Button>
            </div>
          )}

          {invitations.length > 0 ? (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Последние invite-ссылки</p>
              <div className="mt-2 space-y-2">
                {invitations.slice(0, 3).map((invite) => {
                  const inviteUrl = `${window.location.origin}${invite.invite_url}`
                  return (
                    <div key={invite.id} className="rounded-lg border border-border bg-background p-2">
                      <p className="truncate text-xs text-foreground">{invite.email || 'Open invite'} · {invite.role}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{inviteUrl}</p>
                      <button type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl)} className="mt-1 text-xs text-primary hover:underline">
                        Копировать
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

function DetailCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
