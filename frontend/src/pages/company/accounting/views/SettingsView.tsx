import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { getSettings, updateSettings, type AccountingSettings } from '@/api/accounting'
import { AccPageHeader } from '../components/AccPageHeader'
import { AccButton } from '../components/AccButton'
import { toast } from 'sonner'

export function SettingsView({ orgId, onBack }: { orgId: string; onBack: () => void }) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<AccountingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSettings(orgId).then((r) => setSettings(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [orgId])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await updateSettings(orgId, {
        company_name: settings.company_name, country: settings.country,
        enable_discounting: settings.enable_discounting, enable_inventory: settings.enable_inventory,
        enable_pos: settings.enable_pos, enable_invoice_returns: settings.enable_invoice_returns,
      })
      setSettings(res.data)
      toast.success('Settings saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--acc-blue-500)' }} />
      </div>
    )
  }

  const toggles: { key: keyof AccountingSettings; label: string; desc: string }[] = [
    { key: 'enable_discounting', label: 'Discounting', desc: 'Enable line-item and invoice-level discounts' },
    { key: 'enable_inventory', label: 'Inventory', desc: 'Track stock movement and quantities' },
    { key: 'enable_pos', label: 'Point of Sale', desc: 'POS interface for retail sales' },
    { key: 'enable_invoice_returns', label: 'Returns', desc: 'Allow creating return invoices' },
  ]

  return (
    <div className="flex flex-col h-full">
      <AccPageHeader title={t('accounting.nav.settings', 'Settings')} onBack={onBack}>
        <AccButton variant="primary" icon={<Save size={14} />} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </AccButton>
      </AccPageHeader>

      <div className="flex-1 overflow-auto p-6" style={{ background: 'var(--acc-gray-25)' }}>
        <div className="mx-auto" style={{ maxWidth: 560 }}>
          {/* Company info */}
          <div className="acc-form-card space-y-4 mb-6">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--acc-gray-400)' }}>Company</h3>
            <div><label className="acc-label">Company Name</label>
              <input className="acc-input" value={settings.company_name || ''} onChange={e => setSettings({ ...settings, company_name: e.target.value })} />
            </div>
            <div><label className="acc-label">Country</label>
              <input className="acc-input" value={settings.country || ''} onChange={e => setSettings({ ...settings, country: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="acc-label">Fiscal Year Start</label>
                <input type="date" className="acc-input" value={settings.fiscal_year_start?.slice(0, 10) || ''} onChange={e => setSettings({ ...settings, fiscal_year_start: e.target.value })} />
              </div>
              <div><label className="acc-label">Fiscal Year End</label>
                <input type="date" className="acc-input" value={settings.fiscal_year_end?.slice(0, 10) || ''} onChange={e => setSettings({ ...settings, fiscal_year_end: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Feature toggles */}
          <div className="acc-form-card space-y-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--acc-gray-400)' }}>Features</h3>
            {toggles.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3 px-4 rounded-lg" style={{ border: '1px solid var(--acc-gray-200)', background: 'var(--acc-gray-25)' }}>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--acc-gray-800)' }}>{label}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--acc-gray-400)' }}>{desc}</div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, [key]: !(settings as any)[key] })}
                  className="relative w-10 h-6 rounded-full transition-colors"
                  style={{ background: (settings as any)[key] ? 'var(--acc-blue-500)' : 'var(--acc-gray-300)' }}
                >
                  <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{ left: (settings as any)[key] ? 'calc(100% - 22px)' : '2px' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
