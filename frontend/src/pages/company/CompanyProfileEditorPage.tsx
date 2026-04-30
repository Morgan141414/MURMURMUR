import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Building2, Clock3, FileDiff, Save } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useOrg } from '@/hooks/useOrg'
import { getOrgProfileUpdateRequest, submitOrgProfileUpdateRequest } from '@/api/orgs'
import type { OrgProfileUpdateRequest } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'

type FormState = {
  name: string
  description: string
  industry: string
  website: string
  city: string
  logo_url: string
  is_private_profile: boolean
  theme_color: string
  welcome_message: string
}

function toFormState(source?: Partial<FormState> | null): FormState {
  return {
    name: source?.name ?? '',
    description: source?.description ?? '',
    industry: source?.industry ?? '',
    website: source?.website ?? '',
    city: source?.city ?? '',
    logo_url: source?.logo_url ?? '',
    is_private_profile: Boolean(source?.is_private_profile),
    theme_color: source?.theme_color ?? '',
    welcome_message: source?.welcome_message ?? '',
  }
}

function statusLabel(status?: string): string {
  if (!status) return 'Нет заявки'
  if (status === 'pending') return 'На проверке'
  if (status === 'approved') return 'Одобрено'
  if (status === 'rejected') return 'Отклонено'
  if (status === 'revision') return 'Нужны правки'
  if (status === 'draft') return 'Черновик'
  return status
}

