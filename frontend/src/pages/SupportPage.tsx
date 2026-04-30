import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Send, MessageSquare, X, ImagePlus, Search,
  Trash2, Check, ChevronLeft, Plus, Headphones,
  AlertCircle, CheckCircle, XCircle, Loader2,
  FileText, ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import {
  createSupportThread,
  deleteSupportThread,
  getSupportThread,
  listSupportThreads,
  sendSupportMessage,
  updateSupportThreadStatus,
  listPersonalThreads,
  createPersonalThread,
  getPersonalThread,
  sendPersonalMessage,
  deletePersonalThread,
  accessPersonalSupportAttachment,
  accessOrgSupportAttachment,
} from '@/api/support'
import type { SupportThread } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function getStatusMap(t: (key: string) => string) {
  return {
    open: { label: t('support.statusOpen'), color: 'text-red-500', bg: 'bg-red-500/10 border-red-200 dark:border-red-500/30', dot: 'bg-red-500', icon: AlertCircle },
    answered: { label: t('support.statusAnswered'), color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30', dot: 'bg-emerald-500', icon: CheckCircle },
    closed: { label: t('support.statusClosed'), color: 'text-muted-foreground', bg: 'bg-muted border-border', dot: 'bg-muted-foreground', icon: XCircle },
  } as Record<string, { label: string; color: string; bg: string; dot: string; icon: typeof AlertCircle }>
}

function getRoleLabels(t: (key: string) => string) {
  return {
    member: t('support.roleMember'),
    manager: t('support.roleManager'),
    admin: t('support.roleAdmin'),
  } as Record<string, string>
}

const REQUEST_TYPE_OPTIONS = [
  { value: 'general', label: 'Общий вопрос', requiresDocuments: false },
  { value: 'ceo_change', label: 'Смена CEO', requiresDocuments: true },
  { value: 'founder_change', label: 'Смена учредителя', requiresDocuments: true },
  { value: 'company_transfer', label: 'Передача прав на компанию', requiresDocuments: true },
  { value: 'legal_details_change', label: 'Изменение юр. реквизитов', requiresDocuments: true },
] as const

const LEGAL_REQUEST_TYPES = new Set<string>(
  REQUEST_TYPE_OPTIONS.filter((item) => item.requiresDocuments).map((item) => item.value),
)

function getRequestTypeLabel(requestType?: string) {
  return REQUEST_TYPE_OPTIONS.find((item) => item.value === requestType)?.label || 'Общий вопрос'
}

function getInitials(name: string) {
  if (!name) return '?'
  const parts = name.split(' ')
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name[0].toUpperCase()
}

function formatTime(dateStr: string, t: (key: string) => string, locale?: string) {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    if (days === 1) return t('support.yesterday')
    if (days < 7) return d.toLocaleDateString(locale, { weekday: 'short' })
    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
}

function formatMsgTime(dateStr: string, locale?: string) {
  try {
    return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatDateSeparator(dateStr: string, t: (key: string) => string, locale?: string) {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return t('support.today')
    if (days === 1) return t('support.yesterday')
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

function shouldShowDateSep(messages: { created_at: string }[], index: number) {
  if (index === 0) return true
  const cur = new Date(messages[index].created_at).toDateString()
  const prev = new Date(messages[index - 1].created_at).toDateString()
  return cur !== prev
}

export default function SupportPage() {
  const { t, i18n } = useTranslation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const { activeOrg } = useOrgStore()
  const orgRole = activeOrg()?.role ?? null
  const currentUserId = useAuthStore((s) => s.userId)
  const platformRole = useAuthStore((s) => s.platformRole)

  const STATUS_MAP = getStatusMap(t)
  const ROLE_LABELS = getRoleLabels(t)

  const [conversations, setConversations] = useState<SupportThread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<SupportThread | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileSidebar, setShowMobileSidebar] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // New chat form
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newRequestType, setNewRequestType] = useState<string>('general')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [legalTargetName, setLegalTargetName] = useState('')
  const [legalTargetEmail, setLegalTargetEmail] = useState('')
  const [legalTargetIin, setLegalTargetIin] = useState('')
  const [legalTargetShare, setLegalTargetShare] = useState('')
  const [legalTransferCeoRole, setLegalTransferCeoRole] = useState(true)
  const [legalAddress, setLegalAddress] = useState('')
  const [legalCompanyEmail, setLegalCompanyEmail] = useState('')
  const [legalCompanyPhone, setLegalCompanyPhone] = useState('')
  const [legalBin, setLegalBin] = useState('')
  const [legalOked, setLegalOked] = useState('')
  const [creating, setCreating] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newFileInputRef = useRef<HTMLInputElement>(null)
  const deleteConfirmRef = useRef<HTMLDivElement | null>(null)
  const isPollingRef = useRef(false)
  const lastLoadErrorToastRef = useRef(0)

  // Personal mode = no org selected
  const isPersonal = !orgId
  const isAdmin = !isPersonal && orgRole === 'sysadmin'
  const canCreate = (isPersonal && platformRole !== 'tech_support') || (!!orgRole && orgRole !== 'sysadmin')
  const canOpenSupport = isPersonal || !!orgRole
  const isChatClosed = selectedChat && selectedChat.status === 'closed'
  const isChatClosedForRequester = !isAdmin && isChatClosed
  const locale = useMemo(() => i18n.resolvedLanguage || i18n.language || undefined, [i18n.language, i18n.resolvedLanguage])

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImagePreviewUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(selectedImage)
    setSelectedImagePreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedImage])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const mergeThreadForSelection = useCallback((prev: SupportThread | null, fresh: SupportThread): SupportThread => {
    if (!prev || prev.id !== fresh.id) return fresh
    const freshHasMessages = Array.isArray(fresh.messages) && fresh.messages.length > 0
    const prevHasMessages = Array.isArray(prev.messages) && prev.messages.length > 0
    if (!freshHasMessages && prevHasMessages) {
      return { ...fresh, messages: prev.messages }
    }
    return fresh
  }, [])

  // ── Load conversations ──
  const loadConversations = useCallback(async () => {
    if (isPollingRef.current) return
    isPollingRef.current = true

    try {
      let data: SupportThread[]
      if (isPersonal) {
        const res = await listPersonalThreads()
        data = res.data
      } else {
        const res = await listSupportThreads(orgId!)
        data = res.data
      }
      setConversations((prev) => {
        // Guard against transient empty payloads during polling.
        if (data.length === 0 && prev.length > 0) return prev
        if (JSON.stringify(prev) !== JSON.stringify(data)) return data
        return prev
      })
      setSelectedChat((prev) => {
        // Keep current selection on transient empty poll result.
        if (data.length === 0) return prev
        if (!prev) return isAdmin ? null : data[0]
        const fresh = data.find((c) => c.id === prev.id)
        if (!fresh) return isAdmin ? null : data[0]
        return mergeThreadForSelection(prev, fresh)
      })
    } catch {
      const now = Date.now()
      if (now - lastLoadErrorToastRef.current > 30000) {
        toast.error(t('support.loadError'))
        lastLoadErrorToastRef.current = now
      }
    } finally {
      setLoading(false)
      isPollingRef.current = false
    }
  }, [orgId, isAdmin, isPersonal, t, mergeThreadForSelection])

  useEffect(() => {
    if (!canOpenSupport) return
    loadConversations()
    const interval = setInterval(loadConversations, 5000)
    return () => clearInterval(interval)
  }, [loadConversations, canOpenSupport])

  useEffect(() => {
    if (selectedChat) scrollToBottom()
  }, [selectedChat, selectedChat?.messages, scrollToBottom])

  useEffect(() => {
    if (!showDeleteConfirm) return

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (deleteConfirmRef.current && !deleteConfirmRef.current.contains(target)) {
        setShowDeleteConfirm(null)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowDeleteConfirm(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showDeleteConfirm])

  // ── Handlers ──
  const handleSelectChat = async (chat: SupportThread) => {
    try {
      let data: SupportThread
      if (isPersonal) {
        const res = await getPersonalThread(chat.id)
        data = res.data
      } else {
        const res = await getSupportThread(orgId!, chat.id)
        data = res.data
      }
      setSelectedChat(data)
      setConversations((prev) =>
        prev.map((c) => (c.id === data.id ? { ...c, unread_count: 0 } : c)),
      )
      setShowMobileSidebar(false)
      setTimeout(scrollToBottom, 100)
    } catch {
      toast.error(t('support.openError'))
    }
  }

  const handleCreateChat = async () => {
    if (!newSubject.trim()) {
      toast.error(t('support.subjectRequired'))
      return
    }
    if (!newBody.trim() && newFiles.length === 0) {
      toast.error(t('support.bodyRequired'))
      return
    }
    if (LEGAL_REQUEST_TYPES.has(newRequestType) && newFiles.length === 0) {
      toast.error('Для юридически значимого обращения нужно приложить документы-основания')
      return
    }
    const requestMeta = (() => {
      if (newRequestType === 'legal_details_change') {
        return {
          legal_address: legalAddress || undefined,
          company_email: legalCompanyEmail || undefined,
          company_phone: legalCompanyPhone || undefined,
          bin: legalBin || undefined,
          oked: legalOked || undefined,
        }
      }
      if (LEGAL_REQUEST_TYPES.has(newRequestType)) {
        return {
          target_full_name: legalTargetName || undefined,
          target_user_email: legalTargetEmail || undefined,
          target_iin: legalTargetIin || undefined,
          target_share: legalTargetShare ? Number(legalTargetShare) : undefined,
          transfer_ceo_role: legalTransferCeoRole,
        }
      }
      return {}
    })()
    if (newRequestType !== 'legal_details_change' && LEGAL_REQUEST_TYPES.has(newRequestType) && !legalTargetEmail.trim()) {
      toast.error('Для юридического кейса нужна почта целевого пользователя')
      return
    }
    if (newRequestType === 'legal_details_change' && (!legalAddress.trim() || !legalCompanyEmail.trim() || !legalCompanyPhone.trim() || !legalOked.trim())) {
      toast.error('Для изменения реквизитов заполните адрес, почту, телефон и ОКЭД')
      return
    }

    setCreating(true)
    try {
      let data: SupportThread
      if (isPersonal) {
        const res = await createPersonalThread({
          subject: newSubject.trim(),
          body: newBody.trim(),
          request_type: newRequestType,
          request_meta: requestMeta,
          files: newFiles,
        })
        data = res.data
      } else {
        const res = await createSupportThread(orgId!, {
          subject: newSubject.trim(),
          body: newBody.trim(),
          request_type: newRequestType,
          request_meta: requestMeta,
          files: newFiles,
        })
        data = res.data
      }
      setNewSubject('')
      setNewBody('')
      setNewRequestType('general')
      setNewFiles([])
      setLegalTargetName('')
      setLegalTargetEmail('')
      setLegalTargetIin('')
      setLegalTargetShare('')
      setLegalTransferCeoRole(true)
      setLegalAddress('')
      setLegalCompanyEmail('')
      setLegalCompanyPhone('')
      setLegalBin('')
      setLegalOked('')
      await loadConversations()
      setSelectedChat(data)
      setShowMobileSidebar(false)
      toast.success(t('support.chatCreated'))
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message) {
        toast.error(message)
      } else {
        toast.error(t('support.createError'))
      }
    } finally {
      setCreating(false)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedChat) return
    if (!messageInput.trim() && !selectedImage) return
    setSending(true)
    try {
      const files = selectedImage ? [selectedImage] : undefined
      if (isPersonal) {
        await sendPersonalMessage(selectedChat.id, {
          body: messageInput.trim(),
          files,
        })
      } else {
        await sendSupportMessage(orgId!, selectedChat.id, {
          body: messageInput.trim(),
          files,
        })
      }

      setMessageInput('')
      setSelectedImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      let data: SupportThread
      if (isPersonal) {
        const res = await getPersonalThread(selectedChat.id)
        data = res.data
      } else {
        const res = await getSupportThread(orgId!, selectedChat.id)
        data = res.data
      }
      setSelectedChat(data)
      setConversations((prev) => {
        const others = prev.filter((c) => c.id !== data.id)
        return [{ ...data, unread_count: 0 }, ...others]
      })
      setTimeout(scrollToBottom, 100)
    } catch {
      toast.error(t('support.sendError'))
    } finally {
      setSending(false)
    }
  }

  const handleCloseChat = async () => {
    if (!orgId || !selectedChat) return
    try {
      const { data } = await updateSupportThreadStatus(orgId, selectedChat.id, 'closed')
      setSelectedChat(data)
      setConversations((prev) => prev.map((c) => (c.id === data.id ? data : c)))
      toast.success(t('support.chatClosedSuccess'))
    } catch {
      toast.error(t('support.closeError'))
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      if (isPersonal) {
        await deletePersonalThread(chatId)
      } else {
        await deleteSupportThread(orgId!, chatId)
      }
      setConversations((prev) => prev.filter((c) => c.id !== chatId))
      if (selectedChat?.id === chatId) setSelectedChat(null)
      setShowDeleteConfirm(null)
      toast.success(t('support.chatDeleted'))
    } catch {
      toast.error(t('support.deleteError'))
    }
  }

  const handleAccessAttachment = async (
    messageId: string,
    attachmentId: string,
    action: 'view' | 'download',
  ) => {
    if (!selectedChat) return
    try {
      const response = isPersonal
        ? await accessPersonalSupportAttachment(selectedChat.id, messageId, attachmentId, action)
        : await accessOrgSupportAttachment(orgId!, selectedChat.id, messageId, attachmentId, action)
      const { data } = response
      if (action === 'download') {
        const link = document.createElement('a')
        link.href = data.url
        link.download = data.file_name || 'support-attachment'
        document.body.appendChild(link)
        link.click()
        link.remove()
        return
      }
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Не удалось открыть вложение')
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.warning(t('support.fileTooLarge'))
        return
      }
      setSelectedImage(file)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const filteredConversations = conversations.filter((c) => {
    if (filter !== 'all') {
      if (filter === 'closed') {
        if (c.status !== 'closed') return false
      } else if (c.status !== filter) return false
    }
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.subject.toLowerCase().includes(q) ||
      c.requester_name.toLowerCase().includes(q) ||
      (c.last_message_preview || '').toLowerCase().includes(q)
    )
  })

  // ── No access ──
  if (!canOpenSupport) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 text-muted-foreground">
        <Headphones className="h-12 w-12" />
        <p>{t('support.noAccess')}</p>
      </div>
    )
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p>{t('support.loadingChats')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden rounded-2xl border border-border bg-card">
      {/* ── SIDEBAR ── */}
      <aside className={`w-[360px] min-w-[360px] bg-muted/30 border-r border-border flex flex-col overflow-hidden max-md:fixed max-md:inset-0 max-md:w-full max-md:min-w-full max-md:z-20 max-md:bg-background max-md:transition-transform max-md:duration-250 ${showMobileSidebar ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <Headphones className="h-5 w-5 text-primary" />
            <span>{t('support.title')}</span>
          </div>
        </div>

        {/* Search (admin only) */}
        {isAdmin && (
          <div className="relative px-4 pb-3">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={t('support.searchChats')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Очистить поиск"
                className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Filters (admin only) */}
        {isAdmin && (
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
            {[
              { key: 'all', label: t('support.filterAll') },
              { key: 'open', label: t('support.filterOpen') },
              { key: 'answered', label: t('support.filterAnswered') },
              { key: 'closed', label: t('support.filterClosed') },
            ].map((f) => (
              <button
                type="button"
                key={f.key}
                aria-pressed={filter === f.key}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                  filter === f.key
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-transparent border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key !== 'all' && (
                  <span className={`text-[11px] font-semibold px-1.5 rounded-md ${
                    filter === f.key ? 'bg-primary/15' : 'bg-muted'
                  }`}>
                    {conversations.filter((c) =>
                      f.key === 'closed' ? c.status === 'closed' : c.status === f.key,
                    ).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Create form (non-admin only) */}
        {!isAdmin && canCreate && (
          <div className="px-4 pb-3">
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder={t('support.subjectPlaceholder')}
              />
              {!isPersonal && (
                <select
                  value={newRequestType}
                  onChange={(e) => setNewRequestType(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  {REQUEST_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              )}
              <Textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder={t('support.describeProblem')}
                rows={2}
                className="min-h-[56px]"
              />
              <input
                ref={newFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    const allowed = Array.from(e.target.files).filter((f) =>
                      ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(f.type),
                    )
                    setNewFiles((prev) => [...prev, ...allowed])
                  }
                  e.currentTarget.value = ''
                }}
              />
              {!isPersonal && LEGAL_REQUEST_TYPES.has(newRequestType) && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Для этого обращения нужны подтверждающие документы. Без них сервис-деск не сможет передать кейс на модерацию.
                </div>
              )}
              {!isPersonal && LEGAL_REQUEST_TYPES.has(newRequestType) && newRequestType !== 'legal_details_change' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={legalTargetName} onChange={(e) => setLegalTargetName(e.target.value)} placeholder="ФИО нового CEO / учредителя" />
                  <Input value={legalTargetEmail} onChange={(e) => setLegalTargetEmail(e.target.value)} placeholder="Почта пользователя в системе" />
                  <Input value={legalTargetIin} onChange={(e) => setLegalTargetIin(e.target.value)} placeholder="ИИН" />
                  <Input value={legalTargetShare} onChange={(e) => setLegalTargetShare(e.target.value)} placeholder="Доля, %" />
                  {newRequestType === 'company_transfer' && (
                    <label className="col-span-full flex items-center gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={legalTransferCeoRole} onChange={(e) => setLegalTransferCeoRole(e.target.checked)} />
                      Передать новому владельцу и роль CEO
                    </label>
                  )}
                </div>
              )}
              {!isPersonal && newRequestType === 'legal_details_change' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={legalAddress} onChange={(e) => setLegalAddress(e.target.value)} placeholder="Юридический адрес" />
                  <Input value={legalCompanyEmail} onChange={(e) => setLegalCompanyEmail(e.target.value)} placeholder="Почта компании" />
                  <Input value={legalCompanyPhone} onChange={(e) => setLegalCompanyPhone(e.target.value)} placeholder="Телефон компании" />
                  <Input value={legalBin} onChange={(e) => setLegalBin(e.target.value)} placeholder="БИН" />
                  <Input value={legalOked} onChange={(e) => setLegalOked(e.target.value)} placeholder="ОКЭД" />
                </div>
              )}
              {newFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {newFiles.map((f, i) => (
                    <button
                      type="button"
                      key={`${f.name}-${i}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] hover:bg-destructive/15 hover:text-destructive transition-colors"
                      onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      {f.name} <X className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Прикрепить документ"
                  onClick={() => newFileInputRef.current?.click()}
                  title="Прикрепить документ"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Button
                  className="flex-1"
                  size="sm"
                  onClick={handleCreateChat}
                  disabled={creating}
                >
                  {creating ? t('support.creating') : t('support.createChat')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {(isAdmin ? filteredConversations : conversations).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-muted-foreground/50 text-center gap-3">
              <MessageSquare className="h-10 w-10" />
              <p className="text-sm">{searchQuery ? t('support.nothingFound') : (isAdmin ? t('support.noChats') : t('support.noRequests'))}</p>
            </div>
          ) : (
            (isAdmin ? filteredConversations : conversations).map((chat) => {
              const st = STATUS_MAP[chat.status] || STATUS_MAP.open
              return (
                <div
                  key={chat.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Открыть чат: ${isAdmin ? (chat.requester_name || t('support.user')) : chat.subject}`}
                  className={`flex items-center gap-3.5 px-5 py-3.5 cursor-pointer transition-colors border-l-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    selectedChat?.id === chat.id
                      ? 'bg-primary/5 border-l-primary'
                      : 'border-l-transparent hover:bg-accent/50'
                  }`}
                  onClick={() => handleSelectChat(chat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectChat(chat)
                    }
                  }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar size="lg">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                        {isAdmin ? getInitials(chat.requester_name || '?') : <Headphones className="h-4.5 w-4.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${st.dot}`} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {isAdmin ? (chat.requester_name || t('support.user')) : chat.subject}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                        {formatTime(chat.updated_at, t, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[13px] text-muted-foreground truncate">
                        {isAdmin ? (
                          <>
                            <span className="opacity-70 font-medium">{chat.subject}</span>
                            {chat.last_message_preview
                              ? ` — ${chat.last_message_preview.length > 35
                                  ? chat.last_message_preview.substring(0, 35) + '...'
                                  : chat.last_message_preview}`
                              : ''}
                          </>
                        ) : (
                          chat.last_message_preview
                            ? (chat.last_message_preview.length > 45
                                ? chat.last_message_preview.substring(0, 45) + '...'
                                : chat.last_message_preview)
                            : t('support.noMessages')
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isAdmin && chat.requester_role && (
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                            {ROLE_LABELS[chat.requester_role] || chat.requester_role}
                          </Badge>
                        )}
                        {chat.request_type && chat.request_type !== 'general' && (
                          <Badge variant="outline" className="text-[10px]">
                            {getRequestTypeLabel(chat.request_type)}
                          </Badge>
                        )}
                        {!isAdmin && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white ${st.dot}`}>
                            {st.label}
                          </span>
                        )}
                        {chat.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-primary rounded-full">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ── CHAT AREA ── */}
      <main className="flex-1 flex flex-col bg-background min-w-0">
        {selectedChat ? (
          <>
            {/* Header */}
            <header className="flex items-center gap-3.5 px-5 py-3.5 bg-muted/30 border-b border-border">
              <button
                type="button"
                aria-label="Назад к списку чатов"
                className="hidden max-md:flex items-center justify-center h-9 w-9 rounded-full bg-muted text-foreground hover:bg-accent"
                onClick={() => {
                  setShowMobileSidebar(true)
                  setSelectedChat(null)
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <Avatar size="lg">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {isAdmin
                    ? getInitials(selectedChat.requester_name || '?')
                    : <Headphones className="h-4.5 w-4.5" />}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold truncate text-foreground">
                    {isAdmin ? selectedChat.requester_name : selectedChat.subject}
                  </h3>
                  {isAdmin && selectedChat.requester_role && (
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      {ROLE_LABELS[selectedChat.requester_role] || selectedChat.requester_role}
                    </Badge>
                  )}
                  {selectedChat.request_type && selectedChat.request_type !== 'general' && (
                    <Badge variant="outline" className="text-[10px]">
                      {getRequestTypeLabel(selectedChat.request_type)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  {(() => {
                    const st = STATUS_MAP[selectedChat.status] || STATUS_MAP.open
                    const Icon = st.icon
                    return (
                      <span className={`inline-flex items-center gap-1 font-medium ${st.color}`}>
                        <Icon className="h-3 w-3" />
                        {st.label}
                      </span>
                    )
                  })()}
                  <span className="opacity-30">&middot;</span>
                  <span>{isAdmin ? selectedChat.subject : t('support.supportService')}</span>
                  {selectedChat.request_type && selectedChat.request_type !== 'general' && (
                    <>
                      <span className="opacity-30">&middot;</span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        {getRequestTypeLabel(selectedChat.request_type)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdmin && selectedChat.status !== 'closed' && (
                  <Button variant="outline" size="sm" onClick={handleCloseChat} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10">
                    <Check className="h-4 w-4" />
                    <span className="max-md:hidden">{t('support.closeChat')}</span>
                  </Button>
                )}
                {(isAdmin || isPersonal) && (
                  <div className="relative">
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      title={t('support.deleteChat')}
                      aria-label={t('support.deleteChat')}
                      aria-haspopup="dialog"
                      aria-expanded={showDeleteConfirm === selectedChat.id}
                      onClick={() => setShowDeleteConfirm(selectedChat.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {showDeleteConfirm === selectedChat.id && (
                      <div
                        ref={deleteConfirmRef}
                        role="dialog"
                        aria-label={t('support.deleteConfirm')}
                        className="absolute top-[calc(100%+8px)] right-0 w-[220px] rounded-xl border border-destructive/20 bg-card p-4 shadow-lg z-50 animate-in fade-in slide-in-from-top-1"
                      >
                        <p className="text-[13px] text-foreground mb-3 text-center">{t('support.deleteConfirm')}</p>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDeleteChat(selectedChat.id)}
                          >
                            {t('common.delete')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            autoFocus
                            onClick={() => setShowDeleteConfirm(null)}
                          >
                            {t('support.cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-0.5 max-w-[800px] mx-auto w-full">
                {selectedChat.messages && selectedChat.messages.length > 0 ? (
                  selectedChat.messages.map((msg, index) => {
                    const isOwn = msg.author_id === currentUserId
                    const showDateSep = shouldShowDateSep(selectedChat.messages, index)
                    const prevMsg = index > 0 ? selectedChat.messages[index - 1] : null
                    const isGrouped = prevMsg && prevMsg.author_id === msg.author_id && !showDateSep

                    return (
                      <div key={msg.id}>
                        {showDateSep && (
                          <div className="flex justify-center py-3">
                            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-3.5 py-1 rounded-full">
                              {formatDateSeparator(msg.created_at, t, locale)}
                            </span>
                          </div>
                        )}
                        <div className={`flex gap-2 max-w-[75%] max-md:max-w-[88%] mb-0.5 ${isOwn ? 'self-end flex-row-reverse' : 'self-start'} ${isGrouped ? '-mt-0.5' : ''}`}>
                          {!isOwn && !isGrouped && (
                            <Avatar size="sm">
                              <AvatarFallback className="bg-primary/80 text-primary-foreground text-[11px] font-bold">
                                {msg.author_role === 'admin' ? <Headphones className="h-3 w-3" /> : getInitials(msg.author_name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {!isOwn && isGrouped && <div className="w-6 flex-shrink-0" />}
                          <div className={`relative px-3 py-2 rounded-2xl min-w-[60px] ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-muted text-foreground rounded-bl-sm'
                          } ${isGrouped && isOwn ? 'rounded-tr-sm' : ''} ${isGrouped && !isOwn ? 'rounded-tl-sm' : ''}`}>
                            {!isGrouped && (
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`text-xs font-semibold ${isOwn ? 'text-primary-foreground/85' : 'text-primary'}`}>
                                  {msg.author_name}
                                </span>
                                {msg.author_role === 'admin' && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-primary/20 text-primary-foreground/70">
                                    {t('support.supportBadge')}
                                  </span>
                                )}
                              </div>
                            )}
                            {msg.body && (
                              <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isOwn ? 'text-primary-foreground/92' : ''}`}>
                                {msg.body}
                              </div>
                            )}
                            {msg.attachments?.map((att) => (
                              <div key={att.id} className="mt-1.5 rounded-lg overflow-hidden max-w-[320px]">
                                {att.content_type?.startsWith('image/') ? (
                                  <div
                                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                                      isOwn ? 'bg-primary-foreground/10 text-primary-foreground' : 'bg-background text-muted-foreground'
                                    }`}>
                                      <FileText className="h-4 w-4" />
                                      <span className="min-w-0 flex-1 truncate">{att.file_name}</span>
                                      <button
                                        type="button"
                                        onClick={() => void handleAccessAttachment(msg.id, att.id, 'view')}
                                        className="inline-flex min-h-7 items-center rounded-md px-2 text-[11px] hover:bg-accent/60"
                                      >
                                        Открыть
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleAccessAttachment(msg.id, att.id, 'download')}
                                        className="inline-flex min-h-7 items-center rounded-md px-2 text-[11px] hover:bg-accent/60"
                                      >
                                        Скачать
                                      </button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                                      isOwn ? 'border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground' : 'border-border bg-background text-foreground'
                                    }`}
                                  >
                                    <FileText className="h-4 w-4" />
                                    <span className="min-w-0 flex-1 truncate">{att.file_name}</span>
                                    <button
                                      type="button"
                                      onClick={() => void handleAccessAttachment(msg.id, att.id, 'view')}
                                      className="inline-flex min-h-7 items-center rounded-md px-2 text-[11px] hover:bg-accent/60"
                                    >
                                      Открыть
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleAccessAttachment(msg.id, att.id, 'download')}
                                      className="inline-flex min-h-7 items-center rounded-md px-2 text-[11px] hover:bg-accent/60"
                                    >
                                      Скачать
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className={`flex items-center gap-1 justify-end text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/40' : 'text-muted-foreground'}`}>
                              {formatMsgTime(msg.created_at, locale)}
                              {isOwn && <Check className="h-3 w-3 text-primary-foreground/60" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-5">
                      <MessageSquare className="h-12 w-12" />
                    </div>
                    <p className="text-muted-foreground">{t('support.noMessages')}</p>
                    <span className="text-sm text-muted-foreground/60 mt-1">{t('support.startDialog')}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="px-5 py-3 bg-muted/30 border-t border-border">
              {isChatClosedForRequester && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-muted-foreground text-[13px] mb-3">
                  <X className="h-4 w-4" />
                  {t('support.chatClosedBanner')}
                </div>
              )}
              {selectedImage && (
                <div className="flex items-center gap-3 px-3 py-2 bg-muted rounded-lg border border-border mb-2.5">
                  {selectedImage.type.startsWith('image/') ? (
                    <img src={selectedImagePreviewUrl ?? ''} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background text-muted-foreground">
                      <FileText className="h-5 w-5" />
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="Убрать выбранный файл"
                    className="h-7 w-7 rounded-full bg-destructive/15 text-destructive flex items-center justify-center hover:bg-destructive/25 flex-shrink-0"
                    onClick={() => {
                      setSelectedImage(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground truncate flex-1">{selectedImage.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('support.attachImage')}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!isChatClosedForRequester}
                  title={t('support.attachImage')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ImagePlus className="h-5 w-5" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={!!isChatClosedForRequester}
                />
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isChatClosedForRequester ? t('support.chatClosed') : t('support.messagePlaceholder')}
                  className="flex-1 h-10 px-4 rounded-full border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={!!isChatClosedForRequester}
                />
                <Button
                  size="icon"
                  aria-label={t('support.send')}
                  onClick={handleSendMessage}
                  disabled={!!isChatClosedForRequester || sending || (!messageInput.trim() && !selectedImage)}
                  title={t('support.send')}
                  className="rounded-full"
                >
                  <Send className="h-4.5 w-4.5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
            <div className="absolute w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
              <Headphones className="h-16 w-16" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('support.title')}</h2>
            <p className="text-muted-foreground max-w-[320px]">
              {isAdmin ? t('support.selectChat') : t('support.writeUs')}
            </p>
            {canCreate && conversations.length === 0 && (
              <Button
                className="mt-6"
                size="lg"
                onClick={() => setShowMobileSidebar(true)}
              >
                <Plus className="h-5 w-5" />
                {t('support.startChat')}
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
