// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { Archive, ArchiveRestore, Bell, BellOff, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronUp, Copy, Forward, Languages, Loader2, Maximize2, MessageCircle, Mic, MicOff, Minimize2, MoreVertical, Paperclip, Pause, Pencil, Phone, PhoneIncoming, PhoneOff, Pin, PinOff, Play, Plus, Reply, Search, Send, Square, Trash2, Users, Video, VideoOff, X } from 'lucide-react'
import { AvatarImage } from '@/components/shared/AvatarImage'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { useOrgStore } from '@/stores/orgStore'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useUsers } from '@/hooks/useAdmin'
import {
  createDirectMessengerThread,
  createGroupMessengerThread,
  createMessengerCallEvent,
  deleteMessengerGroupAvatar,
  removeMessengerGroupAdmin,
  removeMessengerGroupMember,
  addMessengerGroupAdmin,
  updateMessengerGroupAdmin,
  updateMessengerGroupThread,
  uploadMessengerGroupAvatar,
  forwardMessengerMessage,
  getMessengerThread,
  getMessengerIceServers,
  getMessengerThreadEncryption,
  getMyMessengerKeyBundle,
  initializeMessengerThreadEncryption,
  listMessengerThreads,
  markMessengerThreadRead,
  pinMessengerMessage,
  sendMessengerMessage,
  transcribeMessengerAttachment,
  translateMessengerMessage,
  unpinMessengerMessage,
  updateMessengerThreadSettings,
  updateMessengerMessage,
  upsertMyMessengerKeyBundle,
  deleteMessengerMessage,
} from '@/api/messenger'
import { getUserOnlineStatus } from '@/lib/presence'
import i18n from '@/i18n'
import type { SupportMessage, SupportMessageAttachment, SupportThread, User } from '@/types'
import { toast } from 'sonner'
import { getNotificationFeed, markNotificationRead, markMessengerNotificationsRead } from '@/api/notifications'
import { createThreadKeyEnvelope, decryptCallSignalPayload, decryptMessengerBinary, decryptMessengerText, decryptThreadKeyEnvelope, encryptCallSignalPayload, encryptMessengerBinary, encryptMessengerText, ensureLocalMessengerIdentity, generateThreadSharedKey, getStoredThreadKey, storeThreadKey, type MessengerEncryptedAttachmentMeta, type MessengerEncryptedPayload, type MessengerThreadKeyEnvelope, type MessengerUserPublicKeyBundle } from '@/lib/messengerCrypto'

function formatRelativeTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)
  const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' })
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute')
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')
  const diffDays = Math.round(diffHours / 24)
  return rtf.format(diffDays, 'day')
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const message = detail
      .map((item) => (item && typeof item === 'object' && 'msg' in item ? String((item as { msg?: unknown }).msg || '') : ''))
      .filter(Boolean)
      .join('; ')
    if (message) return message
  }
  return fallback
}

function getApiErrorStatus(error: unknown) {
  const status = (error as { response?: { status?: unknown } })?.response?.status
  return typeof status === 'number' ? status : null
}

function getThreadPartner(thread: SupportThread, currentUserId?: string | null) {
  const profiles = Array.isArray(thread.participant_profiles) ? thread.participant_profiles : []
  return profiles.find((item) => item.id !== currentUserId) ?? profiles[0] ?? null
}

function getThreadTitle(thread: SupportThread, currentUserId?: string | null) {
  if (thread.thread_kind === 'group') return thread.subject
  return getThreadPartner(thread, currentUserId)?.name || thread.subject
}

function getThreadSubtitle(thread: SupportThread, currentUserId?: string | null) {
  if (thread.thread_kind === 'group') {
    const count = Array.isArray(thread.participant_ids) ? thread.participant_ids.length : 0
    return count > 0 ? `${count} участников` : 'Групповой чат'
  }
  return getThreadPartner(thread, currentUserId)?.role || 'Сотрудник'
}

function getMessageAuthorProfile(message: SupportMessage, thread: SupportThread | null, users: User[]) {
  if (!thread) return null
  const profile = (thread.participant_profiles || []).find((item) => item.id === message.author_id)
  if (profile) return {
    name: profile.name || message.author_name || 'Сотрудник',
    avatarUrl: profile.avatar_url || null,
  }
  const user = users.find((item) => item.id === message.author_id)
  return user ? {
    name: user.full_name || user.email || message.author_name || 'Сотрудник',
    avatarUrl: user.avatar_url || null,
  } : {
    name: message.author_name || 'Сотрудник',
    avatarUrl: null,
  }
}

function getDefaultGroupPermissions() {
  return {
    manage_info: true,
    manage_members: true,
    manage_admins: true,
  }
}

function getParticipantGroupPermissions(participant: NonNullable<SupportThread['participant_profiles']>[number]) {
  return {
    ...getDefaultGroupPermissions(),
    ...(participant.group_permissions || {}),
  }
}

function isDirectMessengerThread(thread?: Pick<SupportThread, 'thread_kind'> | null) {
  return thread?.thread_kind === 'direct'
}

function getThreadSearchText(thread: SupportThread, currentUserId?: string | null) {
  return [getThreadTitle(thread, currentUserId), thread.subject, thread.last_message_preview, ...((thread.participant_profiles || []).map((item) => item.name || ''))]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function formatLastSeenLabel(user: Pick<User, 'last_seen_at'>) {
  if (!user.last_seen_at) return 'Был(а) давно'
  if (getUserOnlineStatus(user) === 'online') return 'Онлайн'
  const date = new Date(user.last_seen_at)
  if (Number.isNaN(date.getTime())) return 'Был(а) давно'
  const now = new Date()
  const isSameDay = now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth() && now.getDate() === date.getDate()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = yesterday.getFullYear() === date.getFullYear() && yesterday.getMonth() === date.getMonth() && yesterday.getDate() === date.getDate()
  if (isSameDay || isYesterday) {
    return `Был(а) в сети в ${new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date)}`
  }
  return `Был(а) в сети ${new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)}`
}

function getPresenceLabel(user: Pick<User, 'last_seen_at'>) {
  return formatLastSeenLabel(user)
}

function getTypingLabel(names: string[], isDirectThread: boolean) {
  if (names.length === 0) return ''
  if (isDirectThread) return 'печатает...'
  if (names.length === 1) return `${names[0]} печатает...`
  if (names.length === 2) return `${names[0]} и ${names[1]} печатают...`
  return `${names[0]} и ещё ${names.length - 1} печатают...`
}
function isImageAttachment(contentType?: string | null) {
  return Boolean(contentType && contentType.startsWith('image/'))
}

function isAudioAttachment(contentType?: string | null) {
  return Boolean(contentType && contentType.startsWith('audio/'))
}

function formatFileSize(size?: number | null) {
  if (!size) return ''
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 102.4) / 10)} KB`
  return `${Math.round(size / (1024 * 102.4)) / 10} MB`
}

type AttachmentTranscript = {
  text?: string
  language?: string | null
  duration_seconds?: number
  model?: string
  updated_at?: string
}

function getAttachmentTranscript(message: SupportMessage, attachmentId: string): AttachmentTranscript | null {
  const raw = message.meta_json?.attachment_transcripts
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = (raw as Record<string, unknown>)[attachmentId]
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as AttachmentTranscript
}

function getPendingFilesPreview(files: File[]) {
  const firstFile = files[0]
  if (!firstFile) return ''
  if (firstFile.type.startsWith('image/')) return 'Изображение'
  if (firstFile.type.startsWith('audio/')) return 'Голосовое сообщение'
  return 'Вложение'
}

function getAttachmentCacheKey(messageId: string, attachmentId: string) {
  return `${messageId}:${attachmentId}`
}

function getAttachmentEncryptionMeta(attachment: SupportMessageAttachment): MessengerEncryptedAttachmentMeta | null {
  const raw = attachment.encryption
  if (!raw?.encrypted_blob || !raw.iv_b64) return null
  return {
    scheme: (raw.scheme as 'messenger-e2ee-v1' | undefined) || 'messenger-e2ee-v1',
    algorithm: (raw.algorithm as 'AES-GCM' | undefined) || 'AES-GCM',
    iv_b64: raw.iv_b64,
    key_version: Number(raw.key_version || 1),
    encrypted_blob: true,
    original_size_bytes: typeof raw.original_size_bytes === 'number' ? raw.original_size_bytes : undefined,
  }
}

function canUseRealtimeMedia() {
  if (typeof window === 'undefined') return false
  return window.isSecureContext && typeof window.MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

function getMediaFeatureErrorMessage(feature: 'voice' | 'audio' | 'video') {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Голосовые сообщения и звонки работают только через защищённое подключение — HTTPS или localhost. Сейчас страница открыта по обычному HTTP, поэтому браузер блокирует доступ к микрофону и камере.'
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return feature === 'voice'
      ? 'Этот браузер не даёт доступ к записи голоса на текущем устройстве.'
      : 'Этот браузер не даёт доступ к микрофону и камере на текущем устройстве.'
  }
  return feature === 'video'
    ? 'Нет доступа к камере и микрофону. Проверьте разрешения браузера.'
    : feature === 'audio'
      ? 'Нет доступа к микрофону. Проверьте разрешения браузера.'
      : 'Не удалось получить доступ к микрофону.'
}

function resolveAttachmentUrl(url?: string | null, token?: string | null) {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('blob:')) return url

  let normalizedUrl = url
  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(url, window.location.origin)
      const sameHost = parsed.hostname === window.location.hostname
      if (sameHost) {
        normalizedUrl = `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
      } else if (!/^https?:\/\//i.test(url)) {
        normalizedUrl = parsed.toString()
      }
    } catch {
      normalizedUrl = url
    }
  }

  if (!token) return normalizedUrl
  if (/^https?:\/\//i.test(normalizedUrl)) {
    if (!normalizedUrl.includes('/chat/threads/')) return normalizedUrl
    const joiner = normalizedUrl.includes('?') ? '&' : '?'
    return `${normalizedUrl}${joiner}token=${encodeURIComponent(token)}`
  }
  const joiner = normalizedUrl.includes('?') ? '&' : '?'
  return `${normalizedUrl}${joiner}token=${encodeURIComponent(token)}`
}

function formatDayLabel(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function buildPendingFileKey(file: File) {
  return `${file.name}:${file.size}:${file.type}:${file.lastModified}`
}

function getChatWallpaperStorageKey(orgId?: string | null, threadId?: string | null) {
  if (!orgId || !threadId) return ''
  return `messenger-wallpaper:${orgId}:${threadId}`
}

const CHAT_WALLPAPER_PRESETS = [
  {
    id: 'telegram-blue',
    label: 'Синий',
    darkValue: 'linear-gradient(180deg, rgba(79, 139, 245, 0.24) 0%, rgba(12, 19, 34, 0.88) 100%), radial-gradient(circle at 20% 20%, rgba(117, 187, 255, 0.28) 0%, transparent 32%), radial-gradient(circle at 80% 0%, rgba(67, 119, 255, 0.2) 0%, transparent 28%), #0f172a',
    lightValue: 'linear-gradient(180deg, rgba(120, 177, 255, 0.35) 0%, rgba(244, 248, 255, 0.96) 100%), radial-gradient(circle at 16% 18%, rgba(147, 197, 253, 0.55) 0%, transparent 30%), radial-gradient(circle at 84% 8%, rgba(96, 165, 250, 0.34) 0%, transparent 26%), #eef5ff',
  },
  {
    id: 'telegram-green',
    label: 'Мятный',
    darkValue: 'linear-gradient(180deg, rgba(50, 191, 149, 0.16) 0%, rgba(12, 19, 34, 0.9) 100%), radial-gradient(circle at 15% 15%, rgba(74, 222, 128, 0.22) 0%, transparent 30%), radial-gradient(circle at 82% 18%, rgba(45, 212, 191, 0.18) 0%, transparent 26%), #0f172a',
    lightValue: 'linear-gradient(180deg, rgba(139, 233, 205, 0.35) 0%, rgba(244, 255, 251, 0.96) 100%), radial-gradient(circle at 16% 16%, rgba(110, 231, 183, 0.45) 0%, transparent 30%), radial-gradient(circle at 84% 16%, rgba(45, 212, 191, 0.28) 0%, transparent 26%), #ecfdf5',
  },
  {
    id: 'telegram-night',
    label: 'Ночь',
    darkValue: 'linear-gradient(180deg, rgba(94, 92, 230, 0.16) 0%, rgba(8, 11, 21, 0.94) 100%), radial-gradient(circle at 50% 0%, rgba(129, 140, 248, 0.18) 0%, transparent 34%), radial-gradient(circle at 12% 80%, rgba(56, 189, 248, 0.12) 0%, transparent 24%), #020617',
    lightValue: 'linear-gradient(180deg, rgba(180, 189, 255, 0.34) 0%, rgba(248, 249, 255, 0.98) 100%), radial-gradient(circle at 50% 0%, rgba(165, 180, 252, 0.32) 0%, transparent 34%), radial-gradient(circle at 15% 82%, rgba(125, 211, 252, 0.24) 0%, transparent 24%), #f5f7ff',
  },
  {
    id: 'telegram-sunset',
    label: 'Закат',
    darkValue: 'linear-gradient(180deg, rgba(249, 115, 22, 0.18) 0%, rgba(12, 19, 34, 0.9) 100%), radial-gradient(circle at 20% 20%, rgba(251, 191, 36, 0.18) 0%, transparent 28%), radial-gradient(circle at 85% 8%, rgba(244, 114, 182, 0.18) 0%, transparent 24%), #111827',
    lightValue: 'linear-gradient(180deg, rgba(255, 206, 147, 0.42) 0%, rgba(255, 247, 237, 0.98) 100%), radial-gradient(circle at 22% 18%, rgba(253, 224, 71, 0.32) 0%, transparent 28%), radial-gradient(circle at 85% 8%, rgba(251, 113, 133, 0.28) 0%, transparent 24%), #fff7ed',
  },
  {
    id: 'telegram-lavender',
    label: 'Лаванда',
    darkValue: 'linear-gradient(180deg, rgba(168, 85, 247, 0.18) 0%, rgba(17, 24, 39, 0.92) 100%), radial-gradient(circle at 18% 18%, rgba(196, 181, 253, 0.24) 0%, transparent 30%), radial-gradient(circle at 80% 12%, rgba(244, 114, 182, 0.16) 0%, transparent 22%), #111827',
    lightValue: 'linear-gradient(180deg, rgba(221, 214, 254, 0.45) 0%, rgba(250, 245, 255, 0.98) 100%), radial-gradient(circle at 18% 18%, rgba(196, 181, 253, 0.42) 0%, transparent 30%), radial-gradient(circle at 82% 12%, rgba(244, 114, 182, 0.2) 0%, transparent 24%), #faf5ff',
  },
  {
    id: 'telegram-sand',
    label: 'Песок',
    darkValue: 'linear-gradient(180deg, rgba(194, 159, 97, 0.14) 0%, rgba(15, 23, 42, 0.92) 100%), radial-gradient(circle at 18% 18%, rgba(253, 224, 71, 0.12) 0%, transparent 26%), radial-gradient(circle at 85% 12%, rgba(251, 191, 36, 0.14) 0%, transparent 24%), #111827',
    lightValue: 'linear-gradient(180deg, rgba(245, 222, 179, 0.45) 0%, rgba(255, 251, 235, 0.98) 100%), radial-gradient(circle at 16% 18%, rgba(252, 211, 77, 0.24) 0%, transparent 26%), radial-gradient(circle at 84% 14%, rgba(245, 158, 11, 0.16) 0%, transparent 22%), #fffbeb',
  },
] as const

function getWallpaperPresetStorageValue(presetId: string) {
  return `preset:${presetId}`
}

function resolveWallpaperPresetValue(value: string | null | undefined, isDark: boolean) {
  if (!value || !value.startsWith('preset:')) return value || ''
  const preset = CHAT_WALLPAPER_PRESETS.find((item) => item.id === value.replace('preset:', ''))
  if (!preset) return ''
  return isDark ? preset.darkValue : preset.lightValue
}

function normalizeWallpaperStorageValue(value: string | null | undefined) {
  if (!value) return ''
  if (value.startsWith('preset:')) return value
  const preset = CHAT_WALLPAPER_PRESETS.find((item) => item.darkValue === value || item.lightValue === value)
  return preset ? getWallpaperPresetStorageValue(preset.id) : value
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'))
    reader.readAsDataURL(file)
  })
}

function buildChatWallpaperStyle(value?: string | null, isDark = true) {
  const resolvedValue = resolveWallpaperPresetValue(value, isDark)
  if (!resolvedValue) return undefined
  const isImage = resolvedValue.startsWith('data:image') || /^https?:\/\//i.test(resolvedValue) || resolvedValue.startsWith('/')
  if (isImage) {
    return {
      backgroundImage: `linear-gradient(${isDark ? 'rgba(8, 12, 22, 0.68), rgba(8, 12, 22, 0.68)' : 'rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.42)'}), url(${JSON.stringify(resolvedValue)})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }
  return {
    backgroundImage: resolvedValue,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}

function upsertThread(list: SupportThread[], thread: SupportThread) {
  const next = [thread, ...list.filter((item) => item.id !== thread.id)]
  return next.sort((left, right) => {
    const pinnedDiff = Number(Boolean(right.is_pinned)) - Number(Boolean(left.is_pinned))
    if (pinnedDiff !== 0) return pinnedDiff
    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  })
}

function updateReadState(thread: SupportThread | null, messageIds: string[], userId: string, readAt?: string | null) {
  if (!thread) return thread
  const messages = (thread.messages || []).map((message) => {
    if (!messageIds.includes(message.id)) return message
    const readBy = Array.isArray(message.read_by) ? message.read_by : []
    const readAtMap = { ...(message.read_at_map || {}) }
    if (!readBy.includes(userId)) readBy.push(userId)
    if (readAt) readAtMap[userId] = readAt
    return { ...message, read_by: readBy, read_at_map: readAtMap }
  })
  return { ...thread, messages }
}

function getMessageReadState(message: SupportMessage, thread: SupportThread, currentUserId?: string | null) {
  if (!currentUserId || message.author_id !== currentUserId) return null
  const participants = (thread.participant_ids || []).filter((id) => id !== currentUserId)
  if (participants.length === 0) return null
  const readBy = message.read_by || []
  const readByOthers = participants.filter((id) => readBy.includes(id))
  return readByOthers.length > 0 ? 'read' : 'sent'
}

function preserveEncryptedMessageBody(existing: SupportMessage | undefined, incoming: SupportMessage) {
  if (incoming.encryption?.ciphertext_b64 && !incoming.body && existing?.body) {
    return { ...incoming, body: existing.body }
  }
  return incoming
}

function getMessagePreview(message: SupportMessage, fallbackPreview = '') {
  if (message.encryption?.ciphertext_b64) {
    return message.body || 'Зашифрованное сообщение'
  }
  if (message.body) return message.body
  if (message.attachments?.[0]?.content_type?.startsWith('image/')) return 'Изображение'
  if (message.attachments?.[0]?.content_type?.startsWith('audio/')) return 'Голосовое сообщение'
  if (message.attachments?.length) return 'Вложение'
  return fallbackPreview
}

function getThreadPreviewFromMessages(messages: SupportMessage[], fallbackPreview = '') {
  const lastMessage = messages[messages.length - 1]
  return lastMessage ? getMessagePreview(lastMessage, fallbackPreview) : fallbackPreview
}

function upsertMessage(thread: SupportThread | null, message: SupportMessage) {
  if (!thread) return thread
  const messages = [...(thread.messages || [])]
  const index = messages.findIndex((item) => item.id === message.id)
  const normalizedMessage = preserveEncryptedMessageBody(index >= 0 ? messages[index] : undefined, message)
  if (index >= 0) messages[index] = normalizedMessage
  else messages.push(normalizedMessage)
  const preview = getThreadPreviewFromMessages(messages, thread.last_message_preview || '')
  return { ...thread, messages, last_message_preview: preview, updated_at: normalizedMessage.created_at || thread.updated_at }
}

function removeMessage(thread: SupportThread | null, messageId: string) {
  if (!thread) return thread
  const messages = (thread.messages || []).filter((item) => item.id !== messageId)
  return { ...thread, messages, last_message_preview: getThreadPreviewFromMessages(messages, thread.last_message_preview || '') }
}

function mergeMessagePages(olderMessages: SupportMessage[], currentMessages: SupportMessage[]) {
  const byId = new Map<string, SupportMessage>()
  for (const message of [...olderMessages, ...currentMessages]) {
    byId.set(message.id, preserveEncryptedMessageBody(byId.get(message.id), message))
  }
  return Array.from(byId.values()).sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
}

function clearThreadUnread(thread: SupportThread | null, threadId: string) {
  if (!thread || thread.id !== threadId) return thread
  return { ...thread, unread_count: 0 }
}

function clearThreadUnreadInList(threads: SupportThread[], threadId: string) {
  return threads.map((thread) => thread.id === threadId ? { ...thread, unread_count: 0 } : thread)
}

function normalizeOpenedThread(thread: SupportThread, openedThreadId?: string | null) {
  if (!openedThreadId || thread.id !== openedThreadId) return thread
  return { ...thread, unread_count: 0 }
}

function buildMessengerWebSocketUrl(token: string, orgId: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/messenger-api/api/v1/ws/chat?token=${encodeURIComponent(token)}&org_id=${encodeURIComponent(orgId)}`
}

let sharedAudioContext: AudioContext | null = null

function getSharedAudioContext() {
  if (typeof window === 'undefined') return null
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return null
    sharedAudioContext = new AudioContextClass()
  }
  return sharedAudioContext
}

function unlockSharedAudioContext() {
  const ctx = getSharedAudioContext()
  if (!ctx) return Promise.resolve(false)
  if (ctx.state === 'running') return Promise.resolve(true)
  return ctx.resume().then(() => true).catch(() => false)
}

/* ─── Call sound generators (Web Audio API) ─── */

function createRingtone() {
  const ctx = getSharedAudioContext()
  if (!ctx) return { stop() {} }
  const gain = ctx.createGain()
  gain.gain.value = 0.16
  gain.connect(ctx.destination)
  let stopped = false
  let timerId: number | null = null

  const playNote = (frequency: number, startAt: number, duration: number, type: OscillatorType = 'triangle') => {
    const osc = ctx.createOscillator()
    const pulse = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, startAt)
    pulse.gain.setValueAtTime(0.0001, startAt)
    pulse.gain.exponentialRampToValueAtTime(0.18, startAt + 0.04)
    pulse.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    osc.connect(pulse)
    pulse.connect(gain)
    osc.start(startAt)
    osc.stop(startAt + duration)
    osc.onended = () => pulse.disconnect()
  }

  const playTone = () => {
    if (stopped) return
    const now = ctx.currentTime
    playNote(784, now, 0.38)
    playNote(1046, now + 0.16, 0.34, 'sine')
    playNote(784, now + 0.82, 0.38)
    playNote(1174, now + 0.98, 0.34, 'sine')
    timerId = window.setTimeout(playTone, 2600)
  }

  void unlockSharedAudioContext().finally(playTone)
  return {
    stop() {
      stopped = true
      if (timerId) window.clearTimeout(timerId)
      gain.disconnect()
    },
  }
}