export default function CompanyProfileEditorPage() {
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const role = useOrgStore((s) => s.activeOrgRole())
  const { data: orgDetail } = useOrg(orgId)

  const [editMode, setEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingRequest, setLoadingRequest] = useState(false)
  const [request, setRequest] = useState<OrgProfileUpdateRequest | null>(null)
  const [form, setForm] = useState<FormState>(() => toFormState())
  const [draft, setDraft] = useState<FormState>(() => toFormState())

  const canEdit = role === 'founder' || role === 'ceo' || role === 'admin'
  const orgDetailAny = orgDetail as any

  useEffect(() => {
    if (!orgDetail) return
    const next = toFormState({
      name: orgDetail.name,
      description: orgDetail.description ?? '',
      industry: orgDetail.industry ?? '',
      website: orgDetail.website ?? '',
      city: orgDetailAny?.city ?? '',
      logo_url: orgDetail.logo_url ?? '',
      is_private_profile: Boolean(orgDetailAny?.is_private_profile),
      theme_color: orgDetail.theme_color ?? '',
      welcome_message: orgDetail.welcome_message ?? '',
    })
    setForm(next)
    setDraft(next)
  }, [orgDetail])

  useEffect(() => {
    if (!orgId) return
    setLoadingRequest(true)
    getOrgProfileUpdateRequest(orgId)
      .then(({ data }) => {
        setRequest(data)
        if (data?.payload_json) {
          const payload = data.payload_json as Partial<FormState>
          setDraft((prev) => ({ ...prev, ...toFormState(payload) }))
        }
      })
      .catch(() => setRequest(null))
      .finally(() => setLoadingRequest(false))
  }, [orgId])

  const changes = useMemo(() => {
    const labels: Record<keyof FormState, string> = {
      name: 'Название компании',
      description: 'Описание',
      industry: 'Отрасль',
      website: 'Сайт',
      city: 'Город',
      logo_url: 'Ссылка на логотип',
      is_private_profile: 'Приватность компании',
      theme_color: 'Цвет темы',
      welcome_message: 'Приветственное сообщение',
    }
    const keys = Object.keys(form) as Array<keyof FormState>
    return keys
      .filter((key) => {
        if (typeof form[key] === 'boolean' || typeof draft[key] === 'boolean') {
          return Boolean(form[key]) !== Boolean(draft[key])
        }
        return String(form[key] || '').trim() !== String(draft[key] || '').trim()
      })
      .map((key) => ({
        key,
        label: labels[key],
        oldValue: typeof form[key] === 'boolean' ? (form[key] ? 'Да' : 'Нет') : (form[key] || '—'),
        newValue: typeof draft[key] === 'boolean' ? (draft[key] ? 'Да' : 'Нет') : (draft[key] || '—'),
      }))
  }, [draft, form])

  async function handleSubmit() {
    if (!orgId) return
    setSubmitting(true)
    try {
      const body = Object.fromEntries(
        (Object.keys(draft) as Array<keyof FormState>).map((key) => {
          const value = draft[key]
          if (typeof value === 'boolean') return [key, value]
          return [key, value.trim() || undefined]
        }),
      )
      const { data } = await submitOrgProfileUpdateRequest(orgId, body)
      setRequest(data as OrgProfileUpdateRequest)
      setEditMode(false)
      toast.success('Изменения отправлены на модерацию')
    } catch (error: any) {
      const detail = String(error?.response?.data?.detail || '').trim()
      const normalized = detail.toLowerCase()
      if (normalized.includes('no changes detected')) {
        toast.error('Нет изменений для отправки на модерацию')
      } else {
        toast.error(detail || 'Не удалось отправить запрос')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!orgId) {
    return (
      <EmptyState
        icon={Building2}
        title="Карточка компании"
        description="Выберите активную компанию для редактирования профиля."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Карточка компании"
        description="Редактируйте профиль компании с контролируемым процессом: черновик → модерация → решение."
        eyebrow="Настройки компании"
        breadcrumbs={[
          { label: org?.orgName ?? 'Компания', to: '/company' },
          { label: 'Карточка компании' },
        ]}
        badge={
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {statusLabel(request?.status)}
          </span>
        }
        actions={canEdit ? (
          <>
            <Button variant="outline" onClick={() => { setDraft(form); setEditMode(false) }}>
              Сбросить
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditMode(true)
                setDraft((prev) => ({ ...prev, is_private_profile: !prev.is_private_profile }))
              }}
            >
              {draft.is_private_profile ? 'Сделать публичной' : 'Сделать приватной'}
            </Button>
            <Button variant="outline" onClick={() => setEditMode((current) => !current)}>
              {editMode ? 'Режим просмотра' : 'Режим редактирования'}
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={!editMode || submitting || changes.length === 0}>
              <Save className="mr-1.5 h-4 w-4" />
              Отправить на модерацию
            </Button>
          </>
        ) : undefined}
      />

      {loadingRequest ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Загрузка актуальной заявки на изменение...</div>
      ) : null}

      {request?.comment ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          <p className="font-semibold">Комментарий модератора</p>
          <p className="mt-1">{request.comment}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Основная информация">
          <EditorField label="Название компании" value={draft.name} disabled={!editMode || !canEdit} onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))} />
          <EditorField label="Описание" value={draft.description} disabled={!editMode || !canEdit} onChange={(value) => setDraft((prev) => ({ ...prev, description: value }))} multiline />
          <EditorField label="Отрасль" value={draft.industry} disabled={!editMode || !canEdit} onChange={(value) => setDraft((prev) => ({ ...prev, industry: value }))} />
        </Section>

        <Section title="Контакты и бренд">
          <EditorField label="Сайт" value={draft.website} disabled={!editMode || !canEdit} onChange={(value) => setDraft((prev) => ({ ...prev, website: value }))} />
          <EditorField label="Город" value={draft.city} disabled={!editMode || !canEdit} onChange={(value) => setDraft((prev) => ({ ...prev, city: value }))} />
          <EditorField label="Ссылка на логотип" value={draft.logo_url} disabled={!editMode || !canEdit} onChange={(value) => setDraft((prev) => ({ ...prev, logo_url: value }))} />
          <EditorSwitch
            label="Сделать профиль компании приватным"
            checked={draft.is_private_profile}
            disabled={!editMode || !canEdit}
            onChange={(value) => setDraft((prev) => ({ ...prev, is_private_profile: value }))}
          />
          <EditorField label="Цвет темы" value={draft.theme_color} disabled={!editMode || !canEdit} onChange={(value) => setDraft((prev) => ({ ...prev, theme_color: value }))} />
          <EditorField label="Приветственное сообщение" value={draft.welcome_message} disabled={!editMode || !canEdit} onChange={(value) => setDraft((prev) => ({ ...prev, welcome_message: value }))} multiline />
        </Section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <FileDiff className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Предпросмотр изменений (было → стало)</h3>
        </div>
        {changes.length === 0 ? (
          <EmptyState icon={FileDiff} title="Нет изменений" description="Измените поля в режиме редактирования, чтобы увидеть разницу перед отправкой." />
        ) : (
          <div className="space-y-2">
            {changes.map((change) => (
              <div key={change.key} className="grid gap-2 rounded-xl border border-border bg-background p-3 md:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{change.label} (было)</p>
                  <p className="mt-1 text-sm text-foreground">{change.oldValue}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{change.label} (стало)</p>
                  <p className="mt-1 text-sm text-foreground">{change.newValue}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function EditorField({
  label,
  value,
  disabled,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  disabled: boolean
  onChange: (next: string) => void
  multiline?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring disabled:opacity-70"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring disabled:opacity-70"
        />
      )}
    </label>
  )
}

function EditorSwitch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-60"
      />
    </label>
  )
}
