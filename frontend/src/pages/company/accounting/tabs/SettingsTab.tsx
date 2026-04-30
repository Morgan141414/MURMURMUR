import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react'
import { getSettings, updateSettings, type AccountingSettings } from '@/api/accounting'
import { toast } from 'sonner'

export function AccountingSettingsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<AccountingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [enableDiscounting, setEnableDiscounting] = useState(true)
  const [enableInventory, setEnableInventory] = useState(false)
  const [enablePos, setEnablePos] = useState(false)
  const [enableReturns, setEnableReturns] = useState(true)

  useEffect(() => {
    setLoading(true)
    getSettings(orgId).then(r => {
      const s = r.data
      setSettings(s)
      setCompanyName(s.company_name || '')
      setCountry(s.country || '')
      setEnableDiscounting(s.enable_discounting)
      setEnableInventory(s.enable_inventory)
      setEnablePos(s.enable_pos)
      setEnableReturns(s.enable_invoice_returns)
    }).finally(() => setLoading(false))
  }, [orgId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await updateSettings(orgId, {
        company_name: companyName,
        country: country || undefined,
        enable_discounting: enableDiscounting,
        enable_inventory: enableInventory,
        enable_pos: enablePos,
        enable_invoice_returns: enableReturns,
      })
      setSettings(data)
      toast.success(t('accounting.settings.saved', 'Settings saved'))
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-64 rounded-xl bg-muted" /></div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-lg font-semibold">{t('accounting.settings.title', 'Accounting Settings')}</h3>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('accounting.settings.companyName', 'Company Name')}</label>
          <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={companyName} onChange={e => setCompanyName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('accounting.settings.country', 'Country')}</label>
          <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={country} onChange={e => setCountry(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h4 className="text-sm font-semibold">{t('accounting.settings.features', 'Features')}</h4>

        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('accounting.settings.discounting', 'Discounting')}</p>
            <p className="text-xs text-muted-foreground">{t('accounting.settings.discountingDesc', 'Enable item and invoice level discounts')}</p>
          </div>
          <input type="checkbox" checked={enableDiscounting} onChange={e => setEnableDiscounting(e.target.checked)} className="rounded border-input h-4 w-4" />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('accounting.settings.inventory', 'Inventory')}</p>
            <p className="text-xs text-muted-foreground">{t('accounting.settings.inventoryDesc', 'Track stock levels and movements')}</p>
          </div>
          <input type="checkbox" checked={enableInventory} onChange={e => setEnableInventory(e.target.checked)} className="rounded border-input h-4 w-4" />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('accounting.settings.pos', 'Point of Sale')}</p>
            <p className="text-xs text-muted-foreground">{t('accounting.settings.posDesc', 'Enable POS interface for retail sales')}</p>
          </div>
          <input type="checkbox" checked={enablePos} onChange={e => setEnablePos(e.target.checked)} className="rounded border-input h-4 w-4" />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('accounting.settings.returns', 'Invoice Returns')}</p>
            <p className="text-xs text-muted-foreground">{t('accounting.settings.returnsDesc', 'Allow creating return invoices')}</p>
          </div>
          <input type="checkbox" checked={enableReturns} onChange={e => setEnableReturns(e.target.checked)} className="rounded border-input h-4 w-4" />
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
      </button>
    </div>
  )
}