function playNotificationChime() {
  const ctx = getSharedAudioContext()
  if (!ctx) return

  const playNote = (frequency: number, delay: number, duration: number, volume: number, type: OscillatorType = 'sine') => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const startAt = ctx.currentTime + delay
    osc.type = type
    osc.frequency.setValueAtTime(frequency, startAt)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + duration + 0.02)
    osc.onended = () => gain.disconnect()
  }

  void unlockSharedAudioContext().then((unlocked) => {
    if (!unlocked) return
    playNote(1046, 0, 0.14, 0.08, 'sine')
    playNote(1318, 0.11, 0.12, 0.06, 'triangle')
  })
}

function createDialTone() {
  const ctx = getSharedAudioContext()
  if (!ctx) return { stop() {} }
  const gain = ctx.createGain()
  gain.gain.value = 0.12
  gain.connect(ctx.destination)
  let stopped = false
  let timerId: number | null = null

  const playBeep = () => {
    if (stopped) return
    const osc = ctx.createOscillator()
    const pulse = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(425, ctx.currentTime)
    pulse.gain.setValueAtTime(0.0001, ctx.currentTime)
    pulse.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    pulse.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7)
    osc.connect(pulse)
    pulse.connect(gain)
    const now = ctx.currentTime
    osc.start(now)
    osc.stop(now + 0.7)
    osc.onended = () => {
      pulse.disconnect()
      if (!stopped) timerId = window.setTimeout(playBeep, 1900)
    }
  }

  void unlockSharedAudioContext().finally(playBeep)
  return {
    stop() {
      stopped = true
      if (timerId) window.clearTimeout(timerId)
      gain.disconnect()
    },
  }
}

function formatCallDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatMessageClock(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function scrollViewportToBottom(viewport: HTMLDivElement | null, behavior: ScrollBehavior = 'smooth') {
  if (!viewport) return
  viewport.scrollTo({ top: viewport.scrollHeight, behavior })
}

function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window
}

function shouldUseBrowserNotifications() {
  if (typeof document === 'undefined') return false
  return document.visibilityState !== 'visible' || !document.hasFocus()
}

function getBrowserNotificationPermission() {
  if (!canUseBrowserNotifications()) return 'denied' as NotificationPermission
  return Notification.permission
}

function getLatestAuthToken(fallbackToken?: string | null) {
  const stateToken = useAuthStore.getState().token
  if (stateToken) return stateToken
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth-storage') || sessionStorage.getItem('auth-storage')
      if (raw) {
        const parsed = JSON.parse(raw)
        const storedToken = parsed?.state?.token
        if (typeof storedToken === 'string' && storedToken) return storedToken
      }
    } catch {
      // ignore malformed storage
    }
  }
  return fallbackToken || null
}

function getCallEventLabel(message: SupportMessage) {
  const mediaLabel = message.media_kind === 'video' ? 'Видеозвонок' : 'Аудиозвонок'
  if (message.call_status === 'missed') return `Пропущенный ${mediaLabel.toLowerCase()}`
  return mediaLabel
}

function buildVoiceWaveform(seed: string, count = 42) {
  let value = 0
  for (let index = 0; index < seed.length; index += 1) {
    value = ((value << 5) - value + seed.charCodeAt(index)) | 0
  }
  return Array.from({ length: count }, (_, index) => {
    value = (value * 1664525 + 1013904223) | 0
    const normalized = Math.abs(value % 18)
    const edgeBoost = index % 9 === 0 ? 4 : 0
    return 6 + normalized + edgeBoost
  })
}

