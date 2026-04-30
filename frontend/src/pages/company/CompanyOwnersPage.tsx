import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Building2, CheckCircle2, Paperclip, Plus, ShieldAlert, Trash2, TrendingUp, Wallet } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { useUsers } from '@/hooks/useAdmin'
import {
  approveOwnershipTransaction,
  createOwnershipTransaction,
  executeOwnershipTransaction,
  getOrgOwnershipUpdateRequest,
  getOwnershipPolicy,
  listOrgParticipants,
  listOwnershipTransactions,
  platformReviewOwnershipTransaction,
  rejectOwnershipTransaction,
  submitOrgOwnershipUpdateRequest,
  updateOwnershipPolicy,
} from '@/api/orgs'
import type { CompanyParticipant, ModerationDocument, OrgProfileUpdateRequest, OwnershipPolicy, OwnershipTransaction, User } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { AvatarImage } from '@/components/shared/AvatarImage'

const OWNERSHIP_DOCUMENT = {
  type: 'change_basis',
  label: 'Документ-основание на изменение состава участников',
} as const

function createOwnerDraft(): CompanyParticipant {
  return {
    id: crypto.randomUUID(),
    entity_type: 'person',
    display_name: '',
    full_name: '',
    email: '',
    role: 'founder',
    share_percent: 0,
    status: 'pending',
    documents: [],
    is_owner: true,
  }
}

function isOwnershipRole(role?: string) {
  const normalized = String(role || '').toLowerCase()
  return ['founder', 'co-founder', 'co_founder', 'shareholder', 'owner', 'ceo'].includes(normalized)
}

async function fileToModerationDocument(file: File): Promise<ModerationDocument> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
  return {
    id: crypto.randomUUID(),
    file_name: file.name,
    content_type: file.type || 'application/octet-stream',
    size: file.size,
    data_url: dataUrl,
    document_type: OWNERSHIP_DOCUMENT.type,
    document_label: OWNERSHIP_DOCUMENT.label,
  }
}



const DEFAULT_POLICY: OwnershipPolicy = {
  org_id: '',
  min_approvals: 2,
  platform_review_share_threshold: 25,
  allow_external_buyers: true,
  require_documents: true,
  rofr_enabled: false,
  currency_default: 'KZT',
}

