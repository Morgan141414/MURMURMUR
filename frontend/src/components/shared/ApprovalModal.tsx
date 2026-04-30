import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, Loader2, User, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ApprovalPayloadDetails {
  targetUserName?: string | null
  targetUserEmail?: string | null
  requesterName?: string | null
  requesterEmail?: string | null
  department?: string
  position?: string
  role?: string
  roleLabel?: string
}

interface ApprovalModalProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  actionType: string
  targetName?: string
  details?: ApprovalPayloadDetails
  onApprove: (comment?: string) => Promise<void>
  onReject: (comment: string) => Promise<void>
}

export function ApprovalModal({
  open,
  onClose,
  title,
  description,
  actionType,
  targetName,
  details,
  onApprove,
  onReject,
}: ApprovalModalProps) {
  const { t } = useTranslation()
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'view' | 'reject'>('view')

  if (!open) return null

  async function handleApprove() {
    setLoading(true)
    try {
      await onApprove(comment || undefined)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!comment.trim()) return
    setLoading(true)
    try {
      await onReject(comment)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const resolvedTargetName = details?.targetUserName || targetName

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="px-6 py-4 space-y-3">
          {/* Action type */}
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">{t('approval.actionType', 'Тип действия')}</p>
            <p className="text-sm font-medium text-foreground">{actionType}</p>
          </div>

          {/* Target user */}
          {resolvedTargetName && (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t('approval.target', 'Сотрудник')}</p>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">{resolvedTargetName}</p>
              </div>
              {details?.targetUserEmail && (
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">{details.targetUserEmail}</p>
              )}
            </div>
          )}

          {/* Payload details */}
          {details?.department && (
            <div className="rounded-xl border border-border bg-blue-500/5 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t('approval.newDepartment', 'Новый отдел')}</p>
              <div className="flex items-center gap-2 mt-1">
                <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-sm font-medium text-foreground">{details.department}</p>
              </div>
            </div>
          )}

          {details?.position && (
            <div className="rounded-xl border border-border bg-amber-500/5 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t('approval.newPosition', 'Новая должность')}</p>
              <div className="flex items-center gap-2 mt-1">
                <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-sm font-medium text-foreground">{details.position}</p>
              </div>
            </div>
          )}

          {details?.role && (
            <div className="rounded-xl border border-border bg-violet-500/5 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t('approval.newRole', 'Новая роль')}</p>
              <div className="flex items-center gap-2 mt-1">
                <ArrowRight className="h-3.5 w-3.5 text-violet-500" />
                <p className="text-sm font-medium text-foreground">{details.roleLabel || details.role}</p>
              </div>
            </div>
          )}

          {/* Requester */}
          {details?.requesterName && (
            <div className="rounded-xl border border-border bg-muted/10 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t('approval.requester', 'Инициатор запроса')}</p>
              <p className="text-sm text-foreground mt-0.5">{details.requesterName}</p>
            </div>
          )}

          {/* Comment fields */}
          {mode === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('approval.rejectReason', 'Причина отклонения')} *
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('approval.rejectReasonPlaceholder', 'Укажите причину отклонения...')}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none resize-none"
                rows={3}
              />
            </div>
          )}

          {mode === 'view' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('approval.comment', 'Комментарий (необязательно)')}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('approval.commentPlaceholder', 'Добавить комментарий...')}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none resize-none"
                rows={2}
              />
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Отмена')}
          </Button>
          {mode === 'view' ? (
            <>
              <Button
                variant="outline"
                onClick={() => setMode('reject')}
                disabled={loading}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                {t('approval.reject', 'Отклонить')}
              </Button>
              <Button onClick={handleApprove} disabled={loading}>
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                {t('approval.approve', 'Одобрить')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setMode('view')} disabled={loading}>
                {t('common.back', 'Назад')}
              </Button>
              <Button
                onClick={handleReject}
                disabled={loading || !comment.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                {t('approval.confirmReject', 'Подтвердить отклонение')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