function TelegramVoiceMessage({ attachment, src, mine, transcript, isTranscribing, onTranscribe, sentAt, readState }: { attachment: SupportMessageAttachment; src: string; mine: boolean; transcript?: AttachmentTranscript | null; isTranscribing?: boolean; onTranscribe?: () => void; sentAt?: string | null; readState?: 'sent' | 'read' | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const progress = safeDuration ? Math.min(100, Math.max(0, (currentTime / safeDuration) * 100)) : 0
  const durationLabel = safeDuration ? formatCallDuration(Math.ceil(safeDuration)) : '00:00'
  const sentAtLabel = formatMessageClock(sentAt)
  const waveform = useMemo(() => buildVoiceWaveform(`${attachment.id}:${attachment.size_bytes || 0}:${attachment.file_name}`), [attachment.id, attachment.size_bytes, attachment.file_name])

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return
    try {
      if (audio.paused) {
        await audio.play()
        setIsPlaying(true)
      } else {
        audio.pause()
        setIsPlaying(false)
      }
    } catch {
      toast.error('Не удалось воспроизвести голосовое сообщение')
    }
  }

  function seekFromClientX(clientX: number, target: HTMLDivElement) {
    const audio = audioRef.current
    if (!audio || !safeDuration) return
    const rect = target.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    audio.currentTime = ratio * safeDuration
    setCurrentTime(audio.currentTime)
  }

  const playedBars = Math.round((progress / 100) * waveform.length)

  return (
    <div className={`min-w-[220px] max-w-[300px] ${mine ? 'text-white' : 'text-foreground'}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration
          setDuration(Number.isFinite(value) ? value : 0)
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
        }}
      />
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlayback}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#4f79b3] transition hover:scale-[1.02]"
          title={isPlaying ? 'Пауза' : 'Воспроизвести'}
        >
          {isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="ml-0.5 h-4.5 w-4.5" />}
        </button>
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 cursor-pointer overflow-hidden px-0.5 py-0.5" onClick={(event) => seekFromClientX(event.clientX, event.currentTarget)}>
              <div className="flex h-6 items-end gap-[2px]">
                {waveform.map((height, index) => (
                  <span
                    key={index}
                    className={`w-[2.5px] rounded-full transition-colors ${index < playedBars ? 'bg-white' : 'bg-white/55'}`}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </div>
            {onTranscribe ? (
              <button
                type="button"
                onClick={onTranscribe}
                disabled={isTranscribing}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-xs font-semibold text-white transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                title={transcript?.text ? 'Показать распознанный текст' : 'Распознать в текст'}
              >
                {isTranscribing ? '...' : '↗A'}
              </button>
            ) : null}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-white/95">
            <span className="tabular-nums">{durationLabel}</span>
            <span className="inline-flex items-center gap-1.5 tabular-nums text-white/90">
              {sentAtLabel ? <span>{sentAtLabel}</span> : null}
              {mine && readState ? (readState === 'read' ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />) : null}
            </span>
          </div>
        </div>
      </div>
      {transcript?.text ? (
        <div className="mt-2 rounded-2xl bg-black/10 px-3 py-2 text-xs leading-5 text-white/95">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-white/65">Распознанный текст{transcript.language ? ` · ${String(transcript.language).toUpperCase()}` : ''}</div>
          <div className="whitespace-pre-wrap">{transcript.text}</div>
        </div>
      ) : null}
    </div>
  )
}

type CallMediaKind = 'audio' | 'video'

type IncomingCall = {
  threadId: string
  fromUserId: string
  fromUserName: string
  mediaKind: CallMediaKind
  threadKind?: 'direct' | 'group'
  threadTitle?: string | null
}

type GroupCallParticipantState = {
  userId: string
  name: string
  avatarUrl?: string | null
  mediaKind: CallMediaKind
  phase: 'invited' | 'connecting' | 'connected'
  stream?: MediaStream | null
}

type ActiveCall = {
  threadId: string
  targetUserId: string
  targetUserName: string
  targetAvatarUrl?: string | null
  mediaKind: CallMediaKind
  phase: 'outgoing' | 'incoming' | 'connecting' | 'connected'
  threadKind?: 'direct' | 'group'
  participantIds?: string[]
}

const MESSAGES_PAGE_SIZE = 50
const MESSAGE_HIGHLIGHT_DURATION_MS = 1800

type ThreadFilter = 'all' | 'unread' | 'direct' | 'groups' | 'archive'

type LocalMessengerIdentity = Awaited<ReturnType<typeof ensureLocalMessengerIdentity>>
type LocalThreadSecret = { keyVersion: number; keyRawB64: string }

const THREAD_FILTER_LABELS: Array<{ id: ThreadFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'unread', label: 'Непрочитанные' },
  { id: 'direct', label: 'Личные' },
  { id: 'groups', label: 'Группы' },
  { id: 'archive', label: 'Архив' },
]

function getDraftStorageKey(orgId?: string | null, threadId?: string | null) {
  if (!orgId || !threadId) return ''
  return `messenger-draft:${orgId}:${threadId}`
}

function extractUrls(value?: string | null) {
  if (!value) return []
  return Array.from(new Set(value.match(/https?:\/\/[^\s]+/gi) || []))
}

export default function MessengerPage() {
  const theme = useUiStore((s) => s.theme)
  const isDarkTheme = theme === 'dark'
  const messengerChrome = useMemo(() => ({
    shell: isDarkTheme ? 'bg-[#0b1220]/95' : 'bg-[#dfe5ec]',
    sidebar: isDarkTheme ? 'border-r border-border/80 bg-[#0b1220]/88 backdrop-blur' : 'border-r border-slate-200/80 bg-white',
    listItem: isDarkTheme ? 'bg-white/8' : 'bg-[#e9edf5]',
    listItemHover: isDarkTheme ? 'hover:bg-white/[0.04]' : 'hover:bg-[#f4f6f8]',
    ghostButton: isDarkTheme ? 'bg-white/[0.04] text-foreground hover:bg-white/[0.08]' : 'bg-[#f0f2f5] text-slate-600 hover:bg-[#e7ebf0]',
    ghostButtonDisabled: isDarkTheme ? 'bg-white/[0.03] text-muted-foreground' : 'bg-slate-100 text-slate-400',
    floatingMenu: isDarkTheme ? 'border-border/80 bg-[#111a2d]/98' : 'border-slate-200/90 bg-white',
    peopleSearch: isDarkTheme ? 'bg-white/[0.03] ring-1 ring-white/8' : 'bg-[#f4f6f8] ring-1 ring-slate-200/80',
    peopleCardHover: isDarkTheme ? 'hover:bg-white/[0.04]' : 'hover:bg-[#f6f8fb]',
    header: isDarkTheme ? 'border-b border-border/70 bg-[#0b1220]/72 backdrop-blur' : 'border-b border-slate-200/80 bg-white/90 backdrop-blur',
    servicePill: isDarkTheme ? 'border border-border/70 bg-[#121a2b]/92 text-xs text-muted-foreground shadow-sm backdrop-blur' : 'border border-slate-200/70 bg-white/90 text-xs text-slate-500 shadow-[0_8px_20px_rgba(148,163,184,0.14)]',
    jumpButton: isDarkTheme ? 'bg-[#111a2d]/95 ring-1 ring-white/10 hover:bg-[#16233b]' : 'bg-white ring-1 ring-slate-200/80 hover:bg-slate-50',
    composer: isDarkTheme ? 'bg-[#0f172a]/92 ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.06)]',
    composerHover: isDarkTheme ? 'hover:bg-white/[0.06] hover:text-foreground' : 'hover:bg-[#eef2f6] hover:text-slate-900',
    incomingBubble: isDarkTheme ? 'border border-border bg-card text-foreground' : 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]',
    surface: isDarkTheme ? 'border-border bg-card' : 'border-slate-200/80 bg-white',
    inputSurface: isDarkTheme ? 'border-border bg-background' : 'border-slate-200/80 bg-[#f4f6f8]',
    pillInactive: isDarkTheme ? 'border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground' : 'border border-slate-200/80 bg-white text-slate-500 hover:bg-[#f3f5f8] hover:text-slate-700',
    datePill: isDarkTheme ? 'border border-border bg-card text-muted-foreground' : 'bg-white/88 text-slate-500 shadow-[0_4px_14px_rgba(148,163,184,0.14)]',
  }), [isDarkTheme])
  const location = useLocation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const isMessengerRoute = location.pathname.startsWith('/messenger')
  const currentUserId = useAuthStore((s) => s.userId)
  const token = useAuthStore((s) => s.token)
  const { data: users = [] } = useUsers(orgId)

  const [threads, setThreads] = useState<SupportThread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedThread, setSelectedThread] = useState<SupportThread | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [creatingThreadId, setCreatingThreadId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [messageText, setMessageText] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false)
  const [showGroupCreator, setShowGroupCreator] = useState(false)
  const [showPeoplePanel, setShowPeoplePanel] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [blockedReason, setBlockedReason] = useState<string | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [groupCallParticipants, setGroupCallParticipants] = useState<Record<string, GroupCallParticipantState>>({})
  const [recordingVoice, setRecordingVoice] = useState(false)
  const [replyingTo, setReplyingTo] = useState<SupportMessage | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [typingUsersByThread, setTypingUsersByThread] = useState<Record<string, Record<string, string>>>({})
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null)
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, { text: string; sourceLang?: string | null; targetLang: string }>>({})
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null)
  const [openThreadMenuId, setOpenThreadMenuId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<ThreadFilter>('all')
  const [showThreadInfo, setShowThreadInfo] = useState(false)
  const [groupSettingsTitle, setGroupSettingsTitle] = useState('')
  const [savingGroupTitle, setSavingGroupTitle] = useState(false)
  const [updatingGroupAvatar, setUpdatingGroupAvatar] = useState(false)
  const [groupActionUserId, setGroupActionUserId] = useState<string | null>(null)
  const [showChatSearch, setShowChatSearch] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0)
  const [forwardingMessage, setForwardingMessage] = useState<SupportMessage | null>(null)
  const [forwardQuery, setForwardQuery] = useState('')
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [showJumpToBottom, setShowJumpToBottom] = useState(false)
  const [transcribingAttachmentKey, setTranscribingAttachmentKey] = useState<string | null>(null)
  const [decryptedAttachmentUrls, setDecryptedAttachmentUrls] = useState<Record<string, string>>({})
  const [chatWallpaper, setChatWallpaper] = useState('')
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ])

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const groupAvatarInputRef = useRef<HTMLInputElement | null>(null)
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null)
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messageViewportRef = useRef<HTMLDivElement | null>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const decryptedAttachmentUrlsRef = useRef<Record<string, string>>({})
  const socketRef = useRef<WebSocket | null>(null)
  const pingRef = useRef<number | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const groupPeerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({})
  const groupPendingIceCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({})
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const groupRemoteAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const groupRemoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])
  const voiceStreamRef = useRef<MediaStream | null>(null)
  const activeCallRef = useRef<ActiveCall | null>(null)
  const selectedThreadIdRef = useRef<string | null>(null)
  const selectedThreadRef = useRef<SupportThread | null>(null)
  const threadsRef = useRef<SupportThread[]>([])
  const ringtoneSoundRef = useRef<{ stop: () => void } | null>(null)
  const dialToneSoundRef = useRef<{ stop: () => void } | null>(null)
  const callTimerRef = useRef<number | null>(null)
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const remoteDescriptionSetRef = useRef(false)
  const skipNextAutoScrollRef = useRef(false)
  const browserNotificationsRef = useRef<Record<string, Notification>>({})
  const messengerIdentityRef = useRef<LocalMessengerIdentity | null>(null)
  const messengerKeyBundleRef = useRef<MessengerUserPublicKeyBundle | null>(null)
  const directThreadSecretsRef = useRef<Record<string, LocalThreadSecret>>({})
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptRef = useRef(0)
  const typingTimeoutRef = useRef<number | null>(null)
  const wsCallbacksRef = useRef({
    cleanupCall: (() => {}) as (notify?: boolean) => void,
    createPeerConnection: (async () => new RTCPeerConnection()) as (threadId: string, targetUserId: string, mediaKind: CallMediaKind) => Promise<RTCPeerConnection>,
    createGroupPeerConnection: (async () => new RTCPeerConnection()) as (threadId: string, targetUserId: string, mediaKind: CallMediaKind, participantName?: string, participantAvatarUrl?: string | null) => Promise<RTCPeerConnection>,
    flushIceCandidates: (async () => {}) as () => Promise<void>,
    flushGroupIceCandidates: (async () => {}) as (userId: string) => Promise<void>,
    closeGroupPeerConnection: (() => {}) as (userId: string) => void,
    markThreadRead: (async () => {}) as (threadId: string) => Promise<void>,
    sendCallSignal: (() => {}) as (payload: Record<string, unknown>) => void,
    startOfferFlow: (async () => {}) as (threadId: string, targetUserId: string, mediaKind: CallMediaKind) => Promise<void>,
    stopAllSounds: (() => {}) as () => void,
  })
  const typingSentRef = useRef(false)
  const highlightTimerRef = useRef<number | null>(null)
  const isUnmountedRef = useRef(false)
  const [callDuration, setCallDuration] = useState(0)
  const callDurationRef = useRef(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isCallFullscreen, setIsCallFullscreen] = useState(false)
  const [callWindowPosition, setCallWindowPosition] = useState<{ x: number; y: number } | null>(null)
  const requestBrowserNotificationPermission = useCallback(async () => {
    if (!canUseBrowserNotifications()) return
    if (getBrowserNotificationPermission() !== 'default') return
    try {
      await Notification.requestPermission()
    } catch (error) {
      console.warn('[Messenger] Notification permission request failed:', error)
    }
  }, [])
  const closeBrowserNotification = useCallback((tag: string) => {
    const notification = browserNotificationsRef.current[tag]
    if (!notification) return
    notification.close()
    delete browserNotificationsRef.current[tag]
  }, [])

  const showBrowserNotification = useCallback((tag: string, title: string, options: NotificationOptions & { onClick?: (() => void) | null }) => {
    if (!canUseBrowserNotifications() || getBrowserNotificationPermission() != 'granted' || !shouldUseBrowserNotifications()) return
    closeBrowserNotification(tag)
    try {
      const notification = new Notification(title, {
        tag,
        requireInteraction: Boolean(options.requireInteraction),
        body: options.body,
        icon: options.icon,
        silent: options.silent,
      } as NotificationOptions)
      notification.onclick = () => {
        window.focus()
        options.onClick?.()
        notification.close()
      }
      notification.onclose = () => {
        if (browserNotificationsRef.current[tag] === notification) delete browserNotificationsRef.current[tag]
      }
      browserNotificationsRef.current[tag] = notification
    } catch (error) {
      console.warn('[Messenger] Browser notification failed:', error)
    }
  }, [closeBrowserNotification])
  const callWindowRef = useRef<HTMLDivElement | null>(null)
  const callDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)

  const contacts = useMemo(() => users
    .filter((user) => user.id !== currentUserId)
    .filter((user) => {
      const haystack = [user.full_name, user.email, user.position, user.department].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(employeeQuery.trim().toLowerCase())
    }), [currentUserId, employeeQuery, users])

  const filteredThreads = useMemo(() => threads.filter((thread) => {
    const matchesSearch = getThreadSearchText(thread, currentUserId).includes(searchQuery.trim().toLowerCase())
    if (!matchesSearch) return false
    const archived = Boolean(thread.is_archived)
    if (activeFilter === 'archive') return archived
    if (archived) return false
    if (activeFilter === 'unread') return thread.unread_count > 0
    if (activeFilter === 'direct') return thread.thread_kind !== 'group'
    if (activeFilter === 'groups') return thread.thread_kind === 'group'
    return true
  }), [activeFilter, currentUserId, searchQuery, threads])

  useEffect(() => {
    callDurationRef.current = callDuration
  }, [callDuration])

  useEffect(() => {
    if (!openThreadMenuId && !openMessageMenuId) return
    function handleCloseMenus(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-thread-menu]') || target?.closest('[data-thread-menu-button]') || target?.closest('[data-message-menu]') || target?.closest('[data-message-menu-button]')) {
        return
      }
      setOpenThreadMenuId(null)
      setOpenMessageMenuId(null)
    }
    document.addEventListener('mousedown', handleCloseMenus)
    return () => document.removeEventListener('mousedown', handleCloseMenus)
  }, [openMessageMenuId, openThreadMenuId])

  const selectedPartner = selectedThread ? getThreadPartner(selectedThread, currentUserId) : null
  const selectedPartnerUser = selectedPartner?.id ? users.find((user) => user.id === selectedPartner.id) : null
  const isDirectThread = selectedThread?.thread_kind !== 'group'
  const selectedAvatarSrc = isDirectThread
    ? (selectedPartnerUser?.avatar_url || selectedPartner?.avatar_url || null)
    : resolveAttachmentUrl(selectedThread?.avatar_url || selectedThread?.group_avatar?.url || null, token)
  const selectedLastSeenLabel = selectedPartnerUser ? formatLastSeenLabel(selectedPartnerUser) : (selectedPartner?.last_seen_at ? formatLastSeenLabel({ last_seen_at: selectedPartner.last_seen_at }) : 'Сотрудник')
  const selectedGroupPermissions = selectedThread?.current_user_group_permissions || null
  const canManageGroupInfo = Boolean(selectedGroupPermissions?.manage_info)
  const canManageGroupMembers = Boolean(selectedGroupPermissions?.manage_members)
  const canManageGroupAdmins = Boolean(selectedGroupPermissions?.manage_admins)
  const mediaFeaturesAvailable = canUseRealtimeMedia()
  const displayedMessages = useMemo(() => selectedThread?.messages || [], [selectedThread?.messages])
  const pinnedMessages = useMemo(
    () => (selectedThread?.pinned_message_ids || []).map((id) => displayedMessages.find((message) => message.id === id)).filter(Boolean) as SupportMessage[],
    [displayedMessages, selectedThread?.pinned_message_ids],
  )
  const firstUnreadMessageId = useMemo(
    () => (selectedThread?.messages || []).find((message) => message.author_id !== currentUserId && !(message.read_by || []).includes(currentUserId || ''))?.id || null,
    [currentUserId, selectedThread?.messages],
  )
  const getThreadSnapshotById = useCallback((threadId: string) => {
    if (selectedThreadRef.current?.id === threadId) return selectedThreadRef.current
    return threadsRef.current.find((thread) => thread.id === threadId) || null
  }, [])

  const ensureMessengerIdentityBundle = useCallback(async () => {
    if (!orgId || !currentUserId) return null
    const localIdentity = messengerIdentityRef.current || await ensureLocalMessengerIdentity(currentUserId)
    messengerIdentityRef.current = localIdentity
    const cachedBundle = messengerKeyBundleRef.current
    const localPublicKey = JSON.stringify(localIdentity.publicKeyJwk)
    if (cachedBundle && JSON.stringify(cachedBundle.public_key_jwk) === localPublicKey) {
      return { localIdentity, bundle: cachedBundle }
    }
    let bundle = cachedBundle
    if (!bundle) {
      try {
        const response = await getMyMessengerKeyBundle(orgId)
        bundle = response.data.bundle
      } catch {
        bundle = null
      }
    }
    if (!bundle || JSON.stringify(bundle.public_key_jwk) !== localPublicKey) {
      const response = await upsertMyMessengerKeyBundle(orgId, {
        algorithm: 'ECDH-P256',
        public_key_jwk: localIdentity.publicKeyJwk,
      })
      bundle = response.data.bundle
    }
    messengerKeyBundleRef.current = bundle
    return { localIdentity, bundle }
  }, [currentUserId, orgId])

  const ensureDirectThreadSecret = useCallback(async (thread: SupportThread) => {
    if (!orgId || !currentUserId || !isDirectMessengerThread(thread)) return null
    const cachedSecret = directThreadSecretsRef.current[thread.id] || getStoredThreadKey(currentUserId, thread.id)
    if (cachedSecret) {
      directThreadSecretsRef.current[thread.id] = cachedSecret
      return cachedSecret
    }
    const identityState = await ensureMessengerIdentityBundle()
    if (!identityState) return null
    const { localIdentity, bundle: ownBundle } = identityState
    const response = await getMessengerThreadEncryption(orgId, thread.id)
    const state = response.data
    const participantBundles = state.participant_keys || []
    const resolvedOwnBundle = participantBundles.find((item) => item.user_id === currentUserId) || ownBundle
    if (!resolvedOwnBundle) return null
    const encryptionMeta = state.encryption || null
    const envelopeForCurrentUser = state.envelope_for_current_user || null
    if (encryptionMeta?.enabled && envelopeForCurrentUser) {
      const senderBundle = participantBundles.find((item) => item.user_id === envelopeForCurrentUser.sender_user_id)
      if (!senderBundle) return null
      const keyRawB64 = await decryptThreadKeyEnvelope(envelopeForCurrentUser, localIdentity.privateKeyJwk, senderBundle.public_key_jwk)
      const nextSecret = {
        keyVersion: Number(encryptionMeta.key_version || envelopeForCurrentUser.key_version || 1),
        keyRawB64,
      }
      storeThreadKey(currentUserId, thread.id, nextSecret)
      directThreadSecretsRef.current[thread.id] = nextSecret
      return nextSecret
    }
    const otherBundle = participantBundles.find((item) => item.user_id !== currentUserId)
    if (!otherBundle) return null
    const sharedKeyRawB64 = await generateThreadSharedKey()
    const selfEnvelope = await createThreadKeyEnvelope(sharedKeyRawB64, localIdentity.privateKeyJwk, resolvedOwnBundle.public_key_jwk)
    const otherEnvelope = await createThreadKeyEnvelope(sharedKeyRawB64, localIdentity.privateKeyJwk, otherBundle.public_key_jwk)
    const initResponse = await initializeMessengerThreadEncryption(orgId, thread.id, {
      key_version: 1,
      algorithm: 'ECDH-P256/AES-GCM',
      envelopes: [
        { recipient_user_id: currentUserId, wrapped_key_b64: selfEnvelope.wrapped_key_b64, iv_b64: selfEnvelope.iv_b64 },
        { recipient_user_id: otherBundle.user_id, wrapped_key_b64: otherEnvelope.wrapped_key_b64, iv_b64: otherEnvelope.iv_b64 },
      ],
    })
    const nextSecret = {
      keyVersion: Number(initResponse.data.encryption?.key_version || 1),
      keyRawB64: sharedKeyRawB64,
    }
    storeThreadKey(currentUserId, thread.id, nextSecret)
    directThreadSecretsRef.current[thread.id] = nextSecret
    return nextSecret
  }, [currentUserId, ensureMessengerIdentityBundle, orgId])

  const decryptThreadMessages = useCallback(async (thread: SupportThread) => {
    if (!currentUserId || !isDirectMessengerThread(thread) || !(thread.messages || []).some((message) => message.encryption?.ciphertext_b64)) {
      return thread
    }
    const secret = await ensureDirectThreadSecret(thread).catch(() => null)
    if (!secret) return thread
    const messages = await Promise.all((thread.messages || []).map(async (message) => {
      const payload = message.encryption as MessengerEncryptedPayload | undefined
      if (!payload?.ciphertext_b64) return message
      try {
        const body = await decryptMessengerText(secret.keyRawB64, payload)
        return { ...message, body }
      } catch (error) {
        console.warn('[Messenger] Failed to decrypt message', error)
        return { ...message, body: '[Не удалось расшифровать сообщение]' }
      }
    }))
    return { ...thread, messages, last_message_preview: getThreadPreviewFromMessages(messages, thread.last_message_preview || '') }
  }, [currentUserId, ensureDirectThreadSecret])

  const setDecryptedAttachmentUrl = useCallback((cacheKey: string, nextUrl: string) => {
    setDecryptedAttachmentUrls((current) => {
      const previousUrl = current[cacheKey]
      if (previousUrl && previousUrl !== nextUrl && previousUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl)
      }
      const next = { ...current, [cacheKey]: nextUrl }
      decryptedAttachmentUrlsRef.current = next
      return next
    })
  }, [])

  const resolveMessageAttachmentUrl = useCallback((messageId: string, attachment: SupportMessageAttachment) => {
    const cacheKey = getAttachmentCacheKey(messageId, attachment.id)
    return decryptedAttachmentUrls[cacheKey] || resolveAttachmentUrl(attachment.url, token)
  }, [decryptedAttachmentUrls, token])

  const getParticipantIdentity = useCallback((threadId: string, userId: string, fallbackName?: string | null) => {
    const thread = getThreadSnapshotById(threadId)
    const profile = thread?.participant_profiles?.find((item) => item.id === userId)
    if (profile) {
      return {
        name: profile.name || fallbackName || 'Сотрудник',
        avatarUrl: profile.avatar_url || null,
      }
    }
    const user = users.find((item) => item.id === userId)
    return {
      name: user?.full_name || user?.email || fallbackName || 'Сотрудник',
      avatarUrl: user?.avatar_url || null,
    }
  }, [getThreadSnapshotById, users])

  const buildGroupParticipantsFromThread = useCallback((thread: SupportThread | null, mediaKind: CallMediaKind) => {
    if (!thread || thread.thread_kind !== 'group') return {}
    return Object.fromEntries(
      (thread.participant_profiles || [])
        .filter((participant) => participant.id !== currentUserId)
        .map((participant) => [participant.id, {
          userId: participant.id,
          name: participant.name || 'Сотрудник',
          avatarUrl: participant.avatar_url || null,
          mediaKind,
          phase: 'invited' as const,
          stream: null,
        }]),
    )
  }, [currentUserId])

  const setGroupParticipantState = useCallback((userId: string, patch: Partial<GroupCallParticipantState> & Pick<GroupCallParticipantState, 'name' | 'mediaKind'>) => {
    setGroupCallParticipants((current) => ({
      ...current,
      [userId]: {
        userId,
        name: patch.name,
        avatarUrl: patch.avatarUrl ?? current[userId]?.avatarUrl ?? null,
        mediaKind: patch.mediaKind,
        phase: patch.phase ?? current[userId]?.phase ?? 'invited',
        stream: patch.stream ?? current[userId]?.stream ?? null,
      },
    }))
  }, [])

  const closeGroupPeerConnection = useCallback((userId: string) => {
    groupPeerConnectionsRef.current[userId]?.close()
    delete groupPeerConnectionsRef.current[userId]
    delete groupPendingIceCandidatesRef.current[userId]
    delete groupRemoteAudioRefs.current[userId]
    delete groupRemoteVideoRefs.current[userId]
    setGroupCallParticipants((current) => {
      if (!current[userId]) return current
      const next = { ...current }
      delete next[userId]
      return next
    })
  }, [])

  const flushGroupIceCandidates = useCallback(async (userId: string) => {
    const peer = groupPeerConnectionsRef.current[userId]
    if (!peer) return
    const pending = [...(groupPendingIceCandidatesRef.current[userId] || [])]
    groupPendingIceCandidatesRef.current[userId] = []
    for (const candidate of pending) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        console.warn('[GroupCall] Failed to add buffered ICE candidate:', error)
      }
    }
  }, [])

  const chatSearchMatches = useMemo(() => {
    const query = chatSearchQuery.trim().toLowerCase()
    if (!query) return []
    return displayedMessages.filter((message) => {
      const attachmentNames = (message.attachments || []).map((item) => item.file_name || '').join(' ')
      const haystack = [
        message.body,
        message.reply_preview?.body,
        message.forwarded_from?.body,
        attachmentNames,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [chatSearchQuery, displayedMessages])
  const threadTypingUsers = useMemo(() => {
    if (!selectedThreadId) return []
    const item = typingUsersByThread[selectedThreadId] || {}
    return Object.values(item)
  }, [selectedThreadId, typingUsersByThread])
  const forwardTargets = useMemo(() => {
    const query = forwardQuery.trim().toLowerCase()
    return threads
      .filter((thread) => thread.id !== forwardingMessage?.thread_id)
      .filter((thread) => {
        if (!query) return !thread.is_archived
        return getThreadSearchText(thread, currentUserId).includes(query)
      })
      .slice(0, 12)
  }, [currentUserId, forwardQuery, forwardingMessage?.thread_id, threads])
  const threadLinks = useMemo(() => {
    const urls = displayedMessages.flatMap((message) => extractUrls(message.body))
    return Array.from(new Set(urls))
  }, [displayedMessages])
  const activeThreadTypingLabel = useMemo(() => getTypingLabel(threadTypingUsers, isDirectThread), [threadTypingUsers, isDirectThread])

  const mediaAttachments = useMemo(
    () => displayedMessages.flatMap((message) => (message.attachments || [])
      .filter((attachment) => isImageAttachment(attachment.content_type))
      .map((attachment) => ({ messageId: message.id, attachment }))),
    [displayedMessages],
  )
  const fileAttachments = useMemo(
    () => displayedMessages.flatMap((message) => (message.attachments || [])
      .filter((attachment) => !isImageAttachment(attachment.content_type) && !isAudioAttachment(attachment.content_type))
      .map((attachment) => ({ messageId: message.id, attachment }))),
    [displayedMessages],
  )
  const chatWallpaperStyle = useMemo(() => buildChatWallpaperStyle(chatWallpaper, isDarkTheme), [chatWallpaper, isDarkTheme])

  const wallpaperPresets = useMemo(() => CHAT_WALLPAPER_PRESETS.map((preset) => ({
    ...preset,
    storageValue: getWallpaperPresetStorageValue(preset.id),
    previewValue: isDarkTheme ? preset.darkValue : preset.lightValue,
  })), [isDarkTheme])
  const appendPendingFiles = useCallback((files: File[]) => {
    if (!files.length) return
    setPendingFiles((current) => {
      const next = [...current]
      const seen = new Set(current.map(buildPendingFileKey))
      for (const file of files) {
        const key = buildPendingFileKey(file)
        if (seen.has(key)) continue
        seen.add(key)
        next.push(file)
      }
      return next
    })
  }, [])
  const handleApplyChatWallpaper = useCallback((value: string) => {
    if (!orgId || !selectedThreadId) return
    const normalizedValue = normalizeWallpaperStorageValue(value)
    const storageKey = getChatWallpaperStorageKey(orgId, selectedThreadId)
    setChatWallpaper(normalizedValue)
    try {
      window.localStorage.setItem(storageKey, normalizedValue)
    } catch {
      // ignore storage issues
    }
  }, [orgId, selectedThreadId])
  const handleResetChatWallpaper = useCallback(() => {
    if (!orgId || !selectedThreadId) return
    const storageKey = getChatWallpaperStorageKey(orgId, selectedThreadId)
    setChatWallpaper('')
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // ignore storage issues
    }
  }, [orgId, selectedThreadId])
  const handleUploadChatWallpaper = useCallback(async (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Для фона чата можно выбрать только изображение.')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      handleApplyChatWallpaper(dataUrl)
      toast.success('Обои чата обновлены.')
    } catch {
      toast.error('Не удалось загрузить изображение для фона чата.')
    }
  }, [handleApplyChatWallpaper])
  const loadThreads = useCallback(async () => {
    if (!orgId) return
    try {
      const { data } = await listMessengerThreads(orgId)
      setBlockedReason(null)
      setThreads(data.map((thread) => normalizeOpenedThread({ ...thread, messages: [] }, selectedThreadIdRef.current)))
      setSelectedThreadId((current) => current ?? data[0]?.id ?? null)
      markMessengerNotificationsRead()
    } catch (error) {
      if (getApiErrorStatus(error) === 423) {
        setBlockedReason(getApiErrorMessage(error, 'Доступ к мессенджеру временно ограничен для текущей компании.'))
        setThreads([])
        setSelectedThread(null)
        setSelectedThreadId(null)
        return
      }
      throw error
    }
  }, [closeBrowserNotification, orgId])

  useEffect(() => {
    if (!isMessengerRoute || !orgId || !currentUserId) return
    void ensureMessengerIdentityBundle().catch((error) => {
      console.warn('[Messenger] Failed to initialize local encryption bundle', error)
    })
  }, [currentUserId, ensureMessengerIdentityBundle, isMessengerRoute, orgId])

  useEffect(() => {
    if (!orgId || !selectedThreadId) {
      setChatWallpaper('')
      return
    }
    const storageKey = getChatWallpaperStorageKey(orgId, selectedThreadId)
    try {
      const storedValue = normalizeWallpaperStorageValue(window.localStorage.getItem(storageKey) || '')
      setChatWallpaper(storedValue)
      if (storedValue) window.localStorage.setItem(storageKey, storedValue)
    } catch {
      setChatWallpaper('')
    }
  }, [orgId, selectedThreadId])

  useEffect(() => {
    if (selectedThread?.thread_kind === 'group') {
      setGroupSettingsTitle(selectedThread.subject || '')
    } else {
      setGroupSettingsTitle('')
    }
  }, [selectedThread?.id, selectedThread?.subject, selectedThread?.thread_kind])

  const loadSelectedThread = useCallback(async (
    threadId: string,
    options?: { before?: string | null; append?: boolean },
  ) => {
    if (!orgId) return
    const append = Boolean(options?.append)
    const { data } = await getMessengerThread(orgId, threadId, {
      limit: MESSAGES_PAGE_SIZE,
      before: options?.before ?? null,
    })
    const normalizedBase: SupportThread = normalizeOpenedThread({
      ...data,
      messages: data.messages || [],
    }, threadId)
    const normalized: SupportThread = await decryptThreadMessages(normalizedBase)
    setHasMoreMessages(Boolean(data.has_more_messages))
    setNextBefore(data.next_before || null)
    setSelectedThread((current) => {
      if (!append || !current || current.id !== threadId) return normalized
      return {
        ...normalized,
        messages: mergeMessagePages(normalized.messages || [], current.messages || []),
      }
    })
    setThreads((current) => upsertThread(current, { ...normalized, messages: [] }))
  }, [decryptThreadMessages, orgId])

  const markThreadRead = useCallback(async (threadId: string) => {
    if (!orgId) return
    closeBrowserNotification(`messenger-thread:${threadId}`)
    closeBrowserNotification(`messenger-call:${threadId}`)
    setSelectedThread((current) => clearThreadUnread(current, threadId))
    setThreads((current) => clearThreadUnreadInList(current, threadId))
    const { data } = await markMessengerThreadRead(orgId, threadId)
    setSelectedThread((current) => {
      if (!current || current.id !== threadId) return current
      return {
        ...data.thread,
        unread_count: 0,
        messages: mergeMessagePages(current.messages || [], data.thread.messages || []),
      }
    })
    setThreads((current) => upsertThread(clearThreadUnreadInList(current, threadId), { ...data.thread, unread_count: 0, messages: [] }))
    window.dispatchEvent(new CustomEvent('notifications:refresh'))
  }, [orgId])

  const markThreadNotificationsRead = useCallback(async (threadId: string) => {
    try {
      const { data } = await getNotificationFeed(30)
      const related = data.items.filter((item) => !item.is_read && (item.type === 'messenger_message' || item.type === 'messenger_thread_created') && String(item.meta_json?.thread_id || '') === threadId)
      if (!related.length) return
      await Promise.all(related.map((item) => markNotificationRead(item.id).catch(() => null)))
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
    } catch {
      return
    }
  }, [])

  const sendTypingSignal = useCallback((isTyping: boolean) => {
    if (!selectedThreadId || socketRef.current?.readyState !== WebSocket.OPEN) return
    socketRef.current.send(JSON.stringify({
      type: 'typing',
      thread_id: selectedThreadId,
      is_typing: isTyping,
    }))
  }, [selectedThreadId])

  useEffect(() => {
    if (!orgId) return
    getMessengerIceServers(orgId)
      .then(({ data }) => {
        if (!Array.isArray(data.ice_servers) || data.ice_servers.length === 0) return
        setIceServers(data.ice_servers as RTCIceServer[])
      })
      .catch(() => null)
  }, [orgId])

  useEffect(() => {
    if (!orgId) return
    let active = true
    setLoading(true)
    loadThreads()
      .catch((error) => toast.error(getApiErrorMessage(error, 'Не удалось загрузить диалоги')))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadThreads, orgId])

  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThread(null)
      setHasMoreMessages(false)
      setNextBefore(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await loadSelectedThread(selectedThreadId)
        if (cancelled) return
        await markThreadRead(selectedThreadId).catch(() => null)
        await markThreadNotificationsRead(selectedThreadId).catch(() => null)
      } catch (error) {
        if (!cancelled) toast.error(getApiErrorMessage(error, 'Не удалось открыть диалог'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadSelectedThread, markThreadNotificationsRead, markThreadRead, selectedThreadId])

  useEffect(() => {
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false
      return
    }
    scrollViewportToBottom(messageViewportRef.current, 'smooth')
  }, [selectedThread?.messages])

  useEffect(() => {
    void requestBrowserNotificationPermission()

    const unlockBrowserFeatures = () => {
      void unlockSharedAudioContext()
      void requestBrowserNotificationPermission()
    }
    window.addEventListener('pointerdown', unlockBrowserFeatures, { passive: true })
    window.addEventListener('keydown', unlockBrowserFeatures)
    return () => {
      window.removeEventListener('pointerdown', unlockBrowserFeatures)
      window.removeEventListener('keydown', unlockBrowserFeatures)
    }
  }, [requestBrowserNotificationPermission])

  useEffect(() => {
    activeCallRef.current = activeCall
    if (!activeCall) return
    requestAnimationFrame(() => {
      if (activeCall.mediaKind === 'video') {
        if (localVideoRef.current && localStreamRef.current && !localVideoRef.current.srcObject) {
          localVideoRef.current.srcObject = localStreamRef.current
          localVideoRef.current.muted = true
          void localVideoRef.current.play().catch(() => null)
        }
        if (remoteVideoRef.current && remoteStreamRef.current && !remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current
          void remoteVideoRef.current.play().catch(() => null)
        }
      }
      if (remoteAudioRef.current && remoteStreamRef.current && !remoteAudioRef.current.srcObject) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current
        void remoteAudioRef.current.play().catch(() => null)
      }
    })
  }, [activeCall])

  useEffect(() => {
    return () => {
      Object.values(decryptedAttachmentUrlsRef.current).forEach((value) => {
        if (value.startsWith('blob:')) URL.revokeObjectURL(value)
      })
      decryptedAttachmentUrlsRef.current = {}
    }
  }, [])

  useEffect(() => {
    if (!selectedThread || !currentUserId || !token || !isDirectMessengerThread(selectedThread)) return
    const encryptedAttachments = (selectedThread.messages || []).flatMap((message) => (message.attachments || []).map((attachment) => ({ message, attachment })))
      .filter(({ message, attachment }) => Boolean(getAttachmentEncryptionMeta(attachment)) && !decryptedAttachmentUrlsRef.current[getAttachmentCacheKey(message.id, attachment.id)])
    if (!encryptedAttachments.length) return
    let cancelled = false
    void (async () => {
      const secret = await ensureDirectThreadSecret(selectedThread).catch(() => null)
      if (!secret) return
      for (const { message, attachment } of encryptedAttachments) {
        if (cancelled) return
        const encryptionMeta = getAttachmentEncryptionMeta(attachment)
        const sourceUrl = resolveAttachmentUrl(attachment.url, token)
        if (!encryptionMeta || !sourceUrl) continue
        try {
          const response = await fetch(sourceUrl)
          if (!response.ok) continue
          const encryptedBytes = await response.arrayBuffer()
          const decryptedBytes = await decryptMessengerBinary(secret.keyRawB64, encryptionMeta, encryptedBytes)
          if (cancelled) return
          const blob = new Blob([decryptedBytes], { type: attachment.content_type || 'application/octet-stream' })
          setDecryptedAttachmentUrl(getAttachmentCacheKey(message.id, attachment.id), URL.createObjectURL(blob))
        } catch (error) {
          console.warn('[Messenger] Failed to decrypt attachment', error)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentUserId, ensureDirectThreadSecret, selectedThread, setDecryptedAttachmentUrl, token])

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId
  }, [selectedThreadId])

  useEffect(() => {
    selectedThreadRef.current = selectedThread
  }, [selectedThread])

  useEffect(() => {
    threadsRef.current = threads
  }, [threads])

  useEffect(() => {
    Object.entries(groupCallParticipants).forEach(([userId, participant]) => {
      const stream = participant.stream
      if (!stream) return
      const audio = groupRemoteAudioRefs.current[userId]
      if (audio && audio.srcObject !== stream) {
        audio.srcObject = stream
        void audio.play().catch(() => null)
      }
      const video = groupRemoteVideoRefs.current[userId]
      if (video && video.srcObject !== stream) {
        video.srcObject = stream
        void video.play().catch(() => null)
      }
    })
  }, [groupCallParticipants])

  useEffect(() => {
    if (!orgId || !selectedThreadId || editingMessageId) return
    const draft = window.localStorage.getItem(getDraftStorageKey(orgId, selectedThreadId))
    if (draft !== null) setMessageText(draft)
  }, [editingMessageId, orgId, selectedThreadId])

  useEffect(() => {
    if (!orgId || !selectedThreadId || editingMessageId) return
    const key = getDraftStorageKey(orgId, selectedThreadId)
    if (!key) return
    if (messageText.trim()) window.localStorage.setItem(key, messageText)
    else window.localStorage.removeItem(key)
  }, [editingMessageId, messageText, orgId, selectedThreadId])

  useEffect(() => {
    setActiveSearchResultIndex(0)
  }, [chatSearchQuery, selectedThreadId])

  useEffect(() => {
    if (chatSearchMatches.length === 0) return
    if (activeSearchResultIndex >= chatSearchMatches.length) setActiveSearchResultIndex(0)
  }, [activeSearchResultIndex, chatSearchMatches.length])

  useEffect(() => {
    const textarea = composerTextareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [messageText, editingMessageId, replyingTo])

  useEffect(() => {
    const viewport = messageViewportRef.current
    if (!viewport) return
    const handleScroll = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
      setShowJumpToBottom(distanceFromBottom > 240)
    }
    handleScroll()
    viewport.addEventListener('scroll', handleScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', handleScroll)
  }, [displayedMessages.length, selectedThreadId])

  useEffect(() => {
    if (!selectedThreadId) return
    const hasText = messageText.trim().length > 0
    if (hasText && !typingSentRef.current) {
      sendTypingSignal(true)
      typingSentRef.current = true
    }
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = window.setTimeout(() => {
      if (typingSentRef.current) {
        sendTypingSignal(false)
        typingSentRef.current = false
      }
    }, 1800)
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }, [messageText, selectedThreadId, sendTypingSignal])

  const cleanupVoiceRecorder = useCallback(() => {
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    mediaRecorderRef.current = null
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
    voiceStreamRef.current = null
    voiceChunksRef.current = []
    setRecordingVoice(false)
  }, [])

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    remoteStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
  }, [])

  const stopAllSounds = useCallback(() => {
    ringtoneSoundRef.current?.stop()
    ringtoneSoundRef.current = null
    dialToneSoundRef.current?.stop()
    dialToneSoundRef.current = null
  }, [])



  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      window.clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    setCallDuration(0)
  }, [])

  const startCallTimer = useCallback(() => {
    stopCallTimer()
    setCallDuration(0)
    callTimerRef.current = window.setInterval(() => {
      setCallDuration((d) => d + 1)
    }, 1000)
  }, [stopCallTimer])

  const persistCallEvent = useCallback((threadId: string, mediaKind: CallMediaKind, callStatus: 'missed' | 'ended', durationSeconds?: number) => {
    if (!orgId) return
    void createMessengerCallEvent(orgId, threadId, {
      media_kind: mediaKind,
      call_status: callStatus,
      duration_seconds: typeof durationSeconds === 'number' ? durationSeconds : undefined,
    }).then(async ({ data }) => {
      setSelectedThread((current) => current?.id === threadId ? upsertMessage(current, data) : current)
      setThreads((current) => {
        const existing = current.find((thread) => thread.id === threadId)
        if (!existing) return current
        return upsertThread(current, {
          ...existing,
          last_message_preview: data.body || existing.last_message_preview,
          updated_at: data.created_at || existing.updated_at,
          messages: existing.messages,
        })
      })
      if (selectedThreadIdRef.current === threadId) {
        const { data: freshThread } = await getMessengerThread(orgId, threadId, { limit: MESSAGES_PAGE_SIZE, before: null })
        const normalizedBase: SupportThread = normalizeOpenedThread({
          ...freshThread,
          messages: freshThread.messages || [],
        }, threadId)
        const normalized = await decryptThreadMessages(normalizedBase)
        setHasMoreMessages(Boolean(freshThread.has_more_messages))
        setNextBefore(freshThread.next_before || null)
        setSelectedThread(normalized)
        setThreads((current) => upsertThread(current, { ...normalized, messages: [] }))
      }
    }).catch((error) => {
      console.error('Failed to persist call event', error)
    })
  }, [decryptThreadMessages, orgId])

  const cleanupCall = useCallback((notify = false) => {
    const currentCall = activeCallRef.current
    if (notify && currentCall) {
      const wasConnected = currentCall.phase === 'connected'
      const durationSeconds = wasConnected ? callDurationRef.current : 0
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        void wsCallbacksRef.current.sendCallSignal({
          type: 'call_signal',
          thread_id: currentCall.threadId,
          ...(currentCall.threadKind === 'group' ? {} : { target_user_id: currentCall.targetUserId }),
          signal_type: 'end',
          media_kind: currentCall.mediaKind,
          payload: {
            call_status: wasConnected ? 'ended' : 'missed',
            duration_seconds: durationSeconds,
            thread_kind: currentCall.threadKind || 'direct',
          },
        })
      }
      persistCallEvent(currentCall.threadId, currentCall.mediaKind, wasConnected ? 'ended' : 'missed', durationSeconds)
    }
    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    Object.values(groupPeerConnectionsRef.current).forEach((peer) => peer.close())
    groupPeerConnectionsRef.current = {}
    groupPendingIceCandidatesRef.current = {}
    setGroupCallParticipants({})
    stopLocalMedia()
    stopAllSounds()
    stopCallTimer()
    pendingIceCandidatesRef.current = []
    remoteDescriptionSetRef.current = false
    setIncomingCall(null)
    setActiveCall(null)
    activeCallRef.current = null
    setIsMuted(false)
    setIsCameraOff(false)
    setIsCallFullscreen(false)
    setCallWindowPosition(null)
    callDragRef.current = null
  }, [persistCallEvent, stopLocalMedia, stopAllSounds, stopCallTimer])

  const ensureLocalStream = useCallback(async (mediaKind: CallMediaKind) => {
    try {
      if (localStreamRef.current) {
        if (mediaKind === 'video' && localStreamRef.current.getVideoTracks().length === 0) {
          const videoStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
          const videoTrack = videoStream.getVideoTracks()[0]
          if (videoTrack) {
            localStreamRef.current.addTrack(videoTrack)
          }
        }
        if (mediaKind === 'video' && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current
          localVideoRef.current.muted = true
          void localVideoRef.current.play().catch(() => null)
        }
        return localStreamRef.current
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mediaKind === 'video' })
      localStreamRef.current = stream
      if (mediaKind === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        void localVideoRef.current.play().catch(() => null)
      }
      return stream
    } catch (err) {
      console.error('[Call] getUserMedia failed:', err)
      toast.error(getMediaFeatureErrorMessage(mediaKind))
      throw err
    }
  }, [])

  const createPeerConnection = useCallback(async (threadId: string, targetUserId: string, mediaKind: CallMediaKind) => {
    peerConnectionRef.current?.close()
    pendingIceCandidatesRef.current = []
    remoteDescriptionSetRef.current = false
    const effectiveIceServers = iceServers.length > 0 ? iceServers : [{ urls: 'stun:stun.l.google.com:19302' }]
    const hasTurnServer = effectiveIceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
      return urls.some((url) => String(url).startsWith('turn:') || String(url).startsWith('turns:'))
    })
    const peer = new RTCPeerConnection({
      iceServers: effectiveIceServers,
      iceTransportPolicy: hasTurnServer ? 'relay' : 'all',
      bundlePolicy: 'max-bundle',
    })
    peerConnectionRef.current = peer
    const stream = await ensureLocalStream(mediaKind)
    stream.getTracks().forEach((track) => peer.addTrack(track, stream))
    peer.onicecandidate = (event) => {
      if (!event.candidate || socketRef.current?.readyState !== WebSocket.OPEN) return
      void wsCallbacksRef.current.sendCallSignal({
        type: 'call_signal',
        thread_id: threadId,
        target_user_id: targetUserId,
        signal_type: 'ice-candidate',
        media_kind: mediaKind,
        payload: event.candidate.toJSON(),
      })
    }
    peer.ontrack = (event) => {
      const [streamValue] = event.streams
      if (!streamValue) return
      remoteStreamRef.current = streamValue
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = streamValue
        void remoteAudioRef.current.play().catch((err) => console.warn('[Call] remote audio play blocked:', err))
      }
      if (mediaKind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = streamValue
        void remoteVideoRef.current.play().catch((err) => console.warn('[Call] remote video play blocked:', err))
      }
    }
    peer.oniceconnectionstatechange = () => {
      console.log('[Call] ICE connection state:', peer.iceConnectionState)
      if (peer.iceConnectionState === 'failed') {
        console.warn('[Call] ICE failed, attempting restart')
        peer.restartIce()
      }
    }
    peer.onconnectionstatechange = () => {
      console.log('[Call] connection state:', peer.connectionState)
      if (peer.connectionState === 'connected') {
        stopAllSounds()
        startCallTimer()
        setActiveCall((current) => current ? { ...current, phase: 'connected' } : current)
      }
      if (peer.connectionState === 'failed') {
        toast.error('Не удалось установить соединение')
        cleanupCall(true)
      }
      if (peer.connectionState === 'disconnected') {
        setTimeout(() => {
          if (peerConnectionRef.current?.connectionState === 'disconnected') {
            toast.info('Соединение потеряно')
            cleanupCall(false)
          }
        }, 5000)
      }
    }
    return peer
  }, [cleanupCall, ensureLocalStream, iceServers, startCallTimer, stopAllSounds])

  const createGroupPeerConnection = useCallback(async (threadId: string, targetUserId: string, mediaKind: CallMediaKind, participantName?: string, participantAvatarUrl?: string | null) => {
    groupPeerConnectionsRef.current[targetUserId]?.close()
    groupPendingIceCandidatesRef.current[targetUserId] = []
    const effectiveIceServers = iceServers.length > 0 ? iceServers : [{ urls: 'stun:stun.l.google.com:19302' }]
    const hasTurnServer = effectiveIceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
      return urls.some((url) => String(url).startsWith('turn:') || String(url).startsWith('turns:'))
    })
    const peer = new RTCPeerConnection({
      iceServers: effectiveIceServers,
      iceTransportPolicy: hasTurnServer ? 'relay' : 'all',
      bundlePolicy: 'max-bundle',
    })
    groupPeerConnectionsRef.current[targetUserId] = peer
    const participantIdentity = getParticipantIdentity(threadId, targetUserId, participantName)
    setGroupParticipantState(targetUserId, { name: participantIdentity.name, avatarUrl: participantAvatarUrl ?? participantIdentity.avatarUrl, mediaKind, phase: 'connecting' })
    const stream = await ensureLocalStream(mediaKind)
    stream.getTracks().forEach((track) => peer.addTrack(track, stream))
    peer.onicecandidate = (event) => {
      if (!event.candidate || socketRef.current?.readyState !== WebSocket.OPEN) return
      void wsCallbacksRef.current.sendCallSignal({
        type: 'call_signal',
        thread_id: threadId,
        target_user_id: targetUserId,
        signal_type: 'ice-candidate',
        media_kind: mediaKind,
        payload: event.candidate.toJSON(),
      })
    }
    peer.ontrack = (event) => {
      const [streamValue] = event.streams
      if (!streamValue) return
      setGroupParticipantState(targetUserId, {
        name: participantIdentity.name,
        avatarUrl: participantAvatarUrl ?? participantIdentity.avatarUrl,
        mediaKind,
        phase: 'connected',
        stream: streamValue,
      })
      setActiveCall((current) => current ? { ...current, phase: 'connected' } : current)
      stopAllSounds()
      startCallTimer()
    }
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'failed') peer.restartIce()
    }
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
        closeGroupPeerConnection(targetUserId)
      }
      if (peer.connectionState === 'disconnected') {
        window.setTimeout(() => {
          if (groupPeerConnectionsRef.current[targetUserId]?.connectionState === 'disconnected') {
            closeGroupPeerConnection(targetUserId)
          }
        }, 4000)
      }
    }
    return peer
  }, [closeGroupPeerConnection, ensureLocalStream, getParticipantIdentity, iceServers, setGroupParticipantState, startCallTimer, stopAllSounds])

  const sendCallSignal = useCallback(async (payload: Record<string, unknown>) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('[Call] WebSocket not open, signal dropped:', payload)
      return
    }
    let nextPayload: Record<string, unknown> = { ...payload }
    const threadId = typeof payload.thread_id === 'string' ? payload.thread_id : String(payload.thread_id || '')
    const thread = threadId ? getThreadSnapshotById(threadId) : null
    const rawSignalPayload = payload.payload
    if (thread && isDirectMessengerThread(thread) && rawSignalPayload && typeof rawSignalPayload === 'object' && !Array.isArray(rawSignalPayload)) {
      const secret = await ensureDirectThreadSecret(thread).catch(() => null)
      if (secret) {
        nextPayload = {
          ...payload,
          encrypted: true,
          payload: await encryptCallSignalPayload(secret.keyRawB64, rawSignalPayload as Record<string, unknown>, secret.keyVersion),
        }
      }
    }
    socketRef.current.send(JSON.stringify(nextPayload))
  }, [ensureDirectThreadSecret, getThreadSnapshotById])

  const flushIceCandidates = useCallback(async () => {
    const peer = peerConnectionRef.current
    if (!peer) return
    const pending = [...pendingIceCandidatesRef.current]
    pendingIceCandidatesRef.current = []
    for (const candidate of pending) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('[Call] Failed to add buffered ICE candidate:', err)
      }
    }
  }, [])

  const startOfferFlow = useCallback(async (threadId: string, targetUserId: string, mediaKind: CallMediaKind) => {
    try {
      const isGroupCall = activeCallRef.current?.threadKind === 'group'
      const peer = isGroupCall
        ? await createGroupPeerConnection(threadId, targetUserId, mediaKind)
        : await createPeerConnection(threadId, targetUserId, mediaKind)
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      sendCallSignal({
        type: 'call_signal',
        thread_id: threadId,
        target_user_id: targetUserId,
        signal_type: 'offer',
        media_kind: mediaKind,
        payload: { type: offer.type, sdp: offer.sdp },
      })
      setActiveCall((current) => current ? ({
        ...current,
        threadId,
        targetUserId: current.threadKind === 'group' ? current.targetUserId : targetUserId,
        targetUserName: current.targetUserName || 'Сотрудник',
        targetAvatarUrl: current.targetAvatarUrl || null,
        mediaKind,
        phase: 'connecting',
      }) : {
        threadId,
        targetUserId,
        targetUserName: 'Сотрудник',
        targetAvatarUrl: null,
        mediaKind,
        phase: 'connecting',
        threadKind: 'direct',
      })
    } catch (err) {
      console.error('[Call] startOfferFlow failed:', err)
      toast.error('Не удалось начать звонок')
      cleanupCall(true)
    }
  }, [cleanupCall, createGroupPeerConnection, createPeerConnection, sendCallSignal])

  useEffect(() => {
    wsCallbacksRef.current = { cleanupCall, createPeerConnection, createGroupPeerConnection, flushIceCandidates, flushGroupIceCandidates, closeGroupPeerConnection, markThreadRead, sendCallSignal, startOfferFlow, stopAllSounds }
  })

  useEffect(() => {
    if (!activeCall || isCallFullscreen) return
    const handleMove = (event: PointerEvent) => {
      const drag = callDragRef.current
      const node = callWindowRef.current
      if (!drag || !node) return
      const maxX = Math.max(16, window.innerWidth - node.offsetWidth - 16)
      const maxY = Math.max(16, window.innerHeight - node.offsetHeight - 16)
      const nextX = Math.min(maxX, Math.max(16, event.clientX - drag.offsetX))
      const nextY = Math.min(maxY, Math.max(16, event.clientY - drag.offsetY))
      setCallWindowPosition({ x: nextX, y: nextY })
    }
    const handleUp = () => {
      callDragRef.current = null
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [activeCall, isCallFullscreen])

  useEffect(() => {
    if (!orgId || !token) return
    isUnmountedRef.current = false

    const connectSocket = () => {
      const liveToken = getLatestAuthToken(token)
      if (!liveToken) return
      const socket = new WebSocket(buildMessengerWebSocketUrl(liveToken, orgId))
      socketRef.current = socket
      socket.onopen = () => {
        reconnectAttemptRef.current = 0
        if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
        pingRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }))
          }
        }, 20000)
      }
      socket.onmessage = async (event) => {
        const cb = wsCallbacksRef.current
        const payload = JSON.parse(event.data) as Record<string, any>
        if (payload.type === 'thread_created' || payload.type === 'message_created' || payload.type === 'thread_read' || payload.type === 'message_updated' || payload.type === 'message_deleted' || payload.type === 'thread_updated') {
          const isIncomingMessage = payload.type === 'message_created' && payload.message?.author_id !== currentUserId
          if ((payload.type === 'thread_created') || isIncomingMessage) {
            window.dispatchEvent(new CustomEvent('notifications:refresh'))
          }
          const thread = payload.thread as SupportThread | undefined
          if (thread) {
            const normalizedThread = normalizeOpenedThread({ ...thread, messages: [] }, selectedThreadIdRef.current)
            setThreads((current) => upsertThread(current, normalizedThread))
            if (thread.id === selectedThreadIdRef.current) {
              const decryptedThread = await decryptThreadMessages({
                ...normalizeOpenedThread(thread, selectedThreadIdRef.current),
                messages: mergeMessagePages(selectedThreadRef.current?.messages || [], thread.messages || []),
              })
              setSelectedThread((current) => current?.id === thread.id ? decryptedThread : current)
            }
            if (!selectedThreadIdRef.current && (payload.type === 'thread_created' || payload.type === 'message_created')) setSelectedThreadId(thread.id)
            if (isIncomingMessage) {
              if (thread.id !== selectedThreadIdRef.current || shouldUseBrowserNotifications()) {
                playNotificationChime()
              }
              const authorProfile = (thread.participant_profiles || []).find((item) => item.id === payload.message?.author_id)
              const title = thread.thread_kind === 'group'
                ? `${getThreadTitle(thread, currentUserId)} · ${authorProfile?.name || payload.message?.author_name || 'Сотрудник'}`
                : (authorProfile?.name || payload.message?.author_name || getThreadTitle(thread, currentUserId))
              const body = String(payload.message?.body || '').trim() || thread.last_message_preview || 'Новое сообщение'
              showBrowserNotification(
                `messenger-thread:${thread.id}`,
                title,
                {
                  body,
                  tag: `messenger-thread:${thread.id}`,
                  icon: authorProfile?.avatar_url || undefined,
                  onClick: () => {
                    setSelectedThreadId(thread.id)
                    setShowPeoplePanel(false)
                    setShowThreadInfo(false)
                    void cb.markThreadRead(thread.id)
                    void markThreadNotificationsRead(thread.id)
                  },
                },
              )
            }
            if (payload.type === 'message_created' && thread.id === selectedThreadIdRef.current && payload.message?.author_id !== currentUserId) {
              setThreads((current) => clearThreadUnreadInList(current, thread.id))
              setSelectedThread((current) => clearThreadUnread(current, thread.id))
              closeBrowserNotification(`messenger-thread:${thread.id}`)
              void cb.markThreadRead(thread.id)
              void markThreadNotificationsRead(thread.id)
            }
          }
          return
        }
        if (payload.type === 'thread_removed') {
          const threadId = String(payload.thread_id || '')
          if (!threadId) return
          setThreads((current) => current.filter((thread) => thread.id !== threadId))
          setSelectedThread((current) => current?.id === threadId ? null : current)
          setSelectedThreadId((current) => current === threadId ? null : current)
          if (selectedThreadIdRef.current === threadId) selectedThreadIdRef.current = null
          return
        }
        if (payload.type === 'typing') {
          const threadId = String(payload.thread_id || '')
          const userId = String(payload.user_id || '')
          const userName = String(payload.user_name || 'Сотрудник')
          const isTyping = Boolean(payload.is_typing)
          if (!threadId || !userId) return
          setTypingUsersByThread((current) => {
            const nextThread = { ...(current[threadId] || {}) }
            if (isTyping) nextThread[userId] = userName
            else delete nextThread[userId]
            return { ...current, [threadId]: nextThread }
          })
          return
        }
        if (payload.type === 'messages_read') {
          setSelectedThread((current) => current?.id === payload.thread_id ? updateReadState(current, payload.message_ids || [], payload.user_id, payload.read_at || null) : current)
          return
        }
        if (payload.type !== 'call_signal') return
        const signalType = payload.signal_type as string
        const threadId = String(payload.thread_id)
        const fromUserId = String(payload.from_user_id)
        const mediaKind = (payload.media_kind || 'audio') as CallMediaKind
        let signalPayload = payload.payload
        const threadSnapshot = getThreadSnapshotById(threadId)
        if (payload.encrypted && threadSnapshot && isDirectMessengerThread(threadSnapshot) && signalPayload && typeof signalPayload === 'object' && !Array.isArray(signalPayload)) {
          const secret = await ensureDirectThreadSecret(threadSnapshot).catch(() => null)
          if (secret) {
            try {
              signalPayload = await decryptCallSignalPayload(secret.keyRawB64, signalPayload as MessengerEncryptedPayload)
            } catch (error) {
              console.warn('[Call] Failed to decrypt signaling payload', error)
              return
            }
          }
        }
        const payloadThreadKind = signalPayload && typeof signalPayload === 'object' && 'thread_kind' in signalPayload
          ? String((signalPayload as Record<string, unknown>).thread_kind || '')
          : ''
        const threadKind = (payloadThreadKind === 'group' || threadSnapshot?.thread_kind === 'group') ? 'group' : 'direct'
        const threadTitle = signalPayload && typeof signalPayload === 'object' && 'thread_title' in signalPayload
          ? String((signalPayload as Record<string, unknown>).thread_title || '')
          : (threadSnapshot?.subject || null)
        if (signalType === 'invite') {
          if (activeCallRef.current) {
            cb.sendCallSignal({
              type: 'call_signal',
              thread_id: threadId,
              target_user_id: fromUserId,
              signal_type: 'decline',
              media_kind: mediaKind,
            })
            return
          }
          cb.stopAllSounds()
          ringtoneSoundRef.current = createRingtone()
          setIncomingCall({
            threadId,
            fromUserId,
            fromUserName: String(payload.from_user_name || 'Сотрудник'),
            mediaKind,
            threadKind,
            threadTitle,
          })
          showBrowserNotification(
            `messenger-call:${threadId}`,
            threadKind === 'group' ? (threadTitle || 'Групповой чат') : String(payload.from_user_name || 'Сотрудник'),
            {
              body: `Входящий ${mediaKind === 'video' ? 'видеозвонок' : 'аудиозвонок'}${threadKind === 'group' ? ` · инициатор ${String(payload.from_user_name || 'Сотрудник')}` : ''}`,
              tag: `messenger-call:${threadId}`,
              requireInteraction: true,
              silent: false,
              onClick: () => {
                setSelectedThreadId(threadId)
                setShowPeoplePanel(false)
                setShowThreadInfo(false)
              },
            },
          )
          return
        }
        if (signalType === 'accept') {
          cb.stopAllSounds()
          if (activeCallRef.current?.threadKind === 'group') {
            const participantIdentity = getParticipantIdentity(threadId, fromUserId, String(payload.from_user_name || 'Сотрудник'))
            setGroupParticipantState(fromUserId, {
              name: participantIdentity.name,
              avatarUrl: participantIdentity.avatarUrl,
              mediaKind,
              phase: 'connecting',
            })
          }
          void cb.startOfferFlow(threadId, fromUserId, mediaKind)
          return
        }
        if (signalType === 'decline') {
          if (activeCallRef.current?.threadKind === 'group') {
            cb.closeGroupPeerConnection(fromUserId)
            return
          }
          toast.error('Звонок отклонён')
          cb.cleanupCall(false)
          return
        }
        if (signalType === 'end') {
          if (threadKind === 'group') {
            cb.closeGroupPeerConnection(fromUserId)
            return
          }
          toast.info('Звонок завершён')
          cb.cleanupCall(false)
          return
        }
        if (signalType === 'offer') {
          void (async () => {
            if (threadKind === 'group') {
              let peer = groupPeerConnectionsRef.current[fromUserId]
              if (!peer) {
                const participantIdentity = getParticipantIdentity(threadId, fromUserId, String(payload.from_user_name || 'Сотрудник'))
                peer = await cb.createGroupPeerConnection(threadId, fromUserId, mediaKind, participantIdentity.name, participantIdentity.avatarUrl)
              }
              await peer.setRemoteDescription(new RTCSessionDescription(signalPayload as RTCSessionDescriptionInit))
              await cb.flushGroupIceCandidates(fromUserId)
              const answer = await peer.createAnswer()
              await peer.setLocalDescription(answer)
              cb.sendCallSignal({
                type: 'call_signal',
                thread_id: threadId,
                target_user_id: fromUserId,
                signal_type: 'answer',
                media_kind: mediaKind,
                payload: { type: answer.type, sdp: answer.sdp },
              })
              setActiveCall((current) => current
                ? { ...current, threadId, mediaKind, phase: current.phase === 'connected' ? 'connected' : 'connecting', threadKind: 'group' }
                : { threadId, targetUserId: threadId, targetUserName: threadTitle || 'Групповой звонок', targetAvatarUrl: null, mediaKind, phase: 'connecting', threadKind: 'group' })
              setIncomingCall(null)
              return
            }
            let peer = peerConnectionRef.current
            const isSameCall = activeCallRef.current?.threadId === threadId && activeCallRef.current?.targetUserId === fromUserId
            if (!peer || !isSameCall) {
              peer = await cb.createPeerConnection(threadId, fromUserId, mediaKind)
            }
            await peer.setRemoteDescription(new RTCSessionDescription(signalPayload as RTCSessionDescriptionInit))
            remoteDescriptionSetRef.current = true
            await cb.flushIceCandidates()
            const answer = await peer.createAnswer()
            await peer.setLocalDescription(answer)
            cb.sendCallSignal({
              type: 'call_signal',
              thread_id: threadId,
              target_user_id: fromUserId,
              signal_type: 'answer',
              media_kind: mediaKind,
              payload: { type: answer.type, sdp: answer.sdp },
            })
            setActiveCall((current) => current
              ? { ...current, threadId, targetUserId: fromUserId, targetUserName: current.targetUserName || String(payload.from_user_name || 'Сотрудник'), mediaKind, phase: current.phase === 'connected' ? 'connected' : 'connecting' }
              : { threadId, targetUserId: fromUserId, targetUserName: String(payload.from_user_name || 'Сотрудник'), targetAvatarUrl: null, mediaKind, phase: 'connecting' })
            setIncomingCall(null)
          })().catch(() => {
            toast.error('Не удалось принять звонок')
            cb.cleanupCall(true)
          })
          return
        }
        if (signalType === 'answer') {
          void (async () => {
            if (threadKind === 'group') {
              const peer = groupPeerConnectionsRef.current[fromUserId]
              if (!peer) return
              await peer.setRemoteDescription(new RTCSessionDescription(signalPayload as RTCSessionDescriptionInit))
              await cb.flushGroupIceCandidates(fromUserId)
              return
            }
            const peer = peerConnectionRef.current
            if (!peer) return
            await peer.setRemoteDescription(new RTCSessionDescription(signalPayload as RTCSessionDescriptionInit))
            remoteDescriptionSetRef.current = true
            await cb.flushIceCandidates()
          })().catch(() => {
            toast.error('Не удалось установить соединение')
          })
          return
        }
        if (signalType === 'ice-candidate' && payload.payload) {
          if (threadKind === 'group') {
            const peer = groupPeerConnectionsRef.current[fromUserId]
            if (!peer || !peer.remoteDescription) {
              groupPendingIceCandidatesRef.current[fromUserId] = [...(groupPendingIceCandidatesRef.current[fromUserId] || []), signalPayload as RTCIceCandidateInit]
            } else {
              void peer.addIceCandidate(new RTCIceCandidate(signalPayload as RTCIceCandidateInit)).catch(() => null)
            }
            return
          }
          if (!remoteDescriptionSetRef.current) {
            pendingIceCandidatesRef.current.push(signalPayload as RTCIceCandidateInit)
          } else {
            void peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(signalPayload as RTCIceCandidateInit)).catch(() => null)
          }
        }
      }
      socket.onclose = () => {
        if (pingRef.current) window.clearInterval(pingRef.current)
        pingRef.current = null
        if (isUnmountedRef.current) return
        reconnectAttemptRef.current += 1
        const delay = Math.min(10000, 1000 * (2 ** Math.min(reconnectAttemptRef.current, 3)))
        reconnectTimerRef.current = window.setTimeout(connectSocket, delay)
      }
    }

    connectSocket()

    return () => {
      isUnmountedRef.current = true
      if (pingRef.current) window.clearInterval(pingRef.current)
      pingRef.current = null
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
      Object.values(browserNotificationsRef.current).forEach((notification) => notification.close())
      browserNotificationsRef.current = {}
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [closeBrowserNotification, currentUserId, markThreadNotificationsRead, orgId, showBrowserNotification, token])

  useEffect(() => () => {
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current)
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    wsCallbacksRef.current.cleanupCall(true)
    cleanupVoiceRecorder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyThreadResponse(thread: SupportThread) {
    setThreads((current) => upsertThread(current, { ...thread, messages: [] }))
    setSelectedThread((current) => current?.id === thread.id ? {
      ...thread,
      messages: mergeMessagePages(current.messages || [], thread.messages || []),
    } : current)
  }

  async function handleSaveGroupTitle() {
    if (!orgId || !selectedThread || selectedThread.thread_kind !== 'group') return
    const title = groupSettingsTitle.trim()
    if (title.length < 2) {
      toast.error('Название группы должно быть не короче 2 символов')
      return
    }
    setSavingGroupTitle(true)
    try {
      const { data } = await updateMessengerGroupThread(orgId, selectedThread.id, { title })
      applyThreadResponse(data.thread)
      toast.success('Название группы обновлено')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить название группы'))
    } finally {
      setSavingGroupTitle(false)
    }
  }

  async function handleUploadGroupAvatar(file?: File | null) {
    if (!orgId || !selectedThread || selectedThread.thread_kind !== 'group' || !file) return
    setUpdatingGroupAvatar(true)
    try {
      const { data } = await uploadMessengerGroupAvatar(orgId, selectedThread.id, file)
      applyThreadResponse(data.thread)
      toast.success('Фото группы обновлено')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить фото группы'))
    } finally {
      setUpdatingGroupAvatar(false)
    }
  }

  async function handleDeleteGroupAvatar() {
    if (!orgId || !selectedThread || selectedThread.thread_kind !== 'group') return
    setUpdatingGroupAvatar(true)
    try {
      const { data } = await deleteMessengerGroupAvatar(orgId, selectedThread.id)
      applyThreadResponse(data.thread)
      toast.success('Фото группы удалено')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить фото группы'))
    } finally {
      setUpdatingGroupAvatar(false)
    }
  }

  async function handleRemoveGroupMember(userId: string, userName: string) {
    if (!orgId || !selectedThread || selectedThread.thread_kind !== 'group') return
    setGroupActionUserId(userId)
    try {
      const { data } = await removeMessengerGroupMember(orgId, selectedThread.id, userId)
      applyThreadResponse(data.thread)
      toast.success(`${userName} удалён(а) из группы`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить участника'))
    } finally {
      setGroupActionUserId(null)
    }
  }

  async function handleAddGroupAdmin(userId: string) {
    if (!orgId || !selectedThread || selectedThread.thread_kind !== 'group') return
    setGroupActionUserId(userId)
    try {
      const { data } = await addMessengerGroupAdmin(orgId, selectedThread.id, userId)
      applyThreadResponse(data.thread)
      toast.success('Участник назначен админом')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось назначить админа'))
    } finally {
      setGroupActionUserId(null)
    }
  }

  async function handleRemoveGroupAdmin(userId: string) {
    if (!orgId || !selectedThread || selectedThread.thread_kind !== 'group') return
    setGroupActionUserId(userId)
    try {
      const { data } = await removeMessengerGroupAdmin(orgId, selectedThread.id, userId)
      applyThreadResponse(data.thread)
      toast.success('Права админа сняты')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось снять права админа'))
    } finally {
      setGroupActionUserId(null)
    }
  }

  async function handleToggleGroupAdminPermission(
    userId: string,
    permission: 'manage_info' | 'manage_members' | 'manage_admins',
    value: boolean,
    currentPermissions: { manage_info: boolean; manage_members: boolean; manage_admins: boolean },
  ) {
    if (!orgId || !selectedThread || selectedThread.thread_kind !== 'group') return
    const nextPermissions = { ...currentPermissions, [permission]: value }
    if (!nextPermissions.manage_info && !nextPermissions.manage_members && !nextPermissions.manage_admins) {
      toast.error('У админа должна остаться хотя бы одна привилегия')
      return
    }
    setGroupActionUserId(userId)
    try {
      const { data } = await updateMessengerGroupAdmin(orgId, selectedThread.id, userId, nextPermissions)
      applyThreadResponse(data.thread)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить привилегии админа'))
    } finally {
      setGroupActionUserId(null)
    }
  }

  function handleOpenThread(threadId: string) {
    setOpenMessageMenuId(null)
    setOpenThreadMenuId(null)
    setShowThreadInfo(false)
    selectedThreadIdRef.current = threadId
    setSelectedThreadId(threadId)
    setSelectedThread((current) => clearThreadUnread(current, threadId))
    setThreads((current) => clearThreadUnreadInList(current, threadId))
    window.dispatchEvent(new CustomEvent('notifications:refresh'))
  }

  async function handleLoadMoreMessages() {
    if (!selectedThreadId || !nextBefore || loadingMoreMessages) return
    setLoadingMoreMessages(true)
    skipNextAutoScrollRef.current = true
    try {
      await loadSelectedThread(selectedThreadId, { before: nextBefore, append: true })
    } catch (error) {
      skipNextAutoScrollRef.current = false
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить старые сообщения'))
    } finally {
      setLoadingMoreMessages(false)
    }
  }

  async function handleTranscribeAttachment(message: SupportMessage, attachment: SupportMessageAttachment) {
    if (!orgId || !selectedThreadId) return
    if (attachment.encryption?.encrypted_blob) {
      toast.info('Зашифрованные голосовые сообщения пока нельзя распознавать на сервере')
      return
    }
    const key = `${message.id}:${attachment.id}`
    setTranscribingAttachmentKey(key)
    try {
      const { data } = await transcribeMessengerAttachment(orgId, selectedThreadId, message.id, attachment.id)
      setSelectedThread((current) => upsertMessage(current, data.message))
      toast.success('Аудио распознано')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось распознать аудио'))
    } finally {
      setTranscribingAttachmentKey(null)
    }
  }

  async function handleStartChat(user: User) {
    if (!orgId) return
    setCreatingThreadId(user.id)
    try {
      const { data } = await createDirectMessengerThread(orgId, { participant_id: user.id })
      setThreads((current) => upsertThread(current, { ...data, messages: [] }))
      setSelectedThreadId(data.id)
      await loadSelectedThread(data.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось открыть диалог'))
    } finally {
      setCreatingThreadId(null)
    }
  }

  async function handleCreateGroup() {
    if (!orgId) return
    if (groupTitle.trim().length < 2) {
      toast.error('Укажи название группы')
      return
    }
    if (groupMemberIds.length < 2) {
      toast.error('Добавь минимум двух сотрудников в группу')
      return
    }
    setCreatingGroup(true)
    try {
      const { data } = await createGroupMessengerThread(orgId, { title: groupTitle.trim(), participant_ids: groupMemberIds })
      setThreads((current) => upsertThread(current, { ...data, messages: [] }))
      setSelectedThreadId(data.id)
      setShowGroupCreator(false)
      setShowPeoplePanel(false)
      setGroupTitle('')
      setGroupMemberIds([])
      await loadSelectedThread(data.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось создать группу'))
    } finally {
      setCreatingGroup(false)
    }
  }

  async function handleStartVoiceRecording() {
    if (!mediaFeaturesAvailable) {
      toast.error(getMediaFeatureErrorMessage('voice'))
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      voiceStreamRef.current = stream
      const mimeType = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((item) => MediaRecorder.isTypeSupported(item)) || ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      voiceChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        cleanupVoiceRecorder()
        if (blob.size > 0) {
          const extension = blob.type.includes('ogg') ? 'ogg' : (blob.type.includes('mp4') || blob.type.includes('m4a')) ? 'm4a' : 'webm'
          const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: blob.type || 'audio/webm' })
          void handleSendVoiceMessage(file)
        }
      }
      recorder.onerror = () => {
        toast.error('Не удалось записать голосовое сообщение')
        cleanupVoiceRecorder()
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecordingVoice(true)
    } catch {
      toast.error('Не удалось получить доступ к микрофону')
      cleanupVoiceRecorder()
    }
  }

  function handleStopVoiceRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    if (recorder.state !== 'inactive') {
      if (typeof recorder.requestData === 'function') recorder.requestData()
      recorder.stop()
    }
  }

  async function handleSendVoiceMessage(file: File) {
    if (!orgId || !selectedThreadId) return
    if (typingSentRef.current) {
      sendTypingSignal(false)
      typingSentRef.current = false
    }
    setSending(true)
    try {
      const activeThread = getThreadSnapshotById(selectedThreadId)
      let filesToSend: File[] = [file]
      let encryptedAttachmentsPayload: string | null = null
      if (activeThread && isDirectMessengerThread(activeThread)) {
        const secret = await ensureDirectThreadSecret(activeThread).catch(() => null)
        if (secret) {
          const encryptedFiles: File[] = []
          const encryptedMetas: MessengerEncryptedAttachmentMeta[] = []
          const encrypted = await encryptMessengerBinary(secret.keyRawB64, await file.arrayBuffer(), secret.keyVersion)
          encryptedFiles.push(new File([Uint8Array.from(encrypted.encryptedBytes)], file.name, { type: file.type || 'application/octet-stream', lastModified: file.lastModified }))
          encryptedMetas.push(encrypted.payload)
          filesToSend = encryptedFiles
          encryptedAttachmentsPayload = JSON.stringify(encryptedMetas)
        }
      }
      const { data } = await sendMessengerMessage(orgId, selectedThreadId, {
        body: '',
        files: filesToSend,
        encrypted_attachments: encryptedAttachmentsPayload,
        reply_to_message_id: replyingTo?.id ?? null,
      })
      setSelectedThread((current) => upsertMessage(current, data))
      if (encryptedAttachmentsPayload && data.attachments?.[0]) {
        setDecryptedAttachmentUrl(getAttachmentCacheKey(data.id, data.attachments[0].id), URL.createObjectURL(file))
      }
      setThreads((current) => {
        const currentThread = current.find((thread) => thread.id === selectedThreadId)
        if (!currentThread) return current
        return upsertThread(current, {
          ...currentThread,
          last_message_preview: 'Голосовое сообщение',
          updated_at: data.created_at,
          messages: currentThread.messages,
        })
      })
      setReplyingTo(null)
      requestAnimationFrame(() => scrollViewportToBottom(messageViewportRef.current, 'smooth'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось отправить голосовое сообщение'))
    } finally {
      setSending(false)
    }
  }

  function handleSelectFiles(files: File[]) {
    appendPendingFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleScrollToBottom() {
    scrollViewportToBottom(messageViewportRef.current, 'smooth')
  }

  async function handleSendMessage() {
    if (!orgId || !selectedThreadId) return
    if (!messageText.trim() && pendingFiles.length === 0) return
    if (typingSentRef.current) {
      sendTypingSignal(false)
      typingSentRef.current = false
    }
    setSending(true)
    try {
      if (editingMessageId) {
        const editingMessage = selectedThread?.messages?.find((item) => item.id === editingMessageId)
        if (editingMessage?.encryption?.ciphertext_b64) {
          toast.error('Зашифрованные сообщения пока нельзя редактировать')
          return
        }
        const { data } = await updateMessengerMessage(orgId, selectedThreadId, editingMessageId, { body: messageText.trim() })
        setSelectedThread((current) => current?.id === selectedThreadId ? {
          ...data.thread,
          messages: mergeMessagePages(current.messages || [], data.thread.messages || []),
        } : current)
        setThreads((current) => upsertThread(current, { ...data.thread, messages: [] }))
        setEditingMessageId(null)
      } else {
        const activeThread = getThreadSnapshotById(selectedThreadId)
        const plainText = messageText.trim()
        let encryptedPayload: string | null = null
        let encryptedAttachmentsPayload: string | null = null
        let localEncryptedBody = plainText
        let filesToSend = pendingFiles
        if (activeThread && isDirectMessengerThread(activeThread)) {
          const secret = await ensureDirectThreadSecret(activeThread).catch(() => null)
          if (secret) {
            if (plainText) {
              const encrypted = await encryptMessengerText(secret.keyRawB64, plainText, secret.keyVersion)
              encryptedPayload = JSON.stringify(encrypted)
            }
            if (pendingFiles.length) {
              const encryptedFiles: File[] = []
              const encryptedMetas: MessengerEncryptedAttachmentMeta[] = []
              for (const sourceFile of pendingFiles) {
                const encrypted = await encryptMessengerBinary(secret.keyRawB64, await sourceFile.arrayBuffer(), secret.keyVersion)
                encryptedFiles.push(new File([Uint8Array.from(encrypted.encryptedBytes)], sourceFile.name, { type: sourceFile.type || 'application/octet-stream', lastModified: sourceFile.lastModified }))
                encryptedMetas.push(encrypted.payload)
              }
              filesToSend = encryptedFiles
              encryptedAttachmentsPayload = JSON.stringify(encryptedMetas)
            }
          }
        }
        const { data } = await sendMessengerMessage(orgId, selectedThreadId, {
          body: encryptedPayload ? '' : plainText,
          encrypted_payload: encryptedPayload,
          encrypted_attachments: encryptedAttachmentsPayload,
          files: filesToSend,
          reply_to_message_id: replyingTo?.id ?? null,
        })
        const nextMessage = encryptedPayload ? { ...data, body: localEncryptedBody } : data
        setSelectedThread((current) => upsertMessage(current, nextMessage))
        if (encryptedAttachmentsPayload && data.attachments?.length) {
          data.attachments.forEach((attachment, index) => {
            const sourceFile = pendingFiles[index]
            if (attachment?.id && sourceFile) {
              setDecryptedAttachmentUrl(getAttachmentCacheKey(data.id, attachment.id), URL.createObjectURL(sourceFile))
            }
          })
        }
        setThreads((current) => {
          const currentThread = current.find((thread) => thread.id === selectedThreadId)
          if (!currentThread) return current
          return upsertThread(current, {
            ...currentThread,
            last_message_preview: encryptedPayload ? localEncryptedBody : (plainText || getPendingFilesPreview(pendingFiles) || currentThread.last_message_preview),
            updated_at: data.created_at,
            messages: currentThread.messages,
          })
        })
      }
      setMessageText('')
      setPendingFiles([])
      setReplyingTo(null)
      if (orgId && selectedThreadId) window.localStorage.removeItem(getDraftStorageKey(orgId, selectedThreadId))
      if (fileInputRef.current) fileInputRef.current.value = ''
      cleanupVoiceRecorder()
      requestAnimationFrame(() => scrollViewportToBottom(messageViewportRef.current, 'smooth'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, editingMessageId ? 'Не удалось сохранить сообщение' : 'Не удалось отправить сообщение'))
    } finally {
      setSending(false)
    }
  }

  function handleReplyToMessage(message: SupportMessage) {
    setOpenMessageMenuId(null)
    setReplyingTo(message)
    setEditingMessageId(null)
  }

  function handleStartEditMessage(message: SupportMessage) {
    if (message.encryption?.ciphertext_b64) {
      toast.info('Зашифрованные сообщения пока нельзя редактировать')
      setOpenMessageMenuId(null)
      return
    }
    setOpenMessageMenuId(null)
    setEditingMessageId(message.id)
    setReplyingTo(null)
    setMessageText(message.deleted_for_all ? '' : (message.body || ''))
  }

  async function handleDeleteMessage(message: SupportMessage, scope: 'me' | 'all') {
    if (!orgId || !selectedThreadId) return
    try {
      const { data } = await deleteMessengerMessage(orgId, selectedThreadId, message.id, scope)
      setSelectedThread((current) => current?.id === selectedThreadId ? {
        ...data.thread,
        messages: (current.messages || []).filter((item) => item.id !== message.id),
      } : current)
      setThreads((current) => upsertThread(current, { ...data.thread, messages: [] }))
      if (editingMessageId === message.id) {
        setEditingMessageId(null)
        setMessageText('')
      }
      if (replyingTo?.id === message.id) setReplyingTo(null)
      setOpenMessageMenuId(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить сообщение'))
    }
  }

  function highlightMessage(messageId: string) {
    setHighlightedMessageId(messageId)
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedMessageId((current) => current === messageId ? null : current)
    }, MESSAGE_HIGHLIGHT_DURATION_MS)
  }

  function scrollToMessage(messageId?: string | null) {
    if (!messageId) return
    const element = messageRefs.current[messageId]
    if (!element) {
      toast.info('Сообщение пока не загружено в текущую историю')
      return
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    highlightMessage(messageId)
  }

  async function handleUpdateThreadSettings(threadId: string, data: { is_archived?: boolean; is_muted?: boolean; is_pinned?: boolean }) {
    if (!orgId) return
    setOpenThreadMenuId(null)
    try {
      const { data: response } = await updateMessengerThreadSettings(orgId, threadId, data)
      setThreads((current) => upsertThread(current, { ...response.thread, messages: [] }))
      setSelectedThread((current) => current?.id === threadId ? {
        ...response.thread,
        messages: mergeMessagePages(current.messages || [], response.thread.messages || []),
      } : current)
      setOpenThreadMenuId(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить настройки чата'))
    }
  }

  async function handleTogglePinnedMessage(message: SupportMessage) {
    if (!orgId || !selectedThreadId) return
    try {
      const isPinned = Boolean(selectedThread?.pinned_message_ids?.includes(message.id))
      const response = isPinned
        ? await unpinMessengerMessage(orgId, selectedThreadId, message.id)
        : await pinMessengerMessage(orgId, selectedThreadId, message.id)
      setThreads((current) => upsertThread(current, { ...response.data.thread, messages: [] }))
      setSelectedThread((current) => current?.id === selectedThreadId ? {
        ...response.data.thread,
        messages: current.messages || [],
      } : current)
      setOpenMessageMenuId(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить закреп'))
    }
  }

  async function handleForwardMessageToThread(threadId: string) {
    if (!orgId || !forwardingMessage) return
    try {
      await forwardMessengerMessage(orgId, threadId, {
        source_thread_id: forwardingMessage.thread_id,
        source_message_id: forwardingMessage.id,
      })
      setForwardingMessage(null)
      setForwardQuery('')
      setSelectedThreadId(threadId)
      await loadSelectedThread(threadId)
      toast.success('Сообщение переслано')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось переслать сообщение'))
    }
  }

  async function handleTranslateMessage(message: SupportMessage) {
    if (!orgId || !selectedThreadId) return
    if (message.encryption?.ciphertext_b64) {
      toast.info('Зашифрованные сообщения переводятся только локально, серверный перевод недоступен')
      return
    }
    const text = (message.body || '').trim()
    if (!text) {
      toast.info('В сообщении нет текста для перевода')
      return
    }
    const existing = translatedMessages[message.id]
    if (existing) {
      setTranslatedMessages((current) => {
        const next = { ...current }
        delete next[message.id]
        return next
      })
      setOpenMessageMenuId(null)
      return
    }
    try {
      setTranslatingMessageId(message.id)
      const currentLanguage = (i18n.language || 'ru').split('-')[0].toLowerCase()
      const targetLang = currentLanguage || 'ru'
      const response = await translateMessengerMessage(orgId, selectedThreadId, message.id, { target_lang: targetLang })
      setTranslatedMessages((current) => ({
        ...current,
        [message.id]: {
          text: response.data.translated_text,
          sourceLang: response.data.source_lang || null,
          targetLang: response.data.target_lang,
        },
      }))
      setOpenMessageMenuId(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось перевести сообщение'))
    } finally {
      setTranslatingMessageId(null)
    }
  }

  function handleCopyMessage(message: SupportMessage) {
    const text = (message.body || '').trim()
    if (!text) {
      toast.info('В сообщении нет текста для копирования')
      return
    }
    void navigator.clipboard.writeText(text)
      .then(() => toast.success('Текст скопирован'))
      .catch(() => toast.error('Не удалось скопировать текст'))
    setOpenMessageMenuId(null)
  }

  function navigateSearch(step: number) {
    if (chatSearchMatches.length === 0) return
    const nextIndex = (activeSearchResultIndex + step + chatSearchMatches.length) % chatSearchMatches.length
    setActiveSearchResultIndex(nextIndex)
    scrollToMessage(chatSearchMatches[nextIndex]?.id)
  }

  function toggleGroupMember(userId: string) {
    setGroupMemberIds((current) => current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId])
  }

  function handleStartCall(mediaKind: CallMediaKind) {
    if (!selectedThread) return
    const isGroupThread = selectedThread.thread_kind === 'group'
    if (!isGroupThread && !selectedPartner?.id) return
    if (activeCall || incomingCall) {
      toast.error('Вы уже в звонке')
      return
    }
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      toast.error('Мессенджер ещё подключается. Попробуйте ещё раз через секунду.')
      return
    }
    const threadId = selectedThread.id
    const targetUserId = isGroupThread ? threadId : selectedPartner!.id
    const targetUserName = isGroupThread
      ? (getThreadTitle(selectedThread, currentUserId) || 'Групповой звонок')
      : (selectedPartnerUser?.full_name || selectedPartner?.name || getThreadTitle(selectedThread, currentUserId))
    const targetAvatarUrl = isGroupThread ? null : (selectedPartnerUser?.avatar_url || selectedPartner?.avatar_url || null)
    stopAllSounds()
    dialToneSoundRef.current = createDialTone()
    if (isGroupThread) {
      setGroupCallParticipants(buildGroupParticipantsFromThread(selectedThread, mediaKind))
    }
    setActiveCall({
      threadId,
      targetUserId,
      targetUserName,
      targetAvatarUrl,
      mediaKind,
      phase: 'outgoing',
      threadKind: isGroupThread ? 'group' : 'direct',
      participantIds: isGroupThread ? (selectedThread.participant_ids || []).filter((id) => id !== currentUserId) : undefined,
    })
    sendCallSignal({
      type: 'call_signal',
      thread_id: threadId,
      ...(isGroupThread ? {} : { target_user_id: targetUserId }),
      signal_type: 'invite',
      media_kind: mediaKind,
      payload: {
        thread_kind: isGroupThread ? 'group' : 'direct',
        thread_title: getThreadTitle(selectedThread, currentUserId),
      },
    })
  }

  function handleAcceptIncomingCall() {
    if (!incomingCall) return
    stopAllSounds()
    const { threadId, fromUserId, fromUserName, mediaKind, threadKind, threadTitle } = incomingCall
    const thread = getThreadSnapshotById(threadId)
    const isGroupThread = threadKind === 'group' || thread?.thread_kind === 'group'
    if (isGroupThread) {
      setGroupCallParticipants(buildGroupParticipantsFromThread(thread || selectedThreadRef.current, mediaKind))
    }
    setIncomingCall(null)
    setActiveCall({
      threadId,
      targetUserId: isGroupThread ? threadId : fromUserId,
      targetUserName: isGroupThread ? (threadTitle || getThreadTitle(thread || selectedThreadRef.current || { subject: 'Группа', thread_kind: 'group' } as SupportThread, currentUserId) || 'Групповой звонок') : fromUserName,
      targetAvatarUrl: null,
      mediaKind,
      phase: 'incoming',
      threadKind: isGroupThread ? 'group' : 'direct',
      participantIds: isGroupThread ? (thread?.participant_ids || []).filter((id) => id !== currentUserId) : undefined,
    })
    sendCallSignal({
      type: 'call_signal',
      thread_id: threadId,
      ...(isGroupThread ? {} : { target_user_id: fromUserId }),
      signal_type: 'accept',
      media_kind: mediaKind,
      payload: { call_status: 'accepted', thread_kind: isGroupThread ? 'group' : 'direct', thread_title: threadTitle },
    })
  }

  function handleDeclineIncomingCall() {
    if (!incomingCall) return
    stopAllSounds()
    sendCallSignal({
      type: 'call_signal',
      thread_id: incomingCall.threadId,
      target_user_id: incomingCall.fromUserId,
      signal_type: 'decline',
      media_kind: incomingCall.mediaKind,
      payload: { call_status: 'missed' },
    })
    persistCallEvent(incomingCall.threadId, incomingCall.mediaKind, 'missed', 0)
    setIncomingCall(null)
  }

  function toggleMute() {
    const stream = localStreamRef.current
    if (!stream) return
    const audioTracks = stream.getAudioTracks()
    audioTracks.forEach((track) => { track.enabled = !track.enabled })
    setIsMuted((v) => !v)
  }

  async function switchCallToVideo() {
    if (!activeCall || activeCall.mediaKind === 'video') return
    const peer = peerConnectionRef.current
    if (!peer) return
    try {
      const stream = await ensureLocalStream('video')
      const videoTrack = stream.getVideoTracks()[0]
      if (!videoTrack) {
        toast.error('Не удалось включить камеру')
        return
      }
      const videoSender = peer.getSenders().find((sender) => sender.track?.kind === 'video')
      if (videoSender) {
        await videoSender.replaceTrack(videoTrack)
      } else {
        peer.addTrack(videoTrack, stream)
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        void localVideoRef.current.play().catch(() => null)
      }
      setIsCameraOff(false)
      setActiveCall((current) => current ? { ...current, mediaKind: 'video', phase: current.phase === 'connected' ? 'connected' : 'connecting' } : current)
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      sendCallSignal({
        type: 'call_signal',
        thread_id: activeCall.threadId,
        target_user_id: activeCall.targetUserId,
        signal_type: 'offer',
        media_kind: 'video',
        payload: { type: offer.type, sdp: offer.sdp },
      })
    } catch (error) {
      console.error('[Call] switchCallToVideo failed:', error)
      toast.error('Не удалось переключиться на видеозвонок')
    }
  }

  function toggleCamera() {
    const stream = localStreamRef.current
    if (!stream) return
    const videoTracks = stream.getVideoTracks()
    if (videoTracks.length === 0) {
      void switchCallToVideo()
      return
    }
    videoTracks.forEach((track) => { track.enabled = !track.enabled })
    setIsCameraOff((v) => !v)
  }

  function toggleCallFullscreen() {
    setIsCallFullscreen((value) => !value)
  }

  function handleCallHeaderPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (isCallFullscreen) return
    const rect = callWindowRef.current?.getBoundingClientRect()
    if (!rect) return
    callDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
  }

  const groupCallParticipantList = Object.values(groupCallParticipants)
  const isGroupCallActive = activeCall?.threadKind === 'group'

  const incomingCallOverlay = incomingCall && !activeCall ? (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[min(380px,calc(100%-32px))] rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute -inset-3 animate-ping rounded-full bg-primary/20" />
            <div className="absolute -inset-1.5 animate-pulse rounded-full bg-primary/30" />
            <AvatarImage src={null} name={incomingCall.threadKind === 'group' ? (incomingCall.threadTitle || incomingCall.fromUserName) : incomingCall.fromUserName} className="relative h-20 w-20 rounded-full ring-4 ring-primary/20" />
          </div>
          <p className="mt-6 text-lg font-semibold text-foreground">{incomingCall.threadKind === 'group' ? (incomingCall.threadTitle || 'Групповой чат') : incomingCall.fromUserName}</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <PhoneIncoming className="h-4 w-4 animate-pulse text-primary" />
            <span>Входящий {incomingCall.mediaKind === 'video' ? 'видеозвонок' : 'аудиозвонок'}{incomingCall.threadKind === 'group' ? ' в группе' : ''}</span>
          </div>
          {incomingCall.threadKind === 'group' ? <p className="mt-1 text-xs text-muted-foreground">Инициатор: {incomingCall.fromUserName}</p> : null}
          <div className="mt-8 flex items-center gap-6">
            <button
              type="button"
              onClick={handleDeclineIncomingCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition-transform hover:scale-110 hover:bg-rose-600 active:scale-95"
              title="Отклонить"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={handleAcceptIncomingCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-transform hover:scale-110 hover:bg-emerald-600 active:scale-95"
              title="Ответить"
            >
              <Phone className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null

  const activeCallOverlay = activeCall ? (
    <div
      ref={callWindowRef}
      className={`fixed z-20 overflow-hidden border border-border bg-card shadow-2xl transition-[width,height,inset] ${isCallFullscreen ? 'inset-4 rounded-2xl' : 'bottom-4 right-4 w-[420px] max-w-[calc(100vw-32px)] rounded-2xl'}`}
      style={!isCallFullscreen && callWindowPosition ? { left: callWindowPosition.x, top: callWindowPosition.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      {isGroupCallActive ? groupCallParticipantList.map((participant) => (
        <audio
          key={`group-audio-${participant.userId}`}
          ref={(node) => { groupRemoteAudioRefs.current[participant.userId] = node }}
          autoPlay
          playsInline
          className="hidden"
        />
      )) : null}
      <div onPointerDown={handleCallHeaderPointerDown} className={`flex items-center justify-between border-b border-border px-4 py-3 ${isCallFullscreen ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isGroupCallActive
              ? (activeCall.mediaKind === 'video' ? 'Групповой видеозвонок' : 'Групповой аудиозвонок')
              : (activeCall.mediaKind === 'video' ? 'Видеозвонок' : 'Аудиозвонок')}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeCall.phase === 'outgoing' ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                {isGroupCallActive ? 'Оповещаем участников...' : 'Вызов...'}
              </span>
            ) : activeCall.phase === 'connected' ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                {isGroupCallActive ? `${groupCallParticipantList.filter((participant) => participant.phase === 'connected').length + 1} в звонке` : formatCallDuration(callDuration)}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                {isGroupCallActive ? 'Участники подключаются...' : 'Подключение...'}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleCallFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent"
            title={isCallFullscreen ? 'Свернуть окно' : 'Развернуть'}
          >
            {isCallFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {activeCall.mediaKind === 'video' ? (
        isGroupCallActive ? (
          <div className={`grid gap-3 bg-black p-3 ${isCallFullscreen ? 'grid-cols-3 auto-rows-[minmax(180px,1fr)] h-[calc(100vh-12rem)]' : 'grid-cols-2 auto-rows-[180px]'}`}>
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-1 text-xs text-white">Вы</div>
            </div>
            {groupCallParticipantList.map((participant) => (
              <div key={participant.userId} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {participant.stream ? (
                  <video
                    ref={(node) => { groupRemoteVideoRefs.current[participant.userId] = node }}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_42%),linear-gradient(180deg,#060b16_0%,#0b1220_100%)] text-white">
                    <AvatarImage src={participant.avatarUrl || null} name={participant.name} className="h-16 w-16 rounded-full ring-4 ring-white/10" />
                    <p className="text-sm font-semibold">{participant.name}</p>
                    <p className="text-xs text-white/70">{participant.phase === 'connected' ? 'В звонке' : participant.phase === 'connecting' ? 'Подключается...' : 'Ожидаем ответ'}</p>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-1 text-xs text-white">{participant.name}</div>
              </div>
            ))}
          </div>
        ) : activeCall.phase === 'connected' ? (
          <div className="relative bg-black">
            <video ref={remoteVideoRef} autoPlay playsInline className={isCallFullscreen ? 'h-[calc(100vh-12rem)] w-full object-cover' : 'h-64 w-full object-cover'} />
            <video ref={localVideoRef} autoPlay playsInline muted className={`absolute bottom-3 right-3 rounded-lg border-2 border-white/30 object-cover shadow-lg ${isCallFullscreen ? 'h-36 w-28' : 'h-24 w-20'}`} />
          </div>
        ) : (
          <div className={`relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_42%),linear-gradient(180deg,#060b16_0%,#0b1220_100%)] ${isCallFullscreen ? 'h-[calc(100vh-12rem)]' : 'h-64'}`}>
            <div className="absolute inset-0 bg-black/15" />
            <div className="relative flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="relative">
                <div className="absolute -inset-3 animate-ping rounded-full bg-primary/20" />
                <div className="absolute -inset-1 animate-pulse rounded-full bg-primary/25" />
                <AvatarImage src={activeCall.targetAvatarUrl || null} name={activeCall.targetUserName} className="relative h-20 w-20 rounded-full ring-4 ring-white/10" />
              </div>
              <p className="text-lg font-semibold text-white">{activeCall.targetUserName}</p>
              <p className="text-sm text-white/70">
                {activeCall.phase === 'outgoing' ? 'Идёт вызов...' : activeCall.phase === 'incoming' ? 'Подтверждаем подключение...' : 'Соединяем видеозвонок...'}
              </p>
            </div>
            <video ref={localVideoRef} autoPlay playsInline muted className={`absolute bottom-3 right-3 rounded-lg border-2 border-white/20 object-cover shadow-lg ${isCallFullscreen ? 'h-36 w-28' : 'h-24 w-20'}`} />
          </div>
        )
      ) : (
        isGroupCallActive ? (
          <div className={`${isCallFullscreen ? 'min-h-[calc(100vh-14rem)]' : ''} grid grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-3`}>
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-background/50 px-4 py-6 text-center">
              <AvatarImage src={null} name="Вы" className="h-14 w-14 rounded-full" />
              <div>
                <p className="text-sm font-semibold text-foreground">Вы</p>
                <p className="text-xs text-muted-foreground">В звонке</p>
              </div>
            </div>
            {groupCallParticipantList.map((participant) => (
              <div key={participant.userId} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-background/50 px-4 py-6 text-center">
                <AvatarImage src={participant.avatarUrl || null} name={participant.name} className="h-14 w-14 rounded-full" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{participant.name}</p>
                  <p className="text-xs text-muted-foreground">{participant.phase === 'connected' ? 'В звонке' : participant.phase === 'connecting' ? 'Подключается...' : 'Ожидаем ответ'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${isCallFullscreen ? 'min-h-[calc(100vh-14rem)]' : ''} flex flex-col items-center justify-center gap-3 px-4 py-8`}>
            <div className="relative">
              <div className="absolute -inset-3 animate-ping rounded-full bg-primary/15" />
              <AvatarImage src={activeCall.targetAvatarUrl || null} name={activeCall.targetUserName} className="relative h-16 w-16 rounded-full ring-4 ring-primary/10" />
            </div>
            <p className="text-base font-semibold text-foreground">{activeCall.targetUserName}</p>
            <p className="text-sm text-muted-foreground">
              {activeCall.phase === 'connected' ? formatCallDuration(callDuration) : activeCall.phase === 'outgoing' ? 'Идёт вызов...' : activeCall.phase === 'incoming' ? 'Подтверждаем подключение...' : 'Соединяем аудиозвонок...'}
            </p>
          </div>
        )
      )}

      <div className="flex items-center justify-center gap-3 border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={toggleMute}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isMuted ? 'bg-rose-500/20 text-rose-500' : 'bg-muted text-foreground hover:bg-accent'}`}
          title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={activeCall.mediaKind === 'video' ? toggleCamera : (isGroupCallActive ? () => toast.info('Для группы запускайте видеозвонок сразу кнопкой камеры') : () => void switchCallToVideo())}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${(activeCall.mediaKind === 'video' && isCameraOff) ? 'bg-rose-500/20 text-rose-500' : 'bg-muted text-foreground hover:bg-accent'}`}
          title={activeCall.mediaKind === 'video' ? (isCameraOff ? 'Включить камеру' : 'Выключить камеру') : (isGroupCallActive ? 'Запустите групповой видеозвонок сразу кнопкой камеры' : 'Переключиться на видеозвонок')}
        >
          {activeCall.mediaKind === 'video' ? (isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />) : <Video className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => cleanupCall(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white transition-transform hover:scale-110 hover:bg-rose-600 active:scale-95"
          title="Завершить звонок"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  ) : null

  if (!isMessengerRoute) {
    if (!activeCall && !incomingCall) return null
    return (
      <>
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        {incomingCallOverlay}
        {activeCallOverlay}
      </>
    )
  }

  if (!orgId) {
    return <EmptyState icon={MessageCircle} title="Мессенджер" description="Выберите компанию, чтобы открыть внутреннюю переписку сотрудников." />
  }

  if (blockedReason) {
    return (
      <div className="flex h-[calc(100dvh-var(--header-height)-2.5rem)] items-center justify-center overflow-hidden md:h-[calc(100dvh-var(--header-height)-3rem)]">
        <EmptyState icon={MessageCircle} title="Мессенджер временно недоступен" description={blockedReason} />
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className={`grid h-full overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)] ${messengerChrome.shell}`}>
        <aside className={`relative h-full flex-col overflow-hidden ${messengerChrome.sidebar} ${selectedThread ? 'hidden lg:flex' : 'flex'}`}>
          <div className={`border-b p-3 ${messengerChrome.surface}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Чаты</div>
              <Button
                size="sm"
                variant={showPeoplePanel ? 'secondary' : 'outline'}
                onClick={() => {
                  setShowPeoplePanel((value) => !value)
                  if (showPeoplePanel) setShowGroupCreator(false)
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Новый</span>
              </Button>
            </div>
            <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm text-muted-foreground ${messengerChrome.inputSurface}`}>
              <Search className="h-4 w-4" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск..."
                className="h-5 sm:h-6 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {THREAD_FILTER_LABELS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeFilter === filter.id ? 'bg-primary text-white shadow-sm' : messengerChrome.pillInactive}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-0.5 overflow-y-auto py-2">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка диалогов...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="px-3 py-6 text-sm text-muted-foreground">Диалогов пока нет</div>
            ) : filteredThreads.map((thread) => {
              const isActive = thread.id === selectedThreadId
              const title = getThreadTitle(thread, currentUserId)
              const subtitle = getThreadSubtitle(thread, currentUserId)
              const partner = thread.thread_kind !== 'group' ? getThreadPartner(thread, currentUserId) : null
              const partnerUser = partner ? users.find((u) => u.id === partner.id) : null
              const avatarSrc = thread.thread_kind === 'group'
                ? resolveAttachmentUrl(thread.avatar_url || thread.group_avatar?.url || null, token)
                : (partnerUser?.avatar_url || partner?.avatar_url || null)
              const isOnline = partnerUser ? getUserOnlineStatus(partnerUser) === 'online' : (partner?.last_seen_at ? getUserOnlineStatus({ last_seen_at: partner.last_seen_at }) === 'online' : false)
              const threadTypingNames = Object.values(typingUsersByThread[thread.id] || {})
              const threadTypingLabel = getTypingLabel(threadTypingNames, thread.thread_kind !== 'group')
              return (
                <div key={thread.id} className={`group relative mx-2 flex items-start gap-2 rounded-2xl transition-colors ${isActive ? messengerChrome.listItem : messengerChrome.listItemHover}`}>
                  <button
                    type="button"
                    onClick={() => void handleOpenThread(thread.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left"
                  >
                    <div className="relative shrink-0">
                      <AvatarImage src={avatarSrc} name={title} className="h-10 w-10 rounded-full" />
                      {thread.thread_kind !== 'group' ? (
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {thread.is_pinned ? <Pin className="mr-1 inline h-3.5 w-3.5" /> : null}
                            {title}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(thread.updated_at)}</span>
                          {thread.unread_count > 0 ? <span className="inline-flex min-w-5 justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-white">{thread.unread_count}</span> : null}
                        </div>
                      </div>
                      <p className={`mt-1 truncate text-xs ${threadTypingLabel ? 'text-primary' : 'text-muted-foreground'}`}>{threadTypingLabel || thread.last_message_preview || 'Диалог без сообщений'}</p>
                    </div>
                  </button>
                  <div className="relative shrink-0" data-thread-menu>
                    <button
                      data-thread-menu-button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setOpenThreadMenuId((current) => current === thread.id ? null : thread.id)
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition ${messengerChrome.ghostButton} ${openThreadMenuId === thread.id ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openThreadMenuId === thread.id ? (
                      <div className={`absolute right-0 top-10 z-20 w-44 rounded-2xl border p-1 shadow-2xl backdrop-blur ${messengerChrome.floatingMenu}`} data-thread-menu>
                        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleUpdateThreadSettings(thread.id, { is_pinned: !thread.is_pinned }) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                          {thread.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          {thread.is_pinned ? 'Убрать из закрепа' : 'Закрепить чат'}
                        </button>
                        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleUpdateThreadSettings(thread.id, { is_muted: !thread.is_muted }) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                          {thread.is_muted ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                          {thread.is_muted ? 'Включить уведомления' : 'Выключить уведомления'}
                        </button>
                        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleUpdateThreadSettings(thread.id, { is_archived: !thread.is_archived }) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                          {thread.is_archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                          {thread.is_archived ? 'Вернуть из архива' : 'В архив'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          {showPeoplePanel ? (
            <div className="absolute inset-0 z-10 flex flex-col border-l border-border bg-card">
              <div className={`border-b p-3 ${messengerChrome.surface}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-foreground">{showGroupCreator ? 'Новая группа' : 'Новый чат'}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPeoplePanel(false)
                      setShowGroupCreator(false)
                    }}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mb-3 flex gap-2">
                  <Button size="sm" variant={!showGroupCreator ? 'default' : 'outline'} className="flex-1" onClick={() => setShowGroupCreator(false)}>
                    Личный
                  </Button>
                  <Button size="sm" variant={showGroupCreator ? 'default' : 'outline'} className="flex-1" onClick={() => setShowGroupCreator(true)}>
                    Группа
                  </Button>
                </div>
                {showGroupCreator ? (
                  <div className="mb-3 space-y-2">
                    <input
                      value={groupTitle}
                      onChange={(event) => setGroupTitle(event.target.value)}
                      placeholder="Название группы"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
                    />
                    <p className="text-xs text-muted-foreground">Выбрано: {groupMemberIds.length}</p>
                    <Button className="w-full" onClick={() => void handleCreateGroup()} disabled={creatingGroup}>
                      {creatingGroup ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Users className="mr-1.5 h-4 w-4" />}
                      Создать группу
                    </Button>
                  </div>
                ) : null}
                <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground ${messengerChrome.peopleSearch}`}>
                  <Search className="h-4 w-4" />
                  <input
                    value={employeeQuery}
                    onChange={(event) => setEmployeeQuery(event.target.value)}
                    placeholder="Поиск сотрудника"
                    className="h-6 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {contacts.map((user) => {
                  const presence = getUserOnlineStatus(user)
                  const existingThread = threads.find((thread) => (thread.thread_kind !== 'group') && (thread.participant_ids || []).includes(user.id))
                  const checked = groupMemberIds.includes(user.id)
                  return (
                    <div key={user.id} className={`rounded-2xl px-3 py-3 transition-colors ${messengerChrome.peopleCardHover}`}>
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <AvatarImage src={user.avatar_url} name={user.full_name || user.email} className="h-10 w-10 rounded-full" />
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${presence === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{user.full_name || user.email}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="truncate">{user.position || user.org_role || 'Сотрудник'}</span>
                            <span className={`inline-flex items-center gap-1 ${presence === 'online' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${presence === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              {getPresenceLabel(user)}
                            </span>
                          </div>
                        </div>
                        {showGroupCreator ? (
                          <button type="button" onClick={() => toggleGroupMember(user.id)} className={`flex h-6 w-6 items-center justify-center rounded-md border ${checked ? 'border-primary bg-primary text-white' : 'border-border bg-card text-muted-foreground'}`}>
                            {checked ? <Check className="h-3.5 w-3.5" /> : null}
                          </button>
                        ) : null}
                      </div>
                      {!showGroupCreator ? (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            className="w-full"
                            variant={existingThread ? 'outline' : 'default'}
                            onClick={() => {
                              if (existingThread) {
                                void handleOpenThread(existingThread.id)
                                setShowPeoplePanel(false)
                                return
                              }
                              handleStartChat(user)
                                .then(() => setShowPeoplePanel(false))
                                .catch(() => null)
                            }}
                            disabled={creatingThreadId === user.id}
                          >
                            {creatingThreadId === user.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-1.5 h-4 w-4" />}
                            {existingThread ? 'Открыть диалог' : 'Начать чат'}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
                {contacts.length === 0 ? <p className="text-sm text-muted-foreground">Сотрудники не найдены</p> : null}
              </div>
            </div>
          ) : null}
        </aside>

        <section className={`relative h-full min-h-0 flex-col overflow-hidden ${isDarkTheme ? 'bg-transparent' : 'bg-[#e5eaef]'} ${selectedThread ? 'flex' : 'hidden lg:flex'}`}>
          {selectedThread ? (
            <>
              <div className={`px-5 py-3.5 ${messengerChrome.header}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedThreadId(null)
                        setSelectedThread(null)
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full lg:hidden ${messengerChrome.ghostButton}`}
                      title="Назад к чатам"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <AvatarImage src={selectedAvatarSrc} name={getThreadTitle(selectedThread, currentUserId)} className="h-10 w-10 rounded-full" />
                      {isDirectThread ? <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${selectedPartnerUser && getUserOnlineStatus(selectedPartnerUser) === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} /> : null}
                    </div>
                    <button type="button" onClick={() => setShowThreadInfo((current) => !current)} className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold text-foreground">{getThreadTitle(selectedThread, currentUserId)}</p>
                      <p className={`truncate text-xs ${activeThreadTypingLabel ? 'text-primary' : 'text-muted-foreground'}`}>
                        {activeThreadTypingLabel || (isDirectThread ? selectedLastSeenLabel : getThreadSubtitle(selectedThread, currentUserId))}
                      </p>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowChatSearch((current) => !current)}
                      className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-colors ${showChatSearch ? 'bg-primary/15 text-primary' : messengerChrome.ghostButton}`}
                      title="Поиск"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                    {((isDirectThread && selectedPartner?.id) || selectedThread?.thread_kind === 'group') ? (
                      <button
                        type="button"
                        onClick={() => mediaFeaturesAvailable ? handleStartCall('audio') : toast.error(getMediaFeatureErrorMessage('audio'))}
                        className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-colors ${mediaFeaturesAvailable ? messengerChrome.ghostButton : `cursor-not-allowed ${messengerChrome.ghostButtonDisabled}`}`}
                        title={selectedThread?.thread_kind === 'group' ? 'Групповой аудиозвонок' : 'Позвонить'}
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                    ) : null}
                    {((isDirectThread && selectedPartner?.id) || selectedThread?.thread_kind === 'group') ? (
                      <button
                        type="button"
                        onClick={() => mediaFeaturesAvailable ? handleStartCall('video') : toast.error(getMediaFeatureErrorMessage('video'))}
                        className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-colors ${mediaFeaturesAvailable ? messengerChrome.ghostButton : `cursor-not-allowed ${messengerChrome.ghostButtonDisabled}`}`}
                        title={selectedThread?.thread_kind === 'group' ? 'Групповой видеозвонок' : 'Видео'}
                      >
                        <Video className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setShowThreadInfo((current) => !current)}
                      className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-colors ${showThreadInfo ? 'bg-primary/15 text-primary' : messengerChrome.ghostButton}`}
                      title="Ещё"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {showChatSearch ? (
                  <div className={`mt-2 sm:mt-3 flex items-center gap-1 sm:gap-2 rounded-2xl border px-2 py-2 sm:px-3 ${messengerChrome.inputSurface}`}>
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      value={chatSearchQuery}
                      onChange={(event) => setChatSearchQuery(event.target.value)}
                      placeholder="Поиск..."
                      className="h-5 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <button type="button" onClick={() => navigateSearch(-1)} className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => navigateSearch(1)} className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                {pinnedMessages.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => scrollToMessage(pinnedMessages[0]?.id)}
                    className={`mt-3 flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-2 text-left ${messengerChrome.inputSurface} hover:bg-accent`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary">
                        <Pin className="h-3.5 w-3.5" />
                        Закреплено{pinnedMessages.length > 1 ? `: ${pinnedMessages.length}` : ''}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {pinnedMessages[0]?.body || pinnedMessages[0]?.forwarded_from?.body || 'Сообщение без текста'}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">Перейти</span>
                  </button>
                ) : null}
              </div>

              <div
                ref={messageViewportRef}
                onDragOver={(event) => {
                  event.preventDefault()
                  if (event.dataTransfer.types.includes('Files')) setIsDraggingFiles(true)
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                  setIsDraggingFiles(false)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDraggingFiles(false)
                  handleSelectFiles(Array.from(event.dataTransfer.files || []))
                }}
                className="relative flex-1 space-y-4 overflow-y-auto bg-transparent px-5 py-4"
                style={chatWallpaperStyle}
              >
                {isDraggingFiles ? (
                  <div className="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10 text-sm font-medium text-primary">
                    Отпустите файлы, чтобы прикрепить к сообщению
                  </div>
                ) : null}
                {hasMoreMessages ? (
                  <div className="flex justify-center pb-1">
                    <button
                      type="button"
                      onClick={() => void handleLoadMoreMessages()}
                      disabled={loadingMoreMessages}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${messengerChrome.surface} hover:bg-accent`}
                    >
                      {loadingMoreMessages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {loadingMoreMessages ? 'Загружаем...' : 'Загрузить еще'}
                    </button>
                  </div>
                ) : null}
                {displayedMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
                      <h2 className="mt-4 text-lg font-semibold text-foreground">Чат готов</h2>
                      <p className="mt-2 text-sm text-muted-foreground">Напиши первое сообщение, чтобы начать переписку.</p>
                    </div>
                  </div>
                ) : displayedMessages.map((message, index) => {
                  const mine = message.author_id === currentUserId
                  const readState = getMessageReadState(message, selectedThread, currentUserId)
                  const audioOnlyMessage = !message.body && (message.attachments?.length || 0) === 1 && isAudioAttachment(message.attachments?.[0]?.content_type)
                  const isCallEvent = message.event_type === 'call_event'
                  const previous = displayedMessages[index - 1]
                  const dayChanged = !previous || formatDayLabel(previous.created_at) !== formatDayLabel(message.created_at)
                  const showUnreadMarker = firstUnreadMessageId === message.id
                  const showGroupAuthorAvatar = Boolean(selectedThread?.thread_kind === 'group' && !mine && !isCallEvent)
                  const messageAuthorProfile = showGroupAuthorAvatar ? getMessageAuthorProfile(message, selectedThread, users) : null
                  return (
                    <div key={message.id}>
                      {dayChanged ? (
                        <div className="mb-3 flex justify-center">
                          <span className={`rounded-full px-3 py-1 text-[11px] ${messengerChrome.datePill}`}>{formatDayLabel(message.created_at)}</span>
                        </div>
                      ) : null}
                      {showUnreadMarker ? (
                        <div className="mb-3 flex justify-center">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">Непрочитанные сообщения</span>
                        </div>
                      ) : null}
                      {isCallEvent ? (
                        <div ref={(node) => { messageRefs.current[message.id] = node }} className="flex justify-center">
                          <div className={`inline-flex items-center gap-3 rounded-full px-3.5 py-2 ${messengerChrome.servicePill}`}>
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${message.call_status === 'missed' ? 'bg-rose-500/12 text-rose-400' : 'bg-primary/12 text-primary'}`}>
                              {message.media_kind === 'video' ? (
                                message.call_status === 'missed' ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />
                              ) : (
                                message.call_status === 'missed' ? <PhoneOff className="h-4 w-4" /> : <PhoneIncoming className="h-4 w-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className={`font-medium ${message.call_status === 'missed' ? 'text-rose-300' : 'text-foreground'}`}>{getCallEventLabel(message)}</div>
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                {message.call_status === 'missed' ? 'Не удалось соединиться' : (typeof message.duration_seconds === 'number' && message.duration_seconds > 0 ? `Длительность ${formatCallDuration(message.duration_seconds)}` : 'Событие звонка')}
                              </div>
                            </div>
                            <span className="tabular-nums text-[11px] text-muted-foreground">{formatMessageClock(message.created_at)}</span>
                          </div>
                        </div>
                      ) : (
                      <div ref={(node) => { messageRefs.current[message.id] = node }} className={`group/message flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                        {!mine ? (
                          <button
                            type="button"
                            onClick={() => handleReplyToMessage(message)}
                            className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover/message:opacity-100"
                            title="Ответить"
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        {showGroupAuthorAvatar ? (
                          <div className="mb-1 shrink-0 self-end">
                            <AvatarImage src={messageAuthorProfile?.avatarUrl || null} name={messageAuthorProfile?.name || message.author_name || 'Сотрудник'} className="h-9 w-9 rounded-full ring-2 ring-background" />
                          </div>
                        ) : null}
                        <div className={`max-w-[76%] rounded-[1.125rem] px-4 py-3 transition-shadow ${highlightedMessageId === message.id ? 'ring-2 ring-primary/40 shadow-lg' : ''} ${mine ? 'bg-primary text-white' : messengerChrome.incomingBubble}`}>
                        {!mine && <p className="mb-1 text-[11px] font-semibold text-primary">{selectedThread?.thread_kind === 'group' ? (messageAuthorProfile?.name || message.author_name) : message.author_name}</p>}
                        {message.forwarded_from ? (
                          <div className={`mb-2 rounded-xl border-l-2 px-3 py-2 text-xs ${mine ? 'border-white/50 bg-white/10 text-white/80' : isDarkTheme ? 'border-primary/40 bg-accent text-muted-foreground' : 'border-sky-200 bg-sky-50/90 text-slate-600'}`}>
                            <div className="font-medium">Переслано от {message.forwarded_from.author_name || 'сотрудника'}</div>
                            {message.forwarded_from.body ? <div className="mt-1 line-clamp-2">{message.forwarded_from.body}</div> : null}
                          </div>
                        ) : null}
                        {message.reply_preview ? (
                          <div className={`mb-2 rounded-xl border-l-2 px-3 py-2 text-xs ${mine ? 'border-white/50 bg-white/10 text-white/80' : isDarkTheme ? 'border-primary/40 bg-accent text-muted-foreground' : 'border-sky-200 bg-sky-50/90 text-slate-600'}`}>
                            <div className="font-medium">{message.reply_preview.author_name || 'Сообщение'}</div>
                            <div className="mt-1 line-clamp-2">{message.reply_preview.body || 'Без текста'}</div>
                          </div>
                        ) : null}
                        {message.body ? <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p> : null}
                        {translatedMessages[message.id]?.text ? (
                          <div className={`mt-3 rounded-2xl border px-3 py-2 text-sm ${mine ? 'border-white/15 bg-white/10 text-white/90' : 'border-border/80 bg-accent/60 text-foreground'}`}>
                            <div className={`mb-1 text-[11px] font-medium ${mine ? 'text-white/70' : 'text-muted-foreground'}`}>Перевод{translatedMessages[message.id]?.sourceLang ? ` · ${translatedMessages[message.id]?.sourceLang} → ${translatedMessages[message.id]?.targetLang}` : ''}</div>
                            <p className="whitespace-pre-wrap leading-6">{translatedMessages[message.id]?.text}</p>
                          </div>
                        ) : null}
                        {message.attachments?.length ? (
                          <div className="mt-3 space-y-2">
                            {message.attachments.map((attachment) => {
                              const wrapperClass = `overflow-hidden rounded-xl ${mine ? 'bg-white/10' : 'bg-accent'}`
                              const attachmentUrl = resolveMessageAttachmentUrl(message.id, attachment)
                              if (isImageAttachment(attachment.content_type) && attachmentUrl) {
                                return (
                                  <a key={attachment.id} href={attachmentUrl} target="_blank" rel="noreferrer" className={`block ${wrapperClass}`}>
                                    <img src={attachmentUrl} alt={attachment.file_name} className="max-h-80 w-full rounded-xl object-cover" />
                                    <div className="px-3 py-2 text-[11px] opacity-80">{attachment.file_name}</div>
                                  </a>
                                )
                              }
                              if (isAudioAttachment(attachment.content_type) && attachmentUrl) {
                                const transcript = getAttachmentTranscript(message, attachment.id)
                                return (
                                  <TelegramVoiceMessage
                                    key={attachment.id}
                                    attachment={attachment}
                                    src={attachmentUrl}
                                    mine={mine}
                                    transcript={transcript}
                                    isTranscribing={transcribingAttachmentKey === `${message.id}:${attachment.id}`}
                                    onTranscribe={() => void handleTranscribeAttachment(message, attachment)}
                                    sentAt={message.created_at}
                                    readState={mine ? readState : null}
                                  />
                                )
                              }
                              return (
                                <a
                                  key={attachment.id}
                                  href={attachmentUrl || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`block rounded-xl px-3 py-2 text-xs hover:opacity-90 ${mine ? 'bg-white/10' : 'bg-accent'}`}
                                >
                                  <div className="font-medium">{attachment.file_name}</div>
                                  <div className="mt-1 opacity-70">{formatFileSize(attachment.size_bytes) || 'Вложение'}</div>
                                </a>
                              )
                            })}
                          </div>
                        ) : null}
                        <div className={`mt-2 flex items-center justify-between gap-3 text-[11px] ${mine ? 'text-white/70' : 'text-muted-foreground'}`}>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleReplyToMessage(message)}
                              className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 hover:bg-black/10"
                              title="Ответить"
                            >
                              <Reply className="h-3.5 w-3.5" />
                              <span className="text-[11px]">Ответить</span>
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                data-message-menu-button
                                onClick={() => setOpenMessageMenuId((current) => current === message.id ? null : message.id)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-black/10"
                                title="Действия"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            {openMessageMenuId === message.id ? (
                              <div data-message-menu className={`absolute z-20 mt-1 w-44 rounded-2xl border border-border/80 p-1 shadow-2xl ${mine ? 'right-0 bg-card text-foreground' : 'left-0 bg-card text-foreground'}`}>
                                <button type="button" onClick={() => handleReplyToMessage(message)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                                  <Reply className="h-3.5 w-3.5" />
                                  Ответить
                                </button>
                                {mine && !message.deleted_for_all ? (
                                  <button type="button" onClick={() => handleStartEditMessage(message)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                                    <Pencil className="h-3.5 w-3.5" />
                                    Изменить
                                  </button>
                                ) : null}
                                <button type="button" onClick={() => { setForwardingMessage(message); setOpenMessageMenuId(null) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                                  <Forward className="h-3.5 w-3.5" />
                                  Переслать
                                </button>
                                <button type="button" onClick={() => handleTogglePinnedMessage(message)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                                  {selectedThread?.pinned_message_ids?.includes(message.id) ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                                  {selectedThread?.pinned_message_ids?.includes(message.id) ? 'Убрать из закрепа' : 'Закрепить'}
                                </button>
                                {message.reply_to_message_id ? (
                                  <button type="button" onClick={() => scrollToMessage(message.reply_to_message_id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                                    <Reply className="h-3.5 w-3.5" />
                                    К сообщению
                                  </button>
                                ) : null}
                                <button type="button" onClick={() => void handleTranslateMessage(message)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                                  <Languages className="h-3.5 w-3.5" />
                                  {translatedMessages[message.id] ? 'Скрыть перевод' : (translatingMessageId === message.id ? 'Переводим...' : 'Перевести сообщение')}
                                </button>
                                <button type="button" onClick={() => handleCopyMessage(message)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                                  <Copy className="h-3.5 w-3.5" />
                                  Копировать текст
                                </button>
                                <button type="button" onClick={() => void handleDeleteMessage(message, 'me')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Удалить у себя
                                </button>
                                {mine && !message.deleted_for_all ? (
                                  <button type="button" onClick={() => void handleDeleteMessage(message, 'all')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose-500 hover:bg-rose-50/60">
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Удалить у всех
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {message.edited_at ? <span>изменено</span> : null}
                            {!audioOnlyMessage ? <span>{formatMessageClock(message.created_at)}</span> : null}
                            {!audioOnlyMessage && mine && readState ? (
                              <span className="inline-flex items-center" title={readState === 'read' ? 'Прочитано' : 'Отправлено'}>
                                {readState === 'read' ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        </div>
                      </div>
                      )}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
                {showJumpToBottom ? (
                  <button
                    type="button"
                    onClick={handleScrollToBottom}
                    className={`sticky bottom-0 ml-auto flex h-10 items-center gap-2 rounded-full px-3 text-xs font-medium text-foreground shadow-lg ${messengerChrome.jumpButton}`}
                  >
                    <ChevronDown className="h-4 w-4" />
                    К новым
                  </button>
                ) : null}
              </div>

              <div className={`border-t p-3 ${messengerChrome.header}`}>
                {replyingTo || editingMessageId ? (
                  <div className={`mb-3 flex items-start justify-between gap-3 rounded-2xl border px-3 py-2 text-xs text-foreground ${messengerChrome.inputSurface}`}>
                    <div>
                      <div className="font-medium">{editingMessageId ? 'Редактирование сообщения' : `Ответ: ${replyingTo?.author_name || ''}`}</div>
                      <div className="mt-1 text-muted-foreground">{editingMessageId ? 'Измени текст и отправь заново.' : (replyingTo?.body || replyingTo?.reply_preview?.body || 'Без текста')}</div>
                    </div>
                    <button type="button" onClick={() => { setReplyingTo(null); setEditingMessageId(null); setMessageText('') }} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                {pendingFiles.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {pendingFiles.map((file) => (
                      <div key={`${file.name}-${file.size}`} className={`rounded-2xl border px-3 py-2 text-xs text-foreground ${messengerChrome.inputSurface}`}>
                        <div className="font-medium">{file.type.startsWith('audio/') ? 'Голосовое сообщение' : file.name}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{formatFileSize(file.size)}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`flex items-end gap-2 rounded-[26px] px-2 py-2 ${messengerChrome.composer}`}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors ${messengerChrome.composerHover}`}
                    title="Прикрепить файл"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => recordingVoice ? handleStopVoiceRecording() : void handleStartVoiceRecording()}
                    className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${recordingVoice ? 'bg-rose-500/15 text-rose-400' : mediaFeaturesAvailable ? `text-muted-foreground ${messengerChrome.composerHover}` : 'cursor-not-allowed text-muted-foreground/60'}`}
                    title={recordingVoice ? 'Остановить запись' : mediaFeaturesAvailable ? 'Записать голосовое сообщение' : 'Для голосовых нужен HTTPS'}
                  >
                    {recordingVoice ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,audio/*"
                    className="hidden"
                    onChange={(event) => handleSelectFiles(Array.from(event.target.files || []))}
                  />
                  <textarea
                    ref={composerTextareaRef}
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void handleSendMessage()
                      }
                    }}
                    placeholder={editingMessageId ? 'Изменить...' : 'Сообщение...'}
                    rows={1}
                    className="min-h-[44px] max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm sm:text-base leading-5 text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={sending || (!messageText.trim() && pendingFiles.length === 0)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-4 sm:p-8 text-center">
              <div>
                <MessageCircle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40" />
                <h2 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-foreground">Выберите диалог</h2>
                <p className="mt-2 max-w-xs sm:max-w-md text-xs sm:text-sm text-muted-foreground">Откройте переписку или нажмите «+» в списке чатов.</p>
              </div>
            </div>
          )}

          {showThreadInfo && selectedThread ? (
            <aside className={`absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l shadow-2xl ${messengerChrome.surface}`}>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{getThreadTitle(selectedThread, currentUserId)}</p>
                  <p className="text-xs text-muted-foreground">{getThreadSubtitle(selectedThread, currentUserId)}</p>
                </div>
                <button type="button" onClick={() => setShowThreadInfo(false)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 space-y-4 sm:space-y-5 overflow-y-auto px-3 py-4 sm:px-4">
                {selectedThread.thread_kind === 'group' ? (
                  <section className="rounded-2xl border border-border bg-background/70 p-3">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <AvatarImage src={selectedAvatarSrc} name={getThreadTitle(selectedThread, currentUserId)} className="h-16 w-16 rounded-full" />
                        {canManageGroupInfo ? (
                          <button
                            type="button"
                            onClick={() => groupAvatarInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] text-foreground hover:bg-accent"
                            disabled={updatingGroupAvatar}
                          >
                            Фото
                          </button>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        {canManageGroupInfo ? (
                          <>
                            <input
                              value={groupSettingsTitle}
                              onChange={(event) => setGroupSettingsTitle(event.target.value)}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                              placeholder="Название группы"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleSaveGroupTitle()}
                                disabled={savingGroupTitle || groupSettingsTitle.trim().length < 2}
                                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingGroupTitle ? 'Сохранение...' : 'Сохранить'}
                              </button>
                              <button
                                type="button"
                                onClick={() => groupAvatarInputRef.current?.click()}
                                disabled={updatingGroupAvatar}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Загрузить фото
                              </button>
                              {selectedThread.avatar_url || selectedThread.group_avatar?.url ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteGroupAvatar()}
                                  disabled={updatingGroupAvatar}
                                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Удалить фото
                                </button>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-foreground">{getThreadTitle(selectedThread, currentUserId)}</p>
                            <p className="text-xs text-muted-foreground">{getThreadSubtitle(selectedThread, currentUserId)}</p>
                          </>
                        )}
                        <p className="text-[11px] text-muted-foreground">Создатель группы по умолчанию админ. Админы могут управлять только теми функциями, на которые им выданы права.</p>
                      </div>
                    </div>
                    <input
                      ref={groupAvatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handleUploadGroupAvatar(event.target.files?.[0] || null)
                        event.currentTarget.value = ''
                      }}
                    />
                  </section>
                ) : null}

                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => void handleUpdateThreadSettings(selectedThread.id, { is_pinned: !selectedThread.is_pinned })} className="rounded-lg border border-border bg-background px-2 py-2 sm:px-3 sm:py-3 text-xs hover:bg-accent">
                    {selectedThread.is_pinned ? 'Открепить' : 'Закрепить'}
                  </button>
                  <button type="button" onClick={() => void handleUpdateThreadSettings(selectedThread.id, { is_muted: !selectedThread.is_muted })} className="rounded-lg border border-border bg-background px-2 py-2 sm:px-3 sm:py-3 text-xs hover:bg-accent">
                    {selectedThread.is_muted ? 'Включить' : 'Выключить'}
                  </button>
                  <button type="button" onClick={() => void handleUpdateThreadSettings(selectedThread.id, { is_archived: !selectedThread.is_archived })} className="rounded-lg border border-border bg-background px-2 py-2 sm:px-3 sm:py-3 text-xs hover:bg-accent">
                    {selectedThread.is_archived ? 'Вернуть' : 'В архив'}
                  </button>
                </div>

                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Обои чата</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => wallpaperInputRef.current?.click()}
                        className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground hover:bg-accent"
                      >
                        Загрузить
                      </button>
                      <button
                        type="button"
                        onClick={handleResetChatWallpaper}
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Сбросить
                      </button>
                    </div>
                  </div>
                  <input
                    ref={wallpaperInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void handleUploadChatWallpaper(event.target.files?.[0] || null)
                      event.currentTarget.value = ''
                    }}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {wallpaperPresets.map((preset) => {
                      const isSelected = chatWallpaper === preset.storageValue || chatWallpaper === preset.previewValue
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            handleApplyChatWallpaper(preset.storageValue)
                            toast.success(`Тема "${preset.label}" применена`)
                          }}
                          className={`overflow-hidden rounded-xl border text-left transition ${isSelected ? 'border-primary ring-1 ring-primary/40' : 'border-border hover:border-primary/40'}`}
                        >
                          <div className="relative h-24 w-full overflow-hidden" style={buildChatWallpaperStyle(preset.storageValue, isDarkTheme)}>
                            <div className="absolute inset-x-3 top-3 flex justify-start">
                              <div className={`max-w-[55%] rounded-2xl px-2.5 py-1.5 text-[10px] shadow-sm ${isDarkTheme ? 'bg-white/12 text-white' : 'bg-white/80 text-slate-700'}`}>Привет</div>
                            </div>
                            <div className="absolute inset-x-3 bottom-3 flex justify-end">
                              <div className={`max-w-[58%] rounded-2xl px-2.5 py-1.5 text-[10px] shadow-sm ${isDarkTheme ? 'bg-primary/80 text-white' : 'bg-primary/70 text-white'}`}>Как дела?</div>
                            </div>
                          </div>
                          <div className="border-t border-border bg-background px-3 py-2 text-xs text-foreground">{preset.label}</div>
                        </button>
                      )
                    })}
                  </div>
                  {mediaAttachments.length > 0 ? (
                    <div className="mt-3">
                      <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Из медиа чата</div>
                      <div className="grid grid-cols-3 gap-2">
                        {mediaAttachments.slice(0, 6).map(({ messageId, attachment }) => {
                          const attachmentUrl = resolveMessageAttachmentUrl(messageId, attachment)
                          if (!attachmentUrl) return null
                          return (
                            <button
                              key={`wallpaper-${attachment.id}`}
                              type="button"
                              onClick={() => handleApplyChatWallpaper(attachmentUrl)}
                              className={`overflow-hidden rounded-lg border transition ${chatWallpaper === attachmentUrl ? 'border-primary ring-1 ring-primary/40' : 'border-border hover:border-primary/40'}`}
                            >
                              <img src={attachmentUrl} alt={attachment.file_name} className="aspect-square w-full object-cover" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Участники</h3>
                  <div className="mt-3 space-y-2">
                    {(selectedThread.participant_profiles || []).map((participant) => {
                      const participantPermissions = getParticipantGroupPermissions(participant)
                      const isOwnCard = participant.id === currentUserId
                      const canToggleAdmin = canManageGroupAdmins && !isOwnCard
                      const canRemoveMember = canManageGroupMembers && !isOwnCard
                      const isProcessing = groupActionUserId === participant.id
                      return (
                        <div key={participant.id} className="rounded-xl border border-border bg-background px-3 py-3">
                          <div className="flex items-start gap-3">
                            <AvatarImage src={participant.avatar_url || null} name={participant.name} className="h-10 w-10 rounded-full" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-foreground">{participant.name}</p>
                                {participant.is_group_admin ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Админ</span> : null}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">{participant.role || 'Сотрудник'}</p>
                            </div>
                          </div>

                          {(canToggleAdmin || canRemoveMember) ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {canToggleAdmin ? (
                                participant.is_group_admin ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleRemoveGroupAdmin(participant.id)}
                                    disabled={isProcessing}
                                    className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Снять админа
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => void handleAddGroupAdmin(participant.id)}
                                    disabled={isProcessing}
                                    className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Сделать админом
                                  </button>
                                )
                              ) : null}
                              {canRemoveMember ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveGroupMember(participant.id, participant.name)}
                                  disabled={isProcessing}
                                  className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-[11px] text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Удалить из группы
                                </button>
                              ) : null}
                            </div>
                          ) : null}

                          {participant.is_group_admin && canManageGroupAdmins && !isOwnCard ? (
                            <div className="mt-3 grid gap-2 rounded-xl border border-border/80 bg-card/40 p-3">
                              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Привилегии администратора</div>
                              <label className="flex items-center justify-between gap-3 text-xs text-foreground">
                                <span>Менять фото и название</span>
                                <input
                                  type="checkbox"
                                  checked={participantPermissions.manage_info}
                                  onChange={(event) => void handleToggleGroupAdminPermission(participant.id, 'manage_info', event.target.checked, participantPermissions)}
                                  disabled={isProcessing}
                                />
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs text-foreground">
                                <span>Удалять участников</span>
                                <input
                                  type="checkbox"
                                  checked={participantPermissions.manage_members}
                                  onChange={(event) => void handleToggleGroupAdminPermission(participant.id, 'manage_members', event.target.checked, participantPermissions)}
                                  disabled={isProcessing}
                                />
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs text-foreground">
                                <span>Назначать админов</span>
                                <input
                                  type="checkbox"
                                  checked={participantPermissions.manage_admins}
                                  onChange={(event) => void handleToggleGroupAdminPermission(participant.id, 'manage_admins', event.target.checked, participantPermissions)}
                                  disabled={isProcessing}
                                />
                              </label>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Медиа</h3>
                    <span className="text-xs text-muted-foreground">{mediaAttachments.length}</span>
                  </div>
                  {mediaAttachments.length > 0 ? (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {mediaAttachments.slice(0, 12).map(({ messageId, attachment }) => {
                        const attachmentUrl = resolveMessageAttachmentUrl(messageId, attachment)
                        return attachmentUrl ? <img key={attachment.id} src={attachmentUrl} alt={attachment.file_name} className="aspect-square w-full rounded-lg object-cover" /> : null
                      })}
                    </div>
                  ) : <p className="mt-3 text-sm text-muted-foreground">Медиа пока нет.</p>}
                </section>

                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Файлы</h3>
                    <span className="text-xs text-muted-foreground">{fileAttachments.length}</span>
                  </div>
                  {fileAttachments.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {fileAttachments.slice(0, 8).map(({ messageId, attachment }) => {
                        const attachmentUrl = resolveMessageAttachmentUrl(messageId, attachment)
                        return (
                          <a key={attachment.id} href={attachmentUrl || '#'} target="_blank" rel="noreferrer" className="block rounded-lg border border-border bg-background px-3 py-2 hover:bg-accent">
                            <div className="truncate text-sm font-medium text-foreground">{attachment.file_name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{formatFileSize(attachment.size_bytes)}</div>
                          </a>
                        )
                      })}
                    </div>
                  ) : <p className="mt-3 text-sm text-muted-foreground">Файлов пока нет.</p>}
                </section>

                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ссылки</h3>
                    <span className="text-xs text-muted-foreground">{threadLinks.length}</span>
                  </div>
                  {threadLinks.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {threadLinks.slice(0, 8).map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="block truncate rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary hover:bg-accent">
                          {url}
                        </a>
                      ))}
                    </div>
                  ) : <p className="mt-3 text-sm text-muted-foreground">Ссылок пока нет.</p>}
                </section>
              </div>
            </aside>
          ) : null}

          {forwardingMessage ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Переслать сообщение</p>
                    <p className="text-xs text-muted-foreground">{forwardingMessage.body || forwardingMessage.forwarded_from?.body || 'Без текста'}</p>
                  </div>
                  <button type="button" onClick={() => { setForwardingMessage(null); setForwardQuery('') }} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input value={forwardQuery} onChange={(event) => setForwardQuery(event.target.value)} placeholder="Поиск чата" className="h-6 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-3">
                  {forwardTargets.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">Подходящих чатов не найдено.</p>
                  ) : forwardTargets.map((thread) => (
                    <button key={thread.id} type="button" onClick={() => void handleForwardMessageToThread(thread.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-accent">
                      <AvatarImage src={null} name={getThreadTitle(thread, currentUserId)} className="h-10 w-10 rounded-full" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{getThreadTitle(thread, currentUserId)}</p>
                        <p className="truncate text-xs text-muted-foreground">{getThreadSubtitle(thread, currentUserId)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {incomingCallOverlay}

          {activeCallOverlay}
        </section>
      </div>
    </div>
  )
}
