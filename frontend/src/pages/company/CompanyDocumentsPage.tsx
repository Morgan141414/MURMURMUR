import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Building2, CheckCircle2, FileText, Folder, MoreHorizontal, Plus, Search } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useHRDocuments } from '@/hooks/useHR'
import {
  createHRDocument,
  createHRDocumentFolder,
  createHRDocumentFolderShareRequest,
  createHRDocumentShareRequest,
  fetchHRDocumentContent,
  uploadHRDocumentFile,
  deleteHRDocument,
  deleteHRDocumentFolder,
  listHRDocumentCollaborators,
  listHRDocumentFolderCollaborators,
  listHRDocumentFolders,
  searchHRDocumentShareCandidates,
  getHRDocumentEditorPayload,
  getHROnlyOfficeConfig,
  updateHRDocument,
  updateHRDocumentFolder,
} from '@/api/hr'
import type {
  HRDocument,
  HRDocumentFolder,
  HRDocumentFolderShareRequest,
  HRDocumentShareRequest,
} from '@/types'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingState'
import { PageHeader } from '@/components/shared/PageHeader'
import { AvatarImage } from '@/components/shared/AvatarImage'
import { DocumentTemplatePanel } from '@/pages/company/DocumentTemplatePanel'


declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (id: string, config: Record<string, unknown>) => {
        destroyEditor?: () => void
      }
    }
  }
}

let onlyOfficeScriptPromise: Promise<void> | null = null
const EDITOR_PREFETCH_STALE_MS = 5 * 60_000

function loadOnlyOfficeScript(scriptUrl: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.DocsAPI?.DocEditor) return Promise.resolve()
  if (onlyOfficeScriptPromise) return onlyOfficeScriptPromise

  onlyOfficeScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = Array.from(document.getElementsByTagName('script')).find((script) => script.src === scriptUrl)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load ONLYOFFICE script')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load ONLYOFFICE script'))
    document.body.appendChild(script)
  }).finally(() => {
    onlyOfficeScriptPromise = null
  })

  return onlyOfficeScriptPromise as Promise<void>
}


function patchOnlyOfficeBranding(config: Record<string, unknown>): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(config)) as Record<string, unknown>
  const editorConfig = (cloned.editorConfig ??= {}) as Record<string, unknown>
  const customization = (editorConfig.customization ??= {}) as Record<string, unknown>

  const transparentLogo = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
  customization.logo = {
    image: transparentLogo,
    imageDark: transparentLogo,
    imageEmbedded: transparentLogo,
    url: '',
  }
  customization.customer = {
    name: '',
    address: '',
    mail: '',
    www: '',
    info: '',
    logo: transparentLogo,
  }
  customization.about = false
  customization.feedback = false

  return cloned
}

type ContextMenuState = {
  kind: 'document' | 'folder'
  id: string
  x: number
  y: number
}

type CollaboratorTarget = {
  kind: 'document' | 'folder'
  id: string
}

type ShareCandidate = {
  id: string
  full_name?: string | null
  email?: string | null
  iin?: string | null
  telegram_username?: string | null
  instagram_username?: string | null
  avatar_url?: string | null
}

function resolveFolderId(document: HRDocument): string | null {
  const folderId = String(document.meta_json?.folder_id ?? '').trim()
  return folderId || null
}

function isDocumentPinned(document: HRDocument): boolean {
  return Boolean((document.meta_json as Record<string, unknown> | undefined)?.pinned)
}

function isFolderPinned(folder: HRDocumentFolder): boolean {
  return Boolean((folder.meta_json as Record<string, unknown> | undefined)?.pinned)
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return '-'
  }
}

function formatBytes(size?: number): string {
  if (!size || size <= 0) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function collaboratorStatusLabel(status?: string): string {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'accepted') return 'Добавлен'
  if (normalized === 'pending') return '\u041f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e'
  if (normalized === 'rejected') return 'Отклонен'
  return 'Неизвестно'
}

function collaboratorStatusClass(status?: string): string {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'accepted') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (normalized === 'pending') return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  if (normalized === 'rejected') return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  return 'border-white/20 bg-white/10 text-slate-300'
}

function stripExt(name: string): string {
  const i = name.lastIndexOf('.')
  if (i <= 0) return name
  return name.slice(0, i)
}

function fileNameFromDisposition(value?: string): string | null {
  if (!value) return null
  const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1])
    } catch {
      return utfMatch[1]
    }
  }
  const plainMatch = value.match(/filename="?([^";]+)"?/i)
  if (plainMatch?.[1]) return plainMatch[1]
  return null
}

function decodeTextFromDataUrl(dataUrl: string): string {
  try {
    const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/)
    if (!m) return ''
    const mime = m[1].toLowerCase()
    if (!mime.startsWith('text/') && !mime.includes('json') && !mime.includes('xml')) return ''
    return decodeURIComponent(escape(atob(m[2])))
  } catch {
    return ''
  }
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

async function extractFileEditorContent(file: File): Promise<string> {
  const mime = (file.type || '').toLowerCase()
  const lowerName = file.name.toLowerCase()
  const isDocx = mime.includes('wordprocessingml.document') || lowerName.endsWith('.docx')

  if (isDocx) {
    try {
      const mammoth = await import('mammoth')
      const arrayBuffer = await readFileAsArrayBuffer(file)
      const converted = await mammoth.convertToHtml({ arrayBuffer })
      return String(converted.value || '').trim()
    } catch {
      // Fallback below if parser fails for any reason.
    }
  }

  const isTextLike =
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm'].some((ext) => lowerName.endsWith(ext))

  if (isTextLike) {
    try {
      return (await file.text()).trim()
    } catch {
      return ''
    }
  }

  return ''
}

