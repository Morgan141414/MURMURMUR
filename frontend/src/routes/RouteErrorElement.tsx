import { useEffect } from 'react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'
import { AlertTriangle, ArrowLeft, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isDynamicImportError, recoverFromDynamicImportError } from '@/lib/chunkRecovery'

function getErrorCopy(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return {
      title: error.status === 404 ? 'Страница не найдена' : 'Не удалось открыть раздел',
      description:
        typeof error.data === 'string'
          ? error.data
          : error.statusText || 'Во время загрузки маршрута произошла ошибка.',
    }
  }

  if (error instanceof Error) {
    return {
      title: 'Произошла ошибка интерфейса',
      description: error.message || 'Во время загрузки страницы произошёл сбой.',
    }
  }

  return {
    title: 'Не удалось открыть раздел',
    description: 'Во время загрузки страницы произошёл непредвиденный сбой.',
  }
}

export function RouteErrorElement() {
  const error = useRouteError()
  const navigate = useNavigate()
  const copy = getErrorCopy(error)
  const isChunkError = isDynamicImportError(error)

  useEffect(() => {
    if (!isChunkError) return
    const timer = window.setTimeout(() => {
      void recoverFromDynamicImportError(error)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [error, isChunkError])

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-tertiary">
            Route error
          </p>
          <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => window.location.reload()}>
            <RefreshCcw className="h-4 w-4" />
            Обновить страницу
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
        </div>
      </div>
    </div>
  )
}
