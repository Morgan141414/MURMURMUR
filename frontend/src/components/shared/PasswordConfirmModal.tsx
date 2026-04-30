import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { confirmAction } from '@/api/auth'

interface PasswordConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirmed: () => void
  title?: string
  description?: string
  action?: string
}

export function PasswordConfirmModal({
  open,
  onClose,
  onConfirmed,
  title,
  description,
  action = 'generic',
}: PasswordConfirmModalProps) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function handleConfirm() {
    if (!password.trim()) return
    setLoading(true)
    setError('')
    try {
      await confirmAction(password, action)
      setPassword('')
      onConfirmed()
      onClose()
    } catch {
      setError(t('auth.wrongPassword', 'Неверный пароль'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center px-6 pt-6 pb-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 mb-3">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {title ?? t('auth.confirmAction', 'Подтверждение действия')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {description ?? t('auth.confirmActionDesc', 'Для выполнения этого действия введите пароль повторно.')}
          </p>
        </div>

        <div className="px-6 pb-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            placeholder={t('auth.password', 'Пароль')}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            autoFocus
          />
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Отмена')}
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !password.trim()}>
            {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t('auth.confirm', 'Подтвердить')}
          </Button>
        </div>
      </div>
    </div>
  )
}
