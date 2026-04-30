import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  BarChart3, Edit3, Eye, EyeOff, FileText, Loader2, Megaphone, Plus,
  Search, Send, Trash2, TrendingUp, Users, X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import api from '@/api/client'

// ── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string
  name: string
  type: string
  status: string
  reach: number
  clicks: number
  conversions: number
  created_at: string
  started_at?: string
}

interface MarketingStats {
  total_campaigns: number
  active_campaigns: number
  total_reach: number
  avg_conversion_rate: number
}

interface ContentBlock {
  id: string
  page: string
  section: string
  block_type: string
  title?: string | null
  content?: string | null
  image_url?: string | null
  cta_text?: string | null
  cta_url?: string | null
  position: number
  is_published: boolean
  version: number
  updated_by?: string
  created_at: string
  updated_at: string
}

type ContentBlockDraft = Omit<ContentBlock, 'id' | 'version' | 'created_at' | 'updated_by' | 'updated_at'>

type ActiveTab = 'campaigns' | 'content'

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-gray-500 bg-gray-500/10',
  active: 'text-green-600 bg-green-500/10',
  paused: 'text-amber-600 bg-amber-500/10',
  completed: 'text-blue-600 bg-blue-500/10',
}

const TYPE_LABELS: Record<string, string> = {
  email: 'Email',
  push: 'Push',
  banner: 'Баннер',
  promo: 'Промо',
  text: 'Текст',
  hero: 'Герой-баннер',
  feature: 'Фича',
  stats: 'Статистика',
  cta: 'Призыв к действию',
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function PlatformMarketingPage() {
  const { t } = useTranslation()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const platformRole = useAuthStore((s) => s.platformRole)
  const canManage = isSuperAdmin || platformRole === 'marketing'

  const [tab, setTab] = useState<ActiveTab>('content')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<MarketingStats>({ total_campaigns: 0, active_campaigns: 0, total_reach: 0, avg_conversion_rate: 0 })
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Editor state
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [campaignsRes, statsRes, contentRes] = await Promise.allSettled([
        api.get('/platform/marketing/campaigns'),
        api.get('/platform/marketing/stats'),
        api.get('/platform/content'),
      ])
      if (campaignsRes.status === 'fulfilled') setCampaigns(campaignsRes.value.data ?? [])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data ?? stats)
      if (contentRes.status === 'fulfilled') setContentBlocks(contentRes.value.data ?? [])
    } catch { /* API may not be ready */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  async function handleTogglePublish(blockId: string) {
    try {
      await api.post(`/platform/content/${blockId}/toggle-publish`)
      toast.success('Статус публикации обновлён')
      await loadData()
    } catch {
      toast.error('Не удалось обновить статус')
    }
  }

  async function handleDeleteBlock(blockId: string) {
    try {
      await api.delete(`/platform/content/${blockId}`)
      toast.success('Блок удалён')
      await loadData()
    } catch {
      toast.error('Не удалось удалить блок')
    }
  }

  function openEditor(block?: ContentBlock) {
    setEditingBlock(block || null)
    setShowEditor(true)
  }

  async function handleSaveBlock(data: Omit<ContentBlock, 'id' | 'version' | 'updated_by' | 'created_at' | 'updated_at'>) {
    try {
      if (editingBlock) {
        await api.put(`/platform/content/${editingBlock.id}`, data)
        toast.success('Блок обновлён')
      } else {
        await api.post('/platform/content', data)
        toast.success('Блок создан')
      }
      setShowEditor(false)
      setEditingBlock(null)
      await loadData()
    } catch {
      toast.error('Не удалось сохранить')
    }
  }

  // Group content by page
  const contentByPage = useMemo(() => {
    const map: Record<string, ContentBlock[]> = {}
    for (const block of contentBlocks) {
      const q = search.trim().toLowerCase()
      if (q && !block.title?.toLowerCase().includes(q) && !block.section.toLowerCase().includes(q) && !block.page.toLowerCase().includes(q)) continue
      if (!map[block.page]) map[block.page] = []
      map[block.page].push(block)
    }
    return map
  }, [contentBlocks, search])

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter((c) => c.name.toLowerCase().includes(q))
  }, [campaigns, search])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Маркетинг"
        description="Управление контентом сайта и маркетинговыми кампаниями."
        eyebrow="Platform"
        actions={
          canManage && tab === 'content' ? (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить блок
            </Button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.total_campaigns}</p>
              <p className="text-xs text-muted-foreground">Всего кампаний</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Send className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.active_campaigns}</p>
              <p className="text-xs text-muted-foreground">Активные</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.total_reach.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Общий охват</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{stats.avg_conversion_rate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Ср. конверсия</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setTab('content')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === 'content' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'
            }`}
          >
            <FileText className="h-3.5 w-3.5 inline mr-1" />
            Контент ({contentBlocks.length})
          </button>
          <button
            onClick={() => setTab('campaigns')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === 'campaigns' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'
            }`}
          >
            <Megaphone className="h-3.5 w-3.5 inline mr-1" />
            Кампании ({campaigns.length})
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'content' ? 'Поиск по контенту...' : 'Поиск по кампаниям...'}
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : tab === 'content' ? (
        /* Content Blocks by Page */
        Object.keys(contentByPage).length === 0 ? (
          <EmptyState icon={FileText} title="Нет контента" description="Создайте первый блок контента для вашего сайта." />
        ) : (
          <div className="space-y-6">
            {Object.entries(contentByPage).map(([page, blocks]) => (
              <div key={page} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-5 py-3">
                  <h3 className="text-sm font-semibold text-foreground capitalize">{page}</h3>
                  <p className="text-xs text-muted-foreground">{blocks.length} блоков</p>
                </div>
                <div className="divide-y divide-border">
                  {blocks.map((block) => (
                    <div key={block.id} className="flex items-start gap-4 px-5 py-4">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${block.is_published ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground text-sm">{block.title || `(${block.section})`}</p>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {TYPE_LABELS[block.block_type] || block.block_type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">v{block.version}</span>
                        </div>
                        {block.content && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-lg">{block.content}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {block.section} · pos: {block.position}
                          {block.updated_by && ` · ${block.updated_by}`}
                        </p>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleTogglePublish(block.id)}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                            title={block.is_published ? 'Скрыть' : 'Опубликовать'}>
                            {block.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => openEditor(block)}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                            title="Редактировать">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteBlock(block.id)}
                            className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                            title="Удалить">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Campaigns Table */
        filteredCampaigns.length === 0 ? (
          <EmptyState icon={Megaphone} title="Нет кампаний" description="Маркетинговые кампании будут отображаться здесь." />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Кампания</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Тип</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Охват</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Клики</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Конверсии</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Статус</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{campaign.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[campaign.type] ?? campaign.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{campaign.reach.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{campaign.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{campaign.conversions.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[campaign.status] || ''}`}>
                        {campaign.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Content Block Editor Modal */}
      {showEditor && (
        <ContentBlockEditor
          block={editingBlock}
          onSave={handleSaveBlock}
          onClose={() => { setShowEditor(false); setEditingBlock(null) }}
        />
      )}
    </div>
  )
}

// ── Content Block Editor ─────────────────────────────────────────────────────

function ContentBlockEditor({
  block,
  onSave,
  onClose,
}: {
  block: ContentBlock | null
  onSave: (data: ContentBlockDraft) => Promise<void>
  onClose: () => void
}) {
  const [page, setPage] = useState(block?.page || 'landing')
  const [section, setSection] = useState(block?.section || '')
  const [blockType, setBlockType] = useState(block?.block_type || 'text')
  const [title, setTitle] = useState(block?.title || '')
  const [content, setContent] = useState(block?.content || '')
  const [imageUrl, setImageUrl] = useState(block?.image_url || '')
  const [ctaText, setCtaText] = useState(block?.cta_text || '')
  const [ctaUrl, setCtaUrl] = useState(block?.cta_url || '')
  const [position, setPosition] = useState(block?.position ?? 0)
  const [isPublished, setIsPublished] = useState(block?.is_published ?? true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!section.trim()) {
      toast.error('Секция обязательна')
      return
    }
    setSaving(true)
    try {
      await onSave({
        page,
        section: section.trim(),
        block_type: blockType,
        title: title || null,
        content: content || null,
        image_url: imageUrl || null,
        cta_text: ctaText || null,
        cta_url: ctaUrl || null,
        position,
        is_published: isPublished,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <h3 className="text-base font-semibold text-foreground">
            {block ? 'Редактировать блок' : 'Новый блок контента'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Страница</label>
              <select value={page} onChange={(e) => setPage(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-ring focus:outline-none">
                <option value="landing">Лендинг</option>
                <option value="about">О нас</option>
                <option value="pricing">Цены</option>
                <option value="features">Возможности</option>
                <option value="blog">Блог</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Тип блока</label>
              <select value={blockType} onChange={(e) => setBlockType(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-ring focus:outline-none">
                <option value="text">Текст</option>
                <option value="hero">Герой-баннер</option>
                <option value="feature">Фича</option>
                <option value="stats">Статистика</option>
                <option value="cta">Призыв к действию</option>
                <option value="image">Изображение</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Секция *</label>
              <input value={section} onChange={(e) => setSection(e.target.value)}
                placeholder="hero, features, pricing..."
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Позиция</label>
              <input type="number" value={position} onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-ring focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Заголовок</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Заголовок блока"
              className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Контент</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Основной текст блока..."
              rows={4}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none resize-none" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">URL изображения</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">CTA текст</label>
              <input value={ctaText} onChange={(e) => setCtaText(e.target.value)}
                placeholder="Начать"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">CTA URL</label>
              <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="/register"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span className="text-sm text-foreground">Опубликован</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {block ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
