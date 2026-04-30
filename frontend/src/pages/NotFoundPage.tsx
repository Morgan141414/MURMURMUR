import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="auth-scene relative flex min-h-screen flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="auth-blob auth-blob-1" style={{ opacity: 0.5 }} />
        <div className="auth-blob auth-blob-2" style={{ opacity: 0.4 }} />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative text-center animate-float-up">
        {/* Giant 404 */}
        <div className="relative select-none">
          <p
            className="text-[160px] font-black leading-none sm:text-[220px]"
            style={{
              background: 'linear-gradient(180deg, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.05) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.06em',
            }}
          >
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="h-32 w-64 rounded-full sm:h-40 sm:w-80"
              style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.2), transparent 70%)', filter: 'blur(20px)' }}
            />
          </div>
        </div>

        <p className="mt-2 text-2xl font-bold text-white">{t('errors.notFound', 'Страница не найдена')}</p>
        <p className="mt-3 max-w-sm mx-auto text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {t('errors.notFoundMessage', 'Страница, которую вы ищете, не существует или была перемещена.')}
        </p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-all hover:scale-105"
            style={{
              borderColor: 'rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              boxShadow: '0 4px 20px -4px rgba(79,70,229,0.6)',
            }}
          >
            <Home className="h-4 w-4" />
            {t('errors.goHome', 'На главную')}
          </Link>
        </div>
      </div>
    </div>
  )
}
