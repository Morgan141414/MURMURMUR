import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Globe, Calendar } from 'lucide-react'
import { setupAccounting, type AccountingSettings } from '@/api/accounting'
import { toast } from 'sonner'

interface Props {
  orgId: string
  onComplete: (settings: AccountingSettings) => void
}

export function SetupWizard({ orgId, onComplete }: Props) {
  const { t } = useTranslation()
  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [fiscalStart, setFiscalStart] = useState('')
  const [fiscalEnd, setFiscalEnd] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSetup = async () => {
    if (!companyName.trim()) {
      toast.error(t('accounting.setup.nameRequired', 'Company name is required'))
      return
    }
    setLoading(true)
    try {
      const { data } = await setupAccounting(orgId, {
        company_name: companyName,
        country: country || undefined,
        fiscal_year_start: fiscalStart || undefined,
        fiscal_year_end: fiscalEnd || undefined,
      })
      toast.success(t('accounting.setup.success', 'Accounting set up successfully'))
      onComplete(data)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || t('accounting.setup.error', 'Setup failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{t('accounting.setup.title', 'Set Up Accounting')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('accounting.setup.description', 'Configure your chart of accounts and fiscal year to get started.')}
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('accounting.setup.companyName', 'Company Name')}</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full rounded-lg border border-input bg-background px-9 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('accounting.setup.companyNamePlaceholder', 'Your company name')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('accounting.setup.country', 'Country')}</label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full rounded-lg border border-input bg-background px-9 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('accounting.setup.countryPlaceholder', 'e.g. Kazakhstan')}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('accounting.setup.fiscalStart', 'Fiscal Year Start')}</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  className="w-full rounded-lg border border-input bg-background px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={fiscalStart}
                  onChange={(e) => setFiscalStart(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('accounting.setup.fiscalEnd', 'Fiscal Year End')}</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  className="w-full rounded-lg border border-input bg-background px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={fiscalEnd}
                  onChange={(e) => setFiscalEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading
            ? t('accounting.setup.loading', 'Setting up...')
            : t('accounting.setup.button', 'Set Up Accounting')}
        </button>
      </div>
    </div>
  )
}
