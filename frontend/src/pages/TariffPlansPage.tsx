import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Check, X, Zap, Building2, Rocket } from 'lucide-react'

interface Plan {
  id: string
  nameKey: string
  priceKey: string
  descKey: string
  icon: React.ReactNode
  featured: boolean
  features: { key: string; included: boolean }[]
}

const plans: Plan[] = [
  {
    id: 'starter',
    nameKey: 'tariffs.starter',
    priceKey: 'tariffs.starterPrice',
    descKey: 'tariffs.starterDesc',
    icon: <Zap className="h-6 w-6" />,
    featured: false,
    features: [
      { key: 'tariffs.feat.members10', included: true },
      { key: 'tariffs.feat.projects3', included: true },
      { key: 'tariffs.feat.basicReports', included: true },
      { key: 'tariffs.feat.activityTracking', included: true },
      { key: 'tariffs.feat.support', included: false },
      { key: 'tariffs.feat.aiAnalytics', included: false },
      { key: 'tariffs.feat.customBranding', included: false },
      { key: 'tariffs.feat.apiAccess', included: false },
    ],
  },
  {
    id: 'business',
    nameKey: 'tariffs.business',
    priceKey: 'tariffs.businessPrice',
    descKey: 'tariffs.businessDesc',
    icon: <Building2 className="h-6 w-6" />,
    featured: true,
    features: [
      { key: 'tariffs.feat.members50', included: true },
      { key: 'tariffs.feat.projectsUnlimited', included: true },
      { key: 'tariffs.feat.advancedReports', included: true },
      { key: 'tariffs.feat.activityTracking', included: true },
      { key: 'tariffs.feat.support', included: true },
      { key: 'tariffs.feat.aiAnalytics', included: true },
      { key: 'tariffs.feat.customBranding', included: false },
      { key: 'tariffs.feat.apiAccess', included: false },
    ],
  },
  {
    id: 'enterprise',
    nameKey: 'tariffs.enterprise',
    priceKey: 'tariffs.enterprisePrice',
    descKey: 'tariffs.enterpriseDesc',
    icon: <Rocket className="h-6 w-6" />,
    featured: false,
    features: [
      { key: 'tariffs.feat.membersUnlimited', included: true },
      { key: 'tariffs.feat.projectsUnlimited', included: true },
      { key: 'tariffs.feat.advancedReports', included: true },
      { key: 'tariffs.feat.activityTracking', included: true },
      { key: 'tariffs.feat.support', included: true },
      { key: 'tariffs.feat.aiAnalytics', included: true },
      { key: 'tariffs.feat.customBranding', included: true },
      { key: 'tariffs.feat.apiAccess', included: true },
    ],
  },
]

export default function TariffPlansPage() {
  const { t } = useTranslation()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="page-enter mx-auto max-w-5xl space-y-6">
      <div className="text-center">
        <PageHeader title={t('tariffs.title')} description={t('tariffs.subtitle')} />
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billing === 'monthly'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tariffs.monthly')}
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billing === 'yearly'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tariffs.yearly')}
            <span className="ml-1.5 rounded bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg border p-6 flex flex-col ${
              plan.featured
                ? 'border-primary bg-card shadow-lg ring-1 ring-primary/20'
                : 'border-border bg-card'
            }`}
          >
            {plan.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                {t('tariffs.popular')}
              </div>
            )}

            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              plan.featured ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
            }`}>
              {plan.icon}
            </div>

            <h3 className="mt-4 text-lg font-semibold text-foreground">{t(plan.nameKey)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t(plan.descKey)}</p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{t(plan.priceKey)}</span>
              {plan.id !== 'enterprise' && (
                <span className="text-sm text-muted-foreground">
                  / {billing === 'monthly' ? t('tariffs.mo') : t('tariffs.yr')}
                </span>
              )}
            </div>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((feat) => (
                <li key={feat.key} className="flex items-center gap-2.5 text-sm">
                  {feat.included ? (
                    <Check className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className={feat.included ? 'text-foreground' : 'text-muted-foreground'}>
                    {t(feat.key)}
                  </span>
                </li>
              ))}
            </ul>

            <button
              className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                plan.featured
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              {plan.id === 'enterprise' ? t('tariffs.contactSales') : t('tariffs.choosePlan')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
