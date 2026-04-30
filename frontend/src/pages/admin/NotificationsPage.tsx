import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Bell, BellDot, CheckCheck, Link, Plus, Webhook } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import {
  listNotificationHooks,
  createNotificationHook,
  deleteNotificationHook,
  getNotificationFeed,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/api/notifications'
import type { NotificationFeedItem, NotificationHook } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface HookRow {
  id: string
  url: string
  event_type: string
  status: string
}

function parseHook(row: NotificationHook): HookRow {
  return {
    id: String(row.id ?? ''),
    url: String(row.url ?? ''),
    event_type: String(row.event_type ?? row.event ?? 'unknown'),
    status: String(row.status ?? 'active').toLowerCase(),
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const [hooks, setHooks] = useState<HookRow[]>([])
  const [feedItems, setFeedItems] = useState<NotificationFeedItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [feedLoading, setFeedLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [event, setEvent] = useState('report_export_ready')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [feedSearch, setFeedSearch] = useState('')
  const [feedScope, setFeedScope] = useState<'all' | 'unread'>('all')

  const loadHooks = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const response = await listNotificationHooks(orgId)
      setHooks(response.data.map(parseHook))
    } catch {
      toast.error(t('admin.hooksLoadError'))
    } finally {
      setLoading(false)
    }
  }, [orgId, t])

  const loadFeed = useCallback(async () => {
    setFeedLoading(true)
    try {
      const response = await getNotificationFeed(80)
      setFeedItems(response.data.items ?? [])
      setUnreadCount(Number(response.data.unread_count ?? 0))
    } catch {
      setFeedItems([])
      setUnreadCount(0)
      toast.error('Не удалось загрузить ленту уведомлений')
    } finally {
      setFeedLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.all([loadHooks(), loadFeed()])
  }, [loadFeed, loadHooks])

  async function handleCreate() {
    if (!orgId || !url.trim()) return
    setCreating(true)
    try {
      await createNotificationHook(orgId, { url: url.trim(), event_type: event })
      setUrl('')
      setShowCreate(false)
      toast.success(t('admin.hookCreated'))
      await loadHooks()
    } catch {
      toast.error(t('admin.hookCreateError'))
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!orgId) return
    try {
      await deleteNotificationHook(orgId, id)
      toast.success(t('admin.hookDeleted'))
      await loadHooks()
    } catch {
      toast.error(t('admin.hookDeleteError'))
    }
  }

  async function handleRead(id: string) {
    try {
      await markNotificationRead(id)
      await loadFeed()
    } catch {
      toast.error('Не удалось отметить уведомление как прочитанное')
    }
  }

  async function handleReadAll() {
    try {
      await markAllNotificationsRead()
      toast.success('Все уведомления отмечены как прочитанные')
      await loadFeed()
    } catch {
      toast.error('Не удалось отметить все уведомления')
    }
  }

  const filteredHooks = useMemo<HookRow[]>(() => {
    const query = search.trim().toLowerCase()
    if (!query) return hooks
    return hooks.filter((hook) =>
      [hook.url, hook.event_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [hooks, search])

  const filteredFeed = useMemo(() => {
    const query = feedSearch.trim().toLowerCase()
    return feedItems.filter((item) => {
      const scopeOk = feedScope === 'all' || !item.is_read
      if (!scopeOk) return false
      if (!query) return true
      const haystack = `${item.title} ${item.body ?? ''} ${item.type}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [feedItems, feedScope, feedSearch])

  const columns = useMemo<ColumnDef<HookRow>[]>(
    () => [
      {
        id: 'url',
        header: 'Webhook',
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="truncate font-medium text-foreground">{String(row.original.url ?? '—')}</p>
            <p className="text-xs text-muted-foreground">Outbound company event delivery</p>
          </div>
        ),
      },
      {
        id: 'event',
        header: 'Event',
        cell: ({ row }) => (
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {String(row.original.event_type ?? '—')}
            </span>
        ),
      },
      {
        id: 'state',
        header: 'Status',
        cell: ({ row }) => {
          const isActive = row.original.status !== 'disabled'
          return (
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              {isActive ? 'Active' : 'Disabled'}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => void handleDelete(String(row.original.id))}>
            Delete
          </Button>
        ),
      },
    ],
    [],
  )

  if (!orgId) {
    return (
      <div className="page-enter">
        <PageHeader
          title={t('admin.notificationHooks')}
          description={t('admin.noOrg')}
          breadcrumbs={[{ label: t('settings.title') }]}
        />
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={t('admin.notificationHooks')}
        description="Центр уведомлений компании: лента в приложении и доставка через webhook."
        eyebrow="Company settings"
        breadcrumbs={[
          { label: org?.orgName ?? t('shell.company'), to: '/company' },
          { label: t('settings.title'), to: '/company/settings' },
          { label: t('admin.notificationHooks') },
        ]}
        badge={
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
            <BellDot className="h-3.5 w-3.5" />
            {unreadCount} unread
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void handleReadAll()} disabled={feedLoading || unreadCount === 0}>
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Read all
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('admin.createHook')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-sm font-semibold text-foreground">Лента уведомлений</h3>
            <div className="flex flex-wrap gap-2">
              {(['all', 'unread'] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setFeedScope(scope)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${feedScope === scope ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                >
                  {scope === 'all' ? `Все (${feedItems.length})` : `Непрочитанные (${unreadCount})`}
                </button>
              ))}
            </div>
          </div>
          <input
            value={feedSearch}
            onChange={(event) => setFeedSearch(event.target.value)}
            placeholder="Search notifications..."
            className="mb-3 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          {feedLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Загрузка уведомлений...</div>
          ) : filteredFeed.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Нет уведомлений"
              description={feedScope === 'unread' ? 'Все сообщения уже прочитаны.' : 'События появятся после действий в компании.'}
            />
          ) : (
            <div className="space-y-2">
              {filteredFeed.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border p-3 ${item.is_read ? 'border-border bg-background' : 'border-primary/20 bg-primary/5'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.body || 'Без дополнительного описания'}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(item.created_at)} · {item.type}</p>
                    </div>
                    {!item.is_read ? (
                      <Button size="sm" variant="outline" onClick={() => void handleRead(item.id)}>
                        Прочитано
                      </Button>
                    ) : null}
                  </div>
                  {item.link_url ? (
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      href={item.link_url}
                    >
                      <Link className="h-3.5 w-3.5" />
                      Открыть объект
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <DataTable
            columns={columns}
            data={filteredHooks}
            loading={loading}
            searchable
            globalFilter={search}
            onGlobalFilterChange={setSearch}
            searchPlaceholder="Search webhooks and event types..."
            emptyIcon={Webhook}
            emptyTitle="No notification hooks"
            emptyDescription="Create a webhook to push company events into external systems."
          />
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.createHook')}</DialogTitle>
            <DialogDescription>
              Register a webhook endpoint to receive company event notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormField label={t('admin.hookUrl')} required error={!url.trim() ? 'Webhook URL is required' : undefined}>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/hooks/company"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
            </FormField>

            <FormField label={t('admin.event')}>
              <select
                value={event}
                onChange={(event) => setEvent(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              >
                <option value="report_export_ready">report_export_ready</option>
                <option value="approval_created">approval_created</option>
                <option value="audit_event_created">audit_event_created</option>
              </select>
            </FormField>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating || !url.trim()}>
              {creating ? t('common.saving') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