function resolveDocumentEditorContent(document: HRDocument): string {
  const fromMeta = String((document.meta_json as Record<string, unknown> | undefined)?.generated_content ?? '')
  if (fromMeta) return fromMeta
  const fromFile = document.file_url
  if (typeof fromFile === 'string' && fromFile.startsWith('data:text')) {
    return decodeTextFromDataUrl(fromFile)
  }
  return ''
}

export default function CompanyDocumentsPage() {
  const { t } = useTranslation()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const org = useOrgStore((s) => s.activeOrg())
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [dragDocumentId, setDragDocumentId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<'root' | 'document' | 'folder'>('root')
  const [newDocumentName, setNewDocumentName] = useState('')
  const [createError, setCreateError] = useState('')

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renamingDocumentId, setRenamingDocumentId] = useState<string | null>(null)
  const [renamingDocumentName, setRenamingDocumentName] = useState('')
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renamingFolderName, setRenamingFolderName] = useState('')

  const [editorDocumentId, setEditorDocumentId] = useState<string | null>(null)
  const [editorHtml, setEditorHtml] = useState('')
  const [editorDirty, setEditorDirty] = useState(false)
  const isEditorMode = !!editorDocumentId

  const [collaboratorTarget, setCollaboratorTarget] = useState<CollaboratorTarget | null>(null)
  const [collaboratorSearch, setCollaboratorSearch] = useState('')
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')

  const createRef = useRef<HTMLDivElement | null>(null)
  const contextMenuRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const onlyOfficeEditorRef = useRef<{ destroyEditor?: () => void } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const prefetchedEditorDocsRef = useRef<Set<string>>(new Set())
  const [onlyOfficeLoadError, setOnlyOfficeLoadError] = useState('')
  const clinicId = useMemo(() => {
    if (!activeOrgId) return null
    const parsed = Number(activeOrgId)
    return Number.isFinite(parsed) ? parsed : null
  }, [activeOrgId])


  const prefetchEditorAssets = useCallback((document: HRDocument, force = false) => {
    if (!activeOrgId) return

    const cacheKey = `${activeOrgId}:${document.id}`
    if (!force && prefetchedEditorDocsRef.current.has(cacheKey)) return
    prefetchedEditorDocsRef.current.add(cacheKey)

    const payloadQueryKey = ['hr', activeOrgId, 'document-editor-payload', document.id]
    const configQueryKey = ['hr', activeOrgId, 'document-onlyoffice-config', document.id]

    void qc.prefetchQuery({
      queryKey: payloadQueryKey,
      queryFn: () => getHRDocumentEditorPayload(activeOrgId, document.id).then((r) => r.data),
      staleTime: EDITOR_PREFETCH_STALE_MS,
    })

    void qc.prefetchQuery({
      queryKey: configQueryKey,
      queryFn: () => getHROnlyOfficeConfig(activeOrgId, document.id).then((r) => r.data),
      staleTime: EDITOR_PREFETCH_STALE_MS,
    })

    void loadOnlyOfficeScript('/onlyoffice/web-apps/apps/api/documents/api.js').catch(() => {
      // Best-effort warmup.
    })
  }, [activeOrgId, qc])

  function openFolder(folderId: string | null) {
    setCurrentFolderId(folderId)
    const nextParams = new URLSearchParams(searchParams)
    if (folderId) nextParams.set('folder', folderId)
    else nextParams.delete('folder')
    setSearchParams(nextParams, { replace: false })
  }

  function openContextMenu(kind: 'document' | 'folder', id: string, x: number, y: number) {
    const menuWidth = 220
    const menuHeight = kind === 'document' ? 250 : 220
    const safeX = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8))
    const safeY = Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8))
    setContextMenu({ kind, id, x: safeX, y: safeY })
  }


  useEffect(() => {
    const folderFromUrl = (searchParams.get('folder') || '').trim()
    setCurrentFolderId(folderFromUrl || null)
  }, [searchParams])

  useEffect(() => {
    prefetchedEditorDocsRef.current.clear()
  }, [activeOrgId])

  const { data: documents = [], isLoading: isDocumentsLoading } = useHRDocuments(activeOrgId, {
    refetchOnWindowFocus: !isEditorMode,
    staleTime: isEditorMode ? 300_000 : 60_000,
  })


  useEffect(() => {
    if (!activeOrgId || documents.length === 0) return
    // Warm ONLYOFFICE runtime/script in background to make first open feel instant.
    void loadOnlyOfficeScript('/onlyoffice/web-apps/apps/api/documents/api.js').catch(() => {
      // Optional optimization only.
    })
  }, [activeOrgId, documents.length])

  useEffect(() => {
    if (!activeOrgId || isEditorMode || documents.length === 0) return

    const docsForWarmup = documents.slice(0, 6)
    if (docsForWarmup.length === 0) return

    const runWarmup = () => {
      for (const document of docsForWarmup) {
        prefetchEditorAssets(document, true)
      }
    }

    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(() => runWarmup(), { timeout: 1200 })
      return () => window.cancelIdleCallback?.(handle)
    }

    const timer = window.setTimeout(runWarmup, 120)
    return () => window.clearTimeout(timer)
  }, [activeOrgId, documents, isEditorMode, prefetchEditorAssets])
  const { data: folders = [], isLoading: isFoldersLoading } = useQuery({
    queryKey: ['hr', activeOrgId, 'folders'],
    queryFn: async () => {
      try {
        const response = await listHRDocumentFolders(activeOrgId!)
        return response.data
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 404) return [] as HRDocumentFolder[]
        throw error
      }
    },
    enabled: !!activeOrgId && !isEditorMode,
    refetchOnWindowFocus: !isEditorMode,
    staleTime: 120_000,
    retry: false,
  })

  const {
    data: onlyOfficePayload,
    isLoading: onlyOfficeConfigLoading,
    error: onlyOfficeConfigError,
  } = useQuery({
    queryKey: ['hr', activeOrgId, 'document-onlyoffice-config', editorDocumentId],
    queryFn: () => getHROnlyOfficeConfig(activeOrgId!, editorDocumentId!).then((r) => r.data),
    enabled: !!activeOrgId && !!editorDocumentId,
    refetchOnWindowFocus: false,
    staleTime: 300_000,
    retry: false,
  })

  const { data: shareCandidates = [] } = useQuery({
    queryKey: ['hr', activeOrgId, 'share-candidates-modal', collaboratorSearch],
    queryFn: () => searchHRDocumentShareCandidates(activeOrgId!, collaboratorSearch).then((r) => r.data as ShareCandidate[]),
    enabled: !!activeOrgId && !!collaboratorTarget && collaboratorSearch.trim().length >= 1,
  })

  const currentFolder = useMemo(() => folders.find((f) => f.id === currentFolderId) ?? null, [folders, currentFolderId])
  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders])

  const breadcrumbs = useMemo(() => {
    const result: HRDocumentFolder[] = []
    let cursor = currentFolder
    const guard = new Set<string>()
    while (cursor && !guard.has(cursor.id)) {
      result.unshift(cursor)
      guard.add(cursor.id)
      cursor = cursor.parent_id ? folderMap.get(String(cursor.parent_id)) ?? null : null
    }
    return result
  }, [currentFolder, folderMap])

  const currentFolders = useMemo(() => {
    if (isEditorMode) return [] as HRDocumentFolder[]
    return folders
      .filter((f) => String(f.parent_id ?? '') === String(currentFolderId ?? ''))
      .sort((a, b) => {
        const ap = isFolderPinned(a)
        const bp = isFolderPinned(b)
        if (ap === bp) return a.name.localeCompare(b.name)
        return ap ? -1 : 1
      })
  }, [folders, currentFolderId, isEditorMode])

  const currentDocuments = useMemo(() => {
    if (isEditorMode) return [] as HRDocument[]
    return documents
      .filter((d) => String(resolveFolderId(d) ?? '') === String(currentFolderId ?? ''))
      .sort((a, b) => {
        const ap = isDocumentPinned(a)
        const bp = isDocumentPinned(b)
        if (ap === bp) return a.name.localeCompare(b.name)
        return ap ? -1 : 1
      })
  }, [documents, currentFolderId, isEditorMode])

  const normalizedFilterQuery = filterQuery.trim().toLowerCase()

  const filteredCurrentFolders = useMemo(() => {
    if (!normalizedFilterQuery) return currentFolders
    return currentFolders.filter((item) => item.name.toLowerCase().includes(normalizedFilterQuery))
  }, [currentFolders, normalizedFilterQuery])

  const filteredCurrentDocuments = useMemo(() => {
    if (!normalizedFilterQuery) return currentDocuments
    return currentDocuments.filter((item) => item.name.toLowerCase().includes(normalizedFilterQuery))
  }, [currentDocuments, normalizedFilterQuery])

  const visibleDocIds = useMemo(() => currentDocuments.map((d) => d.id), [currentDocuments])
  const visibleFolderIds = useMemo(() => currentFolders.map((f) => f.id), [currentFolders])
  const collaboratorDocIds = useMemo(() => visibleDocIds.slice(0, 8), [visibleDocIds])
  const collaboratorFolderIds = useMemo(() => visibleFolderIds.slice(0, 8), [visibleFolderIds])

  const { data: documentCollaborators = {} } = useQuery({
    queryKey: ['hr', activeOrgId, 'doc-collaborator-map', collaboratorDocIds.join(',')],
    enabled: !!activeOrgId && !isEditorMode && collaboratorDocIds.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 300_000,
    queryFn: async () => {
      const pairs = await Promise.all(
        collaboratorDocIds.map(async (id) => {
          try {
            const response = await listHRDocumentCollaborators(activeOrgId!, id)
            return [id, response.data as HRDocumentShareRequest[]] as const
          } catch {
            return [id, [] as HRDocumentShareRequest[]] as const
          }
        }),
      )
      return Object.fromEntries(pairs) as Record<string, HRDocumentShareRequest[]>
    },
  })

  const { data: folderCollaborators = {} } = useQuery({
    queryKey: ['hr', activeOrgId, 'folder-collaborator-map', collaboratorFolderIds.join(',')],
    enabled: !!activeOrgId && !isEditorMode && collaboratorFolderIds.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 300_000,
    queryFn: async () => {
      const pairs = await Promise.all(
        collaboratorFolderIds.map(async (id) => {
          try {
            const response = await listHRDocumentFolderCollaborators(activeOrgId!, id)
            return [id, response.data as HRDocumentFolderShareRequest[]] as const
          } catch {
            return [id, [] as HRDocumentFolderShareRequest[]] as const
          }
        }),
      )
      return Object.fromEntries(pairs) as Record<string, HRDocumentFolderShareRequest[]>
    },
  })

  const editorDocument = useMemo(() => documents.find((d) => d.id === editorDocumentId) ?? null, [documents, editorDocumentId])
  const onlyOfficeContainerId = useMemo(() => (editorDocumentId ? `onlyoffice-editor-${editorDocumentId}` : "onlyoffice-editor"), [editorDocumentId])

  const modalCurrentCollaborators = useMemo(() => {
    if (!collaboratorTarget) return []
    return collaboratorTarget.kind === 'document'
      ? documentCollaborators[collaboratorTarget.id] ?? []
      : folderCollaborators[collaboratorTarget.id] ?? []
  }, [collaboratorTarget, documentCollaborators, folderCollaborators])

  const modalCollaboratorStatusByUserId = useMemo(() => {
    const result: Record<string, string> = {}
    for (const item of modalCurrentCollaborators) {
      result[item.target_user_id] = item.status
    }
    return result
  }, [modalCurrentCollaborators])

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => createHRDocumentFolder(activeOrgId!, { name, parent_id: currentFolderId }),
    onSuccess: () => {
      setCreateError('')
      setCreateOpen(false)
      setCreateStep('root')
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'folders'] })
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : 'Не удалось создать папку'
      setCreateError(msg)
      window.alert(msg)
    },
  })

  const createDocumentMutation = useMutation({
    mutationFn: (payload: {
      name: string
      fileUrl?: string | null
      fileName?: string | null
      contentType?: string | null
      size?: number
      generatedContent?: string
      openEditor?: boolean
    }) =>
      createHRDocument(activeOrgId!, {
        name: payload.name.trim(),
        document_type: 'other',
        status: 'draft',
        file_url: payload.fileUrl || null,
        meta_json: {
          category: 'company',
          folder_id: currentFolderId,
          file_name: payload.fileName || null,
          content_type: payload.contentType || null,
          size: payload.size || 0,
          generated_content: payload.generatedContent || '',
        },
      }),
    onSuccess: (response, payload) => {
      setCreateError('')
      setNewDocumentName('')
      setCreateOpen(false)
      setCreateStep('root')
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'documents'] })
      if (payload.openEditor) {
        setEditorDocumentId(response.data.id)
        setEditorHtml(resolveDocumentEditorContent(response.data))
      }
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : 'Не удалось создать документ'
      setCreateError(msg)
      window.alert(msg)
    },
  })

  const updateDocumentMutation = useMutation({
    mutationFn: ({ documentId, body }: { documentId: string; body: Record<string, unknown> }) =>
      updateHRDocument(activeOrgId!, documentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'documents'] })
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'document-versions'] })
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'doc-collaborator-map'] })
    },
  })

  const updateFolderMutation = useMutation({
    mutationFn: ({ folderId, body }: { folderId: string; body: Record<string, unknown> }) =>
      updateHRDocumentFolder(activeOrgId!, folderId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'folders'] })
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'folder-collaborator-map'] })
    },
  })


  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) => deleteHRDocument(activeOrgId!, documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'documents'] })
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'doc-collaborator-map'] })
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => deleteHRDocumentFolder(activeOrgId!, folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'folders'] })
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'folder-collaborator-map'] })
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'documents'] })
    },
  })

  const createShareRequestMutation = useMutation({
    mutationFn: ({ documentId, targetUserId }: { documentId: string; targetUserId: string }) =>
      createHRDocumentShareRequest(activeOrgId!, documentId, { target_user_id: targetUserId, permission: 'edit' }),
    onSuccess: () => {
      setCollaboratorSearch('')
      setSelectedCandidateId(null)
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'doc-collaborator-map'] })
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
    },
  })

  const createFolderShareRequestMutation = useMutation({
    mutationFn: ({ folderId, targetUserId }: { folderId: string; targetUserId: string }) =>
      createHRDocumentFolderShareRequest(activeOrgId!, folderId, { target_user_id: targetUserId, permission: 'edit' }),
    onSuccess: () => {
      setCollaboratorSearch('')
      setSelectedCandidateId(null)
      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'folder-collaborator-map'] })
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
    },
  })

  useEffect(() => {
    const onWindowClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (createRef.current && createRef.current.contains(target)) return
      if (contextMenuRef.current && contextMenuRef.current.contains(target)) return
      setCreateOpen(false)
      setContextMenu(null)
    }
    window.addEventListener('click', onWindowClick)
    return () => window.removeEventListener('click', onWindowClick)
  }, [])

  useEffect(() => {
    if (!editorDocumentId || !editorDirty || (onlyOfficePayload && !onlyOfficeLoadError)) return
    const timer = window.setTimeout(() => {
      const item = documents.find((d) => d.id === editorDocumentId)
      if (!item) return
      updateDocumentMutation.mutate({
        documentId: item.id,
        body: {
          meta_json: {
            ...(item.meta_json || {}),
            generated_content: editorHtml,
          },
        },
      })
      setEditorDirty(false)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [documents, editorDirty, editorDocumentId, editorHtml, onlyOfficeLoadError, onlyOfficePayload, updateDocumentMutation])

  async function openDocumentEditor(document: HRDocument) {
    setEditorDocumentId(document.id)
    setEditorHtml(resolveDocumentEditorContent(document))
    setOnlyOfficeLoadError('')

    if (!activeOrgId) return

    prefetchEditorAssets(document)

    const payloadQueryKey = ['hr', activeOrgId, 'document-editor-payload', document.id]
    const cachedPayload = qc.getQueryData<HRDocument>(payloadQueryKey)
    if (cachedPayload) {
      setEditorHtml(resolveDocumentEditorContent(cachedPayload))
    }

    try {
      const payload = await qc.fetchQuery({
        queryKey: payloadQueryKey,
        queryFn: () => getHRDocumentEditorPayload(activeOrgId, document.id).then((r) => r.data),
        staleTime: EDITOR_PREFETCH_STALE_MS,
      })
      setEditorHtml(resolveDocumentEditorContent(payload))
    } catch {
      // Keep lightweight fallback from list payload.
    }
  }

  useEffect(() => {
    if (!editorDocumentId || !onlyOfficePayload) return

    let disposed = false

    const mountOnlyOffice = async () => {
      setOnlyOfficeLoadError('')
      const scriptUrl = String(onlyOfficePayload.api_script_url || '/onlyoffice/web-apps/apps/api/documents/api.js')
      await loadOnlyOfficeScript(scriptUrl)
      if (disposed) return
      if (!window.DocsAPI?.DocEditor) {
        setOnlyOfficeLoadError('ONLYOFFICE API недоступен')
        return
      }

      onlyOfficeEditorRef.current?.destroyEditor?.()
      onlyOfficeEditorRef.current = new window.DocsAPI.DocEditor(
        onlyOfficeContainerId,
        patchOnlyOfficeBranding(onlyOfficePayload.config),
      )
    }

    void mountOnlyOffice().catch(() => {
      setOnlyOfficeLoadError('Не удалось загрузить ONLYOFFICE редактор')
    })

    return () => {
      disposed = true
      onlyOfficeEditorRef.current?.destroyEditor?.()
      onlyOfficeEditorRef.current = null
    }
  }, [editorDocumentId, onlyOfficeContainerId, onlyOfficePayload])

  function moveDocument(document: HRDocument, targetFolderId: string | null) {
    if (String(resolveFolderId(document) ?? '') === String(targetFolderId ?? '')) return
    updateDocumentMutation.mutate({
      documentId: document.id,
      body: {
        meta_json: {
          ...(document.meta_json || {}),
          folder_id: targetFolderId,
        },
      },
    })
  }

  function handleRenameDocument(document: HRDocument) {
    const name = renamingDocumentName.trim()
    if (!name || name === document.name) {
      setRenamingDocumentId(null)
      return
    }
    updateDocumentMutation.mutate({ documentId: document.id, body: { name } })
    setRenamingDocumentId(null)
  }

  function handleRenameFolder(folder: HRDocumentFolder) {
    const name = renamingFolderName.trim()
    if (!name || name === folder.name) {
      setRenamingFolderId(null)
      return
    }
    updateFolderMutation.mutate({ folderId: folder.id, body: { name } })
    setRenamingFolderId(null)
  }

  async function handleDownloadDocument(document: HRDocument) {
    if (activeOrgId) {
      try {
        const response = await fetchHRDocumentContent(activeOrgId, document.id, 'download')
        const contentTypeHeader = response.headers['content-type']
        const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : 'application/octet-stream'
        const blob = response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: contentType })
        const href = URL.createObjectURL(blob)
        const a = window.document.createElement('a')
        a.href = href
        a.download =
          fileNameFromDisposition(response.headers['content-disposition']) ||
          String((document.meta_json as Record<string, unknown>)?.file_name || `${document.name}.bin`)
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 1000)
        return
      } catch {
        // Fallback below.
      }
    }

    if (document.file_url) {
      const a = window.document.createElement('a')
      a.href = document.file_url
      a.download = String((document.meta_json as Record<string, unknown>)?.file_name || `${document.name}.txt`)
      a.target = '_blank'
      a.rel = 'noreferrer'
      a.click()
      return
    }

    const blob = new Blob([resolveDocumentEditorContent(document)], { type: 'text/html;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = href
    a.download = `${document.name}.html`
    a.click()
    URL.revokeObjectURL(href)
  }

  function handleDownloadFolder(folder: HRDocumentFolder) {
    const docs = documents.filter((d) => String(resolveFolderId(d) ?? '') === String(folder.id))
    const blob = new Blob(
      [
        JSON.stringify(
          {
            folder: folder.name,
            files: docs.map((d) => ({ id: d.id, name: d.name, updated_at: d.updated_at })),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json;charset=utf-8' },
    )
    const href = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = href
    a.download = `${folder.name}.json`
    a.click()
    URL.revokeObjectURL(href)
  }

  function openCollaboratorModal(target: CollaboratorTarget) {
    setCollaboratorTarget(target)
    setCollaboratorSearch('')
    setSelectedCandidateId(null)
  }

  function runContextAction(action: string) {
    if (!contextMenu) return
    if (contextMenu.kind === 'document') {
      const item = documents.find((d) => d.id === contextMenu.id)
      if (!item) return
      if (action === 'open') openDocumentEditor(item)
      if (action === 'rename') {
        setRenamingDocumentId(item.id)
        setRenamingDocumentName(item.name)
      }
      if (action === 'collaborators') openCollaboratorModal({ kind: 'document', id: item.id })
      if (action === 'pin') {
        updateDocumentMutation.mutate({
          documentId: item.id,
          body: { meta_json: { ...(item.meta_json || {}), pinned: !isDocumentPinned(item) } },
        })
      }
      if (action === 'download') void handleDownloadDocument(item)
      if (action === 'delete') {
        if (window.confirm(`Удалить документ "${item.name}"?`)) {
          deleteDocumentMutation.mutate(item.id)
        }
      }
    } else {
      const folder = folders.find((f) => f.id === contextMenu.id)
      if (!folder) return
      if (action === 'open') openFolder(folder.id)
      if (action === 'rename') {
        setRenamingFolderId(folder.id)
        setRenamingFolderName(folder.name)
      }
      if (action === 'collaborators') openCollaboratorModal({ kind: 'folder', id: folder.id })
      if (action === 'pin') {
        updateFolderMutation.mutate({
          folderId: folder.id,
          body: { meta_json: { ...(folder.meta_json || {}), pinned: !isFolderPinned(folder) } },
        })
      }
      if (action === 'download') handleDownloadFolder(folder)
      if (action === 'delete') {
        if (window.confirm(`Удалить папку "${folder.name}"?`)) {
          deleteFolderMutation.mutate(folder.id)
        }
      }
    }
    setContextMenu(null)
  }

  function applyEditorCommand(command: string) {
    editorRef.current?.focus()
    document.execCommand(command)
    setEditorHtml(editorRef.current?.innerHTML || '')
    setEditorDirty(true)
  }

  async function handleFileOpen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !activeOrgId) return
    try {
      const generatedContent = await extractFileEditorContent(file)
      const uploadResponse = await uploadHRDocumentFile(activeOrgId, {
        file,
        name: stripExt(file.name),
        folderId: currentFolderId,
        documentType: 'other',
        status: 'draft',
      })

      let documentPayload = uploadResponse.data
      if (generatedContent.trim().length > 0) {
        const updated = await updateHRDocument(activeOrgId, documentPayload.id, {
          meta_json: {
            ...(documentPayload.meta_json || {}),
            generated_content: generatedContent,
          },
        })
        documentPayload = updated.data
        setEditorDocumentId(documentPayload.id)
        setEditorHtml(resolveDocumentEditorContent(documentPayload))
      }

      qc.invalidateQueries({ queryKey: ['hr', activeOrgId, 'documents'] })
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : 'Не удалось загрузить файл'
      setCreateError(msg)
      window.alert(msg)
    } finally {
      event.target.value = ''
      setCreateOpen(false)
      setCreateStep('root')
    }
  }

  if (!activeOrgId) {
    return <EmptyState icon={Building2} title={t('company.noOrgSelected')} description={t('company.selectOrgHint')} />
  }

  if (editorDocument) {
    return (
      <div className="fixed inset-0 z-40 overflow-hidden bg-background">
        <div className="flex h-full min-h-0 flex-col p-4 lg:p-6">
          <PageHeader
            title={editorDocument.name}
            description="Редактирование документа"
            breadcrumbs={[
              { label: org?.orgName ?? 'Company', to: '/company' },
              { label: 'Documents', to: '/company/documents' },
              { label: editorDocument.name },
            ]}
            actions={(
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs"
                onClick={() => { setEditorDocumentId(null); navigate('/company/documents') }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Назад к списку
              </button>
            )}
          />

          <section className="mt-3 flex min-h-0 flex-1 rounded-xl border border-border bg-card overflow-hidden">
            {onlyOfficeConfigLoading ? (
              <div className="p-4">
                <LoadingSkeleton rows={8} />
              </div>
            ) : onlyOfficePayload && !onlyOfficeLoadError ? (
              <div className="relative h-full w-full bg-background">
                <div id={onlyOfficeContainerId} className="h-full w-full" />
                <div className="pointer-events-none absolute left-0 top-0 z-10 h-12 w-40 bg-[#1f1f1f]" aria-hidden="true" />
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-1 flex-col">
                <div className="border-b border-border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <button type="button" className="rounded px-2 py-1 hover:bg-background">Файл</button>
                    <button type="button" className="rounded px-2 py-1 hover:bg-background">Вставка</button>
                    <button type="button" className="rounded px-2 py-1 hover:bg-background">Формат</button>
                    <span className="mx-2 h-4 w-px bg-border" />
                    <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => applyEditorCommand('formatBlock')}>
                      H1
                    </button>
                    <button type="button" className="rounded border border-border px-2 py-1 text-xs font-bold" onClick={() => applyEditorCommand('bold')}>
                      B
                    </button>
                    <button type="button" className="rounded border border-border px-2 py-1 text-xs italic" onClick={() => applyEditorCommand('italic')}>
                      I
                    </button>
                    <button type="button" className="rounded border border-border px-2 py-1 text-xs underline" onClick={() => applyEditorCommand('underline')}>
                      U
                    </button>
                  </div>
                </div>
                <div
                  ref={editorRef}
                  className="min-h-0 flex-1 overflow-auto scroll-smooth bg-background px-4 py-4 text-base leading-7 text-foreground outline-none"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: editorHtml }}
                  onInput={(event) => {
                    setEditorHtml((event.currentTarget as HTMLDivElement).innerHTML)
                    setEditorDirty(true)
                  }}
                />
                {onlyOfficeLoadError || onlyOfficeConfigError ? (
                  <div className="border-t border-border bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    Редактор документа сейчас недоступен, открыт стандартный режим.
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <DocumentTemplatePanel clinicId={clinicId} />

      <PageHeader
        title="Документы"
        description="Создавайте документы и папки, делитесь доступом и редактируйте файлы."
        eyebrow={t('companyDocuments.eyebrow', 'Company Records')}
        breadcrumbs={[{ label: org?.orgName ?? 'Company', to: '/company' }, { label: 'Documents' }]}
        actions={(
          <div className="relative" ref={createRef}>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              onClick={(event) => {
                event.stopPropagation()
                setCreateError('')
                setCreateOpen((prev) => !prev)
                setCreateStep('root')
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Создать
            </button>
            {createOpen ? (
              <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-2xl">
                <div className="mb-2 rounded-lg border border-border/70 bg-background/40 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Создание
                </div>
                {createError ? (
                  <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-400">{createError}</div>
                ) : null}
                {createStep === 'root' ? (
                  <div className="space-y-1 text-sm">
                    <button
                      type="button"
                      className="w-full rounded-md border border-transparent px-2 py-2 text-left hover:border-border hover:bg-background"
                      onClick={() => {
                        setCreateError('')
                        setCreateStep('document')
                      }}
                    >
                      📄 Документ
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-md border border-transparent px-2 py-2 text-left hover:border-border hover:bg-background"
                      onClick={() => {
                        const nextName = window.prompt('Введите имя папки', 'Новая папка')?.trim()
                        if (!nextName) return
                        setCreateError('')
                        setCreateOpen(false)
                        createFolderMutation.mutate(nextName)
                      }}
                    >
                      📁 Папка
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-md border border-transparent px-2 py-2 text-left hover:border-border hover:bg-background"
                      onClick={() => {
                        setCreateError('')
                        setCreateOpen(false)
                        fileInputRef.current?.click()
                      }}
                    >
                      Открыть файл
                    </button>
                  </div>
                ) : null}
                {createStep === 'document' ? (
                  <div className="space-y-2 text-sm">
                    <div className="px-1 text-xs text-muted-foreground">Документ</div>
                    <button
                      type="button"
                      className="w-full rounded-md border border-border px-2 py-2 text-left hover:bg-background"
                      onClick={() => {
                        setCreateError('')
                        setNewDocumentName('Новый документ')
                        setCreateOpen(false)
                        setCreateStep('root')
                      }}
                    >
                      Создать
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-md border border-border px-2 py-2 text-left hover:bg-background"
                      onClick={() => {
                        setCreateError('')
                        setCreateOpen(false)
                        setCreateStep('root')
                        fileInputRef.current?.click()
                      }}
                    >
                      Открыть
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-background"
                      onClick={() => setCreateStep('root')}
                    >
                      ← Назад
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      />

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileOpen} />

      {newDocumentName !== '' ? (
        <section className="rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="auth-input max-w-sm"
              value={newDocumentName}
              onChange={(event) => setNewDocumentName(event.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="rounded-md border border-primary/40 bg-primary/15 px-2 py-1 text-xs text-primary hover:bg-primary/20 disabled:opacity-60"
              disabled={!newDocumentName.trim() || createDocumentMutation.isPending}
              onClick={() => createDocumentMutation.mutate({ name: newDocumentName, openEditor: true })}
            >
              Создать документ
            </button>
            <button type="button" className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => setNewDocumentName('')}>
              Отмена
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-card/70 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="auth-input h-9 w-full pl-9"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Поиск по имени документа или папки"
            />
          </div>
          <div className="inline-flex items-center gap-2 text-xs">
            <span className="rounded-full border border-border bg-background px-2 py-1 text-muted-foreground">
              Папок: {filteredCurrentFolders.length}
            </span>
            <span className="rounded-full border border-border bg-background px-2 py-1 text-muted-foreground">
              Документов: {filteredCurrentDocuments.length}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-0 overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <button type="button" className="mr-2 rounded border border-border px-2 py-0.5" onClick={() => openFolder(null)}>
            Корень
          </button>
          {breadcrumbs.map((folder) => (
            <button key={folder.id} type="button" className="mr-2 rounded border border-border px-2 py-0.5" onClick={() => openFolder(folder.id)}>
              {folder.name}
            </button>
          ))}
        </div>

        {isDocumentsLoading || isFoldersLoading ? (
          <div className="p-4">
            <LoadingSkeleton rows={6} />
          </div>
        ) : filteredCurrentFolders.length === 0 && filteredCurrentDocuments.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={FileText}
              title={normalizedFilterQuery ? 'Ничего не найдено' : 'Папка пуста'}
              description={normalizedFilterQuery ? 'Попробуйте изменить строку поиска.' : "Создайте документ или папку через кнопку 'Создать'."}
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Имя</th>
                <th className="px-3 py-2 font-medium">Состояние</th>
                <th className="px-3 py-2 font-medium">Дата изменения</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">Размер</th>
                <th className="px-3 py-2 font-medium">Collaborators</th>
                <th className="px-3 py-2 font-medium w-[56px]" />
              </tr>
            </thead>
            <tbody>
              {filteredCurrentFolders.map((folder) => {
                const collabs = folderCollaborators[folder.id] ?? []
                return (
                  <tr
                    key={folder.id}
                    className="border-b border-border/60 hover:bg-muted/20"
                    onDoubleClick={() => openFolder(folder.id)}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openContextMenu('folder', folder.id, event.clientX, event.clientY)
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (!dragDocumentId) return
                      const docItem = documents.find((d) => d.id === dragDocumentId)
                      if (!docItem) return
                      moveDocument(docItem, folder.id)
                      setDragDocumentId(null)
                    }}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-amber-400" />
                        {renamingFolderId === folder.id ? (
                          <input
                            className="auth-input h-8"
                            value={renamingFolderName}
                            onChange={(event) => setRenamingFolderName(event.target.value)}
                            onBlur={() => handleRenameFolder(folder)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') handleRenameFolder(folder)
                              if (event.key === 'Escape') setRenamingFolderId(null)
                            }}
                            autoFocus
                          />
                        ) : (
                          <span>{folder.name}{isFolderPinned(folder) ? ' • закреплено' : ''}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-emerald-400"><CheckCircle2 className="h-4 w-4" /></td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(folder.updated_at || folder.created_at)}</td>
                    <td className="px-3 py-2 text-muted-foreground">Папка</td>
                    <td className="px-3 py-2 text-muted-foreground">-</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        {collabs.slice(0, 4).map((item) => (
                          <AvatarImage
                            key={item.id}
                            src={item.target_user_avatar_url}
                            name={item.target_user_name || item.target_user_email || item.target_user_id}
                            className="-ml-1 h-6 w-6 rounded-full ring-2 ring-card first:ml-0"
                          />
                        ))}
                        {collabs.length > 4 ? <span className="ml-1 text-xs text-muted-foreground">+{collabs.length - 4}</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-background"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          openContextMenu('folder', folder.id, event.clientX, event.clientY)
                        }}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredCurrentDocuments.map((document) => {
                const collabs = documentCollaborators[document.id] ?? []
                const size = Number((document.meta_json as Record<string, unknown>)?.size || 0)
                return (
                  <tr
                    key={document.id}
                    className="border-b border-border/60 hover:bg-muted/20 cursor-pointer"
                    draggable
                    onDragStart={() => setDragDocumentId(document.id)}
                    onMouseEnter={() => prefetchEditorAssets(document)}
                    onFocus={() => prefetchEditorAssets(document)}
                    onClick={() => void openDocumentEditor(document)}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openContextMenu('document', document.id, event.clientX, event.clientY)
                    }}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {renamingDocumentId === document.id ? (
                          <input
                            className="auth-input h-8"
                            value={renamingDocumentName}
                            onChange={(event) => setRenamingDocumentName(event.target.value)}
                            onBlur={() => handleRenameDocument(document)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') handleRenameDocument(document)
                              if (event.key === 'Escape') setRenamingDocumentId(null)
                            }}
                            autoFocus
                          />
                        ) : (
                          <span>{document.name}{isDocumentPinned(document) ? ' • закреплен' : ''}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-emerald-400"><CheckCircle2 className="h-4 w-4" /></td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(document.updated_at)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{document.document_type || 'Документ'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatBytes(size)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        {collabs.slice(0, 4).map((item) => (
                          <AvatarImage
                            key={item.id}
                            src={item.target_user_avatar_url}
                            name={item.target_user_name || item.target_user_email || item.target_user_id}
                            className="-ml-1 h-6 w-6 rounded-full ring-2 ring-card first:ml-0"
                          />
                        ))}
                        {collabs.length > 4 ? <span className="ml-1 text-xs text-muted-foreground">+{collabs.length - 4}</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-background"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          openContextMenu('document', document.id, event.clientX, event.clientY)
                        }}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {contextMenu ? (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-52 rounded-xl border border-border bg-card p-1.5 shadow-2xl"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          {contextMenu.kind === 'document' ? (
            <>
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Документ</p>
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-background" onClick={() => runContextAction('open')}>Открыть</button>
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-background" onClick={() => runContextAction('rename')}>Переименовать</button>
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-background" onClick={() => runContextAction('collaborators')}>Доступ</button>
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-background" onClick={() => runContextAction('pin')}>Закрепить</button>
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-background" onClick={() => runContextAction('download')}>Скачать</button>
              <div className="my-1 h-px bg-border" />
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs text-red-400 hover:bg-red-500/10" onClick={() => runContextAction('delete')}>Удалить</button>
            </>
          ) : (
            <>
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Папка</p>
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-background" onClick={() => runContextAction('open')}>Открыть</button>
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-background" onClick={() => runContextAction('rename')}>Переименовать</button>
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-background" onClick={() => runContextAction('collaborators')}>Доступ</button>
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-background" onClick={() => runContextAction('pin')}>Закрепить</button>
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-background" onClick={() => runContextAction('download')}>Скачать</button>
              <div className="my-1 h-px bg-border" />
              <button type="button" className="block w-full rounded px-2 py-1 text-left text-xs text-red-400 hover:bg-red-500/10" onClick={() => runContextAction('delete')}>Удалить</button>
            </>
          )}
        </div>
      ) : null}

      {collaboratorTarget ? (
        <div className="fixed inset-0 z-50 bg-black/60 p-4" onClick={() => setCollaboratorTarget(null)}>
          <div className="mx-auto mt-10 w-full max-w-3xl rounded-2xl border border-border bg-[#0d1117] p-4 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xl font-semibold">Управление доступом</p>
                <p className="text-sm text-slate-300">Поиск по имени, email или ИИН</p>
              </div>
              <button type="button" className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10" onClick={() => setCollaboratorTarget(null)}>
                Закрыть
              </button>
            </div>

            <div className="mb-3 rounded-lg border border-white/15 bg-[#010409] p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Текущий доступ</p>
              <div className="flex flex-wrap items-center gap-2">
                {modalCurrentCollaborators.length === 0 ? (
                  <span className="text-xs text-slate-500">Доступ пока никому не выдан</span>
                ) : (
                  modalCurrentCollaborators.map((item) => (
                    <div key={item.id} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2 py-1">
                      <AvatarImage
                        src={item.target_user_avatar_url}
                        name={item.target_user_name || item.target_user_email || item.target_user_id}
                        className="h-5 w-5 rounded-full"
                      />
                      <span className="text-xs">
                        {item.target_user_name || item.target_user_email || item.target_user_id}
                      </span>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${collaboratorStatusClass(item.status)}`}>
                        {collaboratorStatusLabel(item.status)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mb-3 rounded-lg border border-white/15 bg-[#010409] p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Добавить пользователя</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="w-full rounded-lg border border-white/20 bg-[#0b111a] px-9 py-2 text-sm outline-none focus:border-emerald-400/70"
                  value={collaboratorSearch}
                  onChange={(event) => {
                    setCollaboratorSearch(event.target.value)
                    setSelectedCandidateId(null)
                  }}
                  placeholder="Введите имя, email или ИИН"
                />
              </div>
            </div>

            <div className="mb-4 max-h-[360px] overflow-auto rounded-lg border border-white/15 bg-[#010409]">
              {collaboratorSearch.trim().length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-400">Введите хотя бы 1 символ для поиска.</p>
              ) : shareCandidates.length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-400">Пользователи не найдены.</p>
              ) : (
                shareCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className={`flex w-full items-center gap-3 border-b border-white/10 px-3 py-2 text-left hover:bg-white/5 ${
                      selectedCandidateId === candidate.id ? 'bg-white/10' : ''
                    }`}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                  >
                    <AvatarImage
                      src={candidate.avatar_url}
                      name={candidate.full_name || candidate.email || candidate.iin || candidate.id}
                      className="h-9 w-9 rounded-full"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {candidate.full_name || candidate.email || candidate.iin || candidate.id}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {candidate.email || '-'}
                        {candidate.telegram_username ? ` • @${candidate.telegram_username}` : ''}
                        {candidate.instagram_username ? ` • @${candidate.instagram_username}` : ''}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2 pl-2">
                      {modalCollaboratorStatusByUserId[candidate.id] ? (
                        <span className={`rounded-full border px-2 py-1 text-[11px] ${collaboratorStatusClass(modalCollaboratorStatusByUserId[candidate.id])}`}>
                          {collaboratorStatusLabel(modalCollaboratorStatusByUserId[candidate.id])}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                        disabled={
                          Boolean(modalCollaboratorStatusByUserId[candidate.id]) ||
                          createShareRequestMutation.isPending ||
                          createFolderShareRequestMutation.isPending
                        }
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedCandidateId(candidate.id)
                          if (collaboratorTarget?.kind === 'document') {
                            createShareRequestMutation.mutate({
                              documentId: collaboratorTarget.id,
                              targetUserId: candidate.id,
                            })
                          } else if (collaboratorTarget?.kind === 'folder') {
                            createFolderShareRequestMutation.mutate({
                              folderId: collaboratorTarget.id,
                              targetUserId: candidate.id,
                            })
                          }
                        }}
                      >
                        {modalCollaboratorStatusByUserId[candidate.id] ? 'Добавлен' : 'Пригласить'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button type="button" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10" onClick={() => setCollaboratorTarget(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