export default function CompanyOwnersPage() {
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const activeRole = useOrgStore((s) => s.activeOrgRole())
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const currentUserId = useAuthStore((s) => s.userId)
  const { data: users = [] } = useUsers(orgId)

  const [loading, setLoading] = useState(false)
  const [participants, setParticipants] = useState<CompanyParticipant[]>([])
  const [requestState, setRequestState] = useState<OrgProfileUpdateRequest | null>(null)
  const [requestComment, setRequestComment] = useState('')
  const [documents, setDocuments] = useState<ModerationDocument[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [transactions, setTransactions] = useState<OwnershipTransaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [txSubmitting, setTxSubmitting] = useState(false)
  const [txDocuments, setTxDocuments] = useState<ModerationDocument[]>([])

  const [policy, setPolicy] = useState<OwnershipPolicy>(DEFAULT_POLICY)
  const [policyLoading, setPolicyLoading] = useState(false)
  const [policySaving, setPolicySaving] = useState(false)
  const [txForm, setTxForm] = useState({
    transaction_type: 'transfer' as 'buy' | 'sell' | 'transfer',
    seller_participant_id: '',
    buyer_participant_id: '',
    buyer_user_id: '',
    buyer_email: '',
    share_percent: 0,
    price_amount: 0,
    currency: 'KZT',
    note: '',
  })

  const canManage = activeRole === 'founder' || activeRole === 'ceo'
  const canApprove = activeRole === 'founder' || activeRole === 'ceo' || activeRole === 'admin'

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [{ data: participantRows }, { data: request }] = await Promise.all([
        listOrgParticipants(orgId),
        getOrgOwnershipUpdateRequest(orgId),
      ])
      setParticipants(participantRows)
      setRequestState(request)
      setDocuments((request?.attachments_json ?? []) as ModerationDocument[])
      setRequestComment((request?.payload_json?.comment as string | undefined) || '')
    } catch {
      toast.error('Не удалось загрузить владельцев компании')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const loadPolicy = useCallback(async () => {
    if (!orgId) return
    setPolicyLoading(true)
    try {
      const { data } = await getOwnershipPolicy(orgId)
      setPolicy(data)
      setTxForm((prev) => ({ ...prev, currency: data.currency_default || 'KZT' }))
    } catch {
      setPolicy({ ...DEFAULT_POLICY, org_id: orgId })
    } finally {
      setPolicyLoading(false)
    }
  }, [orgId])

  const loadTransactions = useCallback(async () => {
    if (!orgId) return
    setTxLoading(true)
    try {
      const { data } = await listOwnershipTransactions(orgId)
      setTransactions(data)
    } catch {
      toast.error('Не удалось загрузить сделки по долям')
    } finally {
      setTxLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void load()
    void loadTransactions()
    void loadPolicy()
  }, [load, loadTransactions, loadPolicy])

  const owners = useMemo(
    () => participants.filter((p) => p.status !== 'archived' && (p.is_owner || isOwnershipRole(p.role))),
    [participants],
  )

  const totalShare = useMemo(
    () => owners.reduce((sum, owner) => sum + Number(owner.share_percent || 0), 0),
    [owners],
  )

  const pendingTransactions = useMemo(
    () => transactions.filter((tx) => ['pending_approval', 'approved', 'awaiting_platform_review'].includes(tx.status)),
    [transactions],
  )

  function getUser(participant: CompanyParticipant): User | undefined {
    if (participant.user_id) {
      const byId = users.find((u) => u.id === participant.user_id)
      if (byId) return byId
    }
    if (participant.email) {
      return users.find((u) => (u.email || '').toLowerCase() === participant.email?.toLowerCase())
    }
    return undefined
  }

  function ownerDisplayName(participantId?: string | null) {
    const found = owners.find((owner) => owner.id === participantId)
    if (!found) return 'Unknown owner'
    return found.full_name || found.display_name || found.email || 'Владелец'
  }

  function updateOwner(id: string, patch: Partial<CompanyParticipant>) {
    setParticipants((current) =>
      current.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...patch, is_owner: true }
        const label = next.full_name || next.display_name || next.email || 'Владелец'
        return { ...next, display_name: label }
      }),
    )
  }

  function applyUser(ownerId: string, userId: string) {
    const user = users.find((item) => item.id === userId)
    if (!user) {
      updateOwner(ownerId, { user_id: '', full_name: '', email: '' })
      return
    }
    updateOwner(ownerId, {
      user_id: user.id,
      full_name: user.full_name || '',
      email: user.email || '',
      display_name: user.full_name || user.email || 'Владелец',
      is_owner: true,
    })
  }

  async function handleSavePolicy() {
    if (!orgId) return
    setPolicySaving(true)
    try {
      const { data } = await updateOwnershipPolicy(orgId, {
        min_approvals: Number(policy.min_approvals || 1),
        platform_review_share_threshold: Number(policy.platform_review_share_threshold || 25),
        allow_external_buyers: Boolean(policy.allow_external_buyers),
        require_documents: Boolean(policy.require_documents),
        rofr_enabled: Boolean(policy.rofr_enabled),
        currency_default: (policy.currency_default || 'KZT').toUpperCase(),
      })
      setPolicy(data)
      setTxForm((prev) => ({ ...prev, currency: data.currency_default }))
      toast.success('Политика владения сохранена')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось сохранить policy')
    } finally {
      setPolicySaving(false)
    }
  }

  async function handleSubmitOwners() {
    if (!orgId) return
    if (owners.length === 0) {
      toast.error('Добавьте хотя бы одного владельца')
      return
    }
    if (documents.length === 0) {
      toast.error('Приложите документ-основание')
      return
    }

    setSubmitting(true)
    try {
      const normalized = participants.map((item) => ({
        id: item.id,
        entity_type: 'person',
        user_id: item.user_id || undefined,
        full_name: item.full_name || item.display_name || undefined,
        company_name: undefined,
        email: item.email || undefined,
        iin: undefined,
        bin: undefined,
        role: item.role || 'founder',
        share_percent: Number(item.share_percent || 0),
        status: item.status || 'active',
        appointment_basis: item.appointment_basis || undefined,
        start_date: item.start_date || undefined,
        end_date: item.end_date || undefined,
        documents: item.documents || [],
        is_owner: true,
      }))

      const founder = owners.find((item) => String(item.role).toLowerCase().includes('founder'))
      const ceo = owners.find((item) => String(item.role).toLowerCase() === 'ceo')

      const { data } = await submitOrgOwnershipUpdateRequest(orgId, {
        participants: normalized,
        primary_role: founder ? 'founder' : 'ceo',
        founder_user_id: founder?.user_id || undefined,
        ceo_user_id: ceo?.user_id || undefined,
        comment: requestComment || undefined,
        attachments: documents.map((document) => ({
          id: document.id,
          file_name: document.file_name,
          content_type: document.content_type,
          size: document.size,
          data_url: document.data_url,
          document_type: document.document_type || OWNERSHIP_DOCUMENT.type,
          document_label: document.document_label || OWNERSHIP_DOCUMENT.label,
        })),
      })

      setRequestState(data)
      setDocuments((data.attachments_json ?? []) as ModerationDocument[])
      toast.success('Состав владельцев отправлен на модерацию')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось отправить изменения')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateTransaction() {
    if (!orgId) return
    if (!txForm.seller_participant_id) {
      toast.error('Выберите продавца доли')
      return
    }
    if (!txForm.buyer_participant_id && !txForm.buyer_user_id && !txForm.buyer_email.trim() && txForm.transaction_type !== 'buy') {
      toast.error('Выберите покупателя или укажите почту')
      return
    }
    if (Number(txForm.share_percent) <= 0) {
      toast.error('Укажите долю > 0')
      return
    }

    setTxSubmitting(true)
    try {
      await createOwnershipTransaction(orgId, {
        transaction_type: txForm.transaction_type,
        seller_participant_id: txForm.seller_participant_id,
        buyer_participant_id: txForm.buyer_participant_id || undefined,
        buyer_user_id: txForm.buyer_user_id || undefined,
        buyer_email: txForm.buyer_email.trim() || undefined,
        share_percent: Number(txForm.share_percent),
        price_amount: Number(txForm.price_amount) > 0 ? Number(txForm.price_amount) : undefined,
        currency: txForm.currency || policy.currency_default,
        note: txForm.note || undefined,
        documents: txDocuments.map((document) => ({
          id: document.id,
          file_name: document.file_name,
          content_type: document.content_type,
          size: document.size,
          data_url: document.data_url,
          document_type: document.document_type || OWNERSHIP_DOCUMENT.type,
          document_label: document.document_label || OWNERSHIP_DOCUMENT.label,
        })),
      })
      toast.success('Сделка создана и отправлена на согласование')
      setTxForm({
        transaction_type: 'transfer',
        seller_participant_id: '',
        buyer_participant_id: '',
        buyer_user_id: '',
        buyer_email: '',
        share_percent: 0,
        price_amount: 0,
        currency: policy.currency_default || 'KZT',
        note: '',
      })
      setTxDocuments([])
      await loadTransactions()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось создать сделку')
    } finally {
      setTxSubmitting(false)
    }
  }

  async function handleTxAction(tx: OwnershipTransaction, action: 'approve' | 'reject' | 'execute' | 'platform_approve' | 'platform_reject') {
    if (!orgId) return
    try {
      if (action === 'approve') await approveOwnershipTransaction(orgId, tx.id)
      if (action === 'reject') await rejectOwnershipTransaction(orgId, tx.id)
      if (action === 'execute') await executeOwnershipTransaction(orgId, tx.id)
      if (action === 'platform_approve') await platformReviewOwnershipTransaction(orgId, tx.id, 'approved')
      if (action === 'platform_reject') await platformReviewOwnershipTransaction(orgId, tx.id, 'rejected')
      toast.success('Статус сделки обновлен')
      await Promise.all([loadTransactions(), load()])
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Не удалось обновить статус сделки')
    }
  }

  if (!orgId) {
    return <EmptyState icon={Building2} title="Владельцы" description="Выберите компанию, чтобы увидеть владельцев." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Владельцы"
        description="Карточки владельцев, доли компании и сделки купли/продажи/передачи долей."
        eyebrow="Владение"
        breadcrumbs={[{ label: org?.orgName || 'Компания', to: '/company' }, { label: 'Владельцы' }]}
        badge={<span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">{owners.length} владельцев</span>}
        actions={
          canManage ? (
            <Button onClick={() => setParticipants((current) => [...current, createOwnerDraft()])}>
              <Plus className="mr-1.5 h-4 w-4" />
              Добавить владельца
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard title="Всего владельцев" value={String(owners.length)} icon={Wallet} />
        <MetricCard title="Суммарная доля" value={`${totalShare}%`} icon={TrendingUp} />
        <MetricCard title="Ожидают действий" value={String(pendingTransactions.length)} icon={ShieldAlert} />
        <MetricCard title="Политика" value={policyLoading ? "загрузка" : "активна"} icon={CheckCircle2} />
      </div>


      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold text-foreground">Политика владения</h3>
        <p className="mt-1 text-sm text-muted-foreground">Правила согласования и риск-порогов для сделок долей.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="Минимум согласований">
            <input type="number" min="1" max="5" value={policy.min_approvals} onChange={(e) => setPolicy((prev) => ({ ...prev, min_approvals: Number(e.target.value || 1) }))} className={inputClass} disabled={!canManage} />
          </Field>
          <Field label="Порог проверки платформой, %">
            <input type="number" min="1" max="100" value={policy.platform_review_share_threshold} onChange={(e) => setPolicy((prev) => ({ ...prev, platform_review_share_threshold: Number(e.target.value || 25) }))} className={inputClass} disabled={!canManage} />
          </Field>
          <Field label="Валюта по умолчанию">
            <input value={policy.currency_default} onChange={(e) => setPolicy((prev) => ({ ...prev, currency_default: e.target.value.toUpperCase() }))} className={inputClass} disabled={!canManage} />
          </Field>
          <ToggleField label="Разрешить внешних покупателей" checked={policy.allow_external_buyers} onChange={(checked) => setPolicy((prev) => ({ ...prev, allow_external_buyers: checked }))} disabled={!canManage} />
          <ToggleField label="Требовать документы по сделке" checked={policy.require_documents} onChange={(checked) => setPolicy((prev) => ({ ...prev, require_documents: checked }))} disabled={!canManage} />
          <ToggleField label="Включить преимущественное право выкупа" checked={policy.rofr_enabled} onChange={(checked) => setPolicy((prev) => ({ ...prev, rofr_enabled: checked }))} disabled={!canManage} />
        </div>
        {canManage ? (
          <div className="mt-4">
            <Button onClick={() => void handleSavePolicy()} disabled={policySaving}>{policySaving ? 'Сохранение...' : 'Сохранить политику'}</Button>
          </div>
        ) : null}
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Загрузка владельцев...</div>
      ) : owners.length === 0 ? (
        <EmptyState icon={Wallet} title="Владельцы не добавлены" description="Добавьте владельцев и доли компании." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {owners.map((owner) => {
            const user = getUser(owner)
            const displayName = owner.full_name || owner.display_name || user?.full_name || owner.email || 'Владелец'
            return (
              <article key={owner.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarImage
                      src={user?.avatar_url ?? null}
                      name={displayName}
                      alt={displayName}
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{owner.role || 'владелец'} · {owner.status || 'active'}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-right">
                    <p className="text-[11px] text-primary">Доля</p>
                    <p className="text-sm font-semibold text-primary">{Number(owner.share_percent || 0)}%</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm((prev) => ({ ...prev, transaction_type: 'sell', seller_participant_id: owner.id }))}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground hover:bg-accent"
                  >
                    Продать от этого владельца
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm((prev) => ({ ...prev, transaction_type: 'buy', seller_participant_id: owner.id, buyer_user_id: currentUserId || '' }))}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground hover:bg-accent"
                  >
                    Купить у этого владельца
                  </button>
                </div>

                {canManage && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field label="Пользователь">
                      <select
                        value={owner.user_id || ''}
                        onChange={(e) => applyUser(owner.id, e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Выбрать</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Роль владельца">
                      <select
                        value={owner.role}
                        onChange={(e) => updateOwner(owner.id, { role: e.target.value })}
                        className={selectClass}
                      >
                        <option value="founder">Основатель</option>
                        <option value="co-founder">Сооснователь</option>
                        <option value="shareholder">Акционер</option>
                        <option value="ceo">CEO</option>
                      </select>
                    </Field>
                    <Field label="Доля, %">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={Number(owner.share_percent || 0)}
                        onChange={(e) => updateOwner(owner.id, { share_percent: Number(e.target.value || 0) })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Статус">
                      <select
                        value={owner.status || 'active'}
                        onChange={(e) => updateOwner(owner.id, { status: e.target.value })}
                        className={selectClass}
                      >
                        <option value="active">Активен</option>
                        <option value="pending">На рассмотрении</option>
                        <option value="archived">В архиве</option>
                      </select>
                    </Field>
                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setParticipants((current) => current.filter((item) => item.id !== owner.id))}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Удалить владельца
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold text-foreground">Создать сделку по доле</h3>
        <p className="mt-1 text-sm text-muted-foreground">Покупка / продажа / передача доли между владельцами или внешним покупателем.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="Тип сделки">
            <select value={txForm.transaction_type} onChange={(e) => setTxForm((prev) => ({ ...prev, transaction_type: e.target.value as 'buy' | 'sell' | 'transfer' }))} className={selectClass}>
              <option value="buy">Покупка</option>
              <option value="sell">Продажа</option>
              <option value="transfer">Передача</option>
            </select>
          </Field>
          <Field label="Продавец доли">
            <select value={txForm.seller_participant_id} onChange={(e) => setTxForm((prev) => ({ ...prev, seller_participant_id: e.target.value }))} className={selectClass}>
              <option value="">Выбрать</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.full_name || owner.display_name || owner.email || owner.id}</option>
              ))}
            </select>
          </Field>
          <Field label="Покупатель (владелец)">
            <select value={txForm.buyer_participant_id} onChange={(e) => setTxForm((prev) => ({ ...prev, buyer_participant_id: e.target.value }))} className={selectClass}>
              <option value="">Не выбран</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.full_name || owner.display_name || owner.email || owner.id}</option>
              ))}
            </select>
          </Field>
          <Field label="Покупатель (пользователь)">
            <select value={txForm.buyer_user_id} onChange={(e) => setTxForm((prev) => ({ ...prev, buyer_user_id: e.target.value }))} className={selectClass}>
              <option value="">Не выбран</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
              ))}
            </select>
          </Field>
          <Field label="Покупатель (email внешний)">
            <input value={txForm.buyer_email} onChange={(e) => setTxForm((prev) => ({ ...prev, buyer_email: e.target.value }))} className={inputClass} placeholder="investor@example.com" />
          </Field>
          <Field label="Доля, %">
            <input type="number" min="0" max="100" value={txForm.share_percent} onChange={(e) => setTxForm((prev) => ({ ...prev, share_percent: Number(e.target.value || 0) }))} className={inputClass} />
          </Field>
          <Field label="Сумма сделки">
            <input type="number" min="0" value={txForm.price_amount} onChange={(e) => setTxForm((prev) => ({ ...prev, price_amount: Number(e.target.value || 0) }))} className={inputClass} />
          </Field>
          <Field label="Валюта">
            <input value={txForm.currency} onChange={(e) => setTxForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} className={inputClass} />
          </Field>
          <div className="md:col-span-3">
            <Field label="Комментарий">
              <input value={txForm.note} onChange={(e) => setTxForm((prev) => ({ ...prev, note: e.target.value }))} className={inputClass} placeholder="Комментарий к сделке" />
            </Field>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-border bg-background p-3">
          <p className="text-xs font-medium text-muted-foreground">Документы по этой сделке</p>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent">
            <Paperclip className="h-3.5 w-3.5" />
            Добавить документ по сделке
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const document = await fileToModerationDocument(file)
                  setTxDocuments((current) => [...current, document])
                } catch {
                  toast.error('Не удалось подготовить документ')
                } finally {
                  e.currentTarget.value = ''
                }
              }}
            />
          </label>
          <div className="mt-2 space-y-1">
            {txDocuments.length === 0 ? <p className="text-xs text-muted-foreground">Документы не приложены.</p> : txDocuments.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1 text-xs">
                <span className="truncate text-foreground">{document.file_name}</span>
                <button className="text-red-400" onClick={() => setTxDocuments((prev) => prev.filter((i) => i.id !== document.id))}>Удалить</button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={() => void handleCreateTransaction()} disabled={txSubmitting}>{txSubmitting ? 'Создание...' : 'Создать сделку'}</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold text-foreground">Сделки по долям</h3>
        <p className="mt-1 text-sm text-muted-foreground">Поток согласования, отклонения и исполнения для купли-продажи и передачи долей.</p>

        {txLoading ? (
          <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">Загрузка транзакций...</div>
        ) : transactions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">Сделок пока нет.</div>
        ) : (
          <div className="mt-4 space-y-2">
            {transactions.map((tx) => (
              <article key={tx.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tx.transaction_type.toUpperCase()} · {tx.share_percent}%</p>
                    <p className="text-xs text-muted-foreground">
                      {ownerDisplayName(tx.seller_participant_id)} → {ownerDisplayName(tx.buyer_participant_id)}
                      {tx.buyer_email ? ` (${tx.buyer_email})` : ''}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{tx.status}</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Согласования: {tx.approvals_count}/{tx.approvals_required}</span>
                  {tx.price_amount ? <span>Сумма: {tx.price_amount} {tx.currency}</span> : null}
                  {tx.requires_platform_review ? <span className="text-amber-400">Требуется проверка платформы</span> : null}
                  {tx.risk_flags_json?.length ? <span>Риск-флаги: {tx.risk_flags_json.length}</span> : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {canApprove && tx.status === 'pending_approval' ? (
                    <>
                      <button onClick={() => void handleTxAction(tx, 'approve')} className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20">Согласовать</button>
                      <button onClick={() => void handleTxAction(tx, 'reject')} className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/20">Отклонить</button>
                    </>
                  ) : null}

                  {canApprove && tx.status === 'approved' ? (
                    <button onClick={() => void handleTxAction(tx, 'execute')} className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/20">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Исполнить
                    </button>
                  ) : null}

                  {isSuperAdmin && tx.status === 'awaiting_platform_review' ? (
                    <>
                      <button onClick={() => void handleTxAction(tx, 'platform_approve')} className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-500/20">Согласовать на платформе</button>
                      <button onClick={() => void handleTxAction(tx, 'platform_reject')} className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/20">Отклонить на платформе</button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {canManage && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold text-foreground">Подача изменений по владению</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Добавление совладельцев и смена долей будет проходить через этот модуль с документами-основаниями.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Field label="Комментарий к изменению">
              <input
                value={requestComment}
                onChange={(e) => setRequestComment(e.target.value)}
                className={inputClass}
                placeholder="Например: передача 20% доли новому владельцу"
              />
            </Field>
          </div>

          <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10">
                <Paperclip className="h-4 w-4 text-sky-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{OWNERSHIP_DOCUMENT.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">Этот документ подтверждает изменение состава владельцев и долей.</p>

                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Добавить документ
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const document = await fileToModerationDocument(file)
                        setDocuments((current) => [...current, document])
                      } catch {
                        toast.error('Не удалось подготовить документ')
                      } finally {
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                </label>

                <div className="mt-3 space-y-2">
                  {documents.length > 0 ? documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{document.file_name}</p>
                        <p className="text-xs text-muted-foreground">{document.document_label || OWNERSHIP_DOCUMENT.label}</p>
                      </div>
                      <button type="button" onClick={() => setDocuments((current) => current.filter((item) => item.id !== document.id))} className="text-xs font-medium text-red-500 transition-colors hover:text-red-400">
                        Удалить
                      </button>
                    </div>
                  )) : (
                    <p className="text-xs text-amber-600">Документ ещё не приложен.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void handleSubmitOwners()} disabled={submitting}>
              {submitting ? 'Отправка...' : 'Подать изменение'}
            </Button>
            <Button variant="outline" onClick={() => { void load(); void loadTransactions(); void loadPolicy() }}>
              Обновить
            </Button>
          </div>
        </section>
      )}

      {requestState?.status === 'pending' ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
          Запрос на модерацию изменений владения ожидает рассмотрения: {requestState.id}
        </div>
      ) : null}
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: typeof Building2
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">{title}</p>
      </div>
      <p className="mt-3 text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring'
const selectClass = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring'

function ToggleField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
      />
    </label>
  )
}
