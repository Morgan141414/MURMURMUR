import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Users } from 'lucide-react'
import { listParties, createParty, type Party } from '@/api/accounting'
import { toast } from 'sonner'

function fmt(v: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

export function PartiesTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'Customer' | 'Supplier'>('all')

  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState<'Customer' | 'Supplier' | 'Both'>('Both')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formTaxId, setFormTaxId] = useState('')

  const load = () => {
    setLoading(true)
    listParties(orgId).then(r => setParties(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId])

  const handleCreate = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      await createParty(orgId, {
        name: formName,
        role: formRole,
        email: formEmail || undefined,
        phone: formPhone || undefined,
        tax_id: formTaxId || undefined,
      })
      toast.success(t('accounting.parties.created', 'Party created'))
      setShowCreate(false)
      setFormName('')
      setFormEmail('')
      setFormPhone('')
      setFormTaxId('')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = filter === 'all' ? parties : parties.filter(p => p.role === filter || p.role === 'Both')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'Customer', 'Supplier'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {f === 'all' ? t('common.all', 'All') : f === 'Customer' ? t('accounting.parties.customers', 'Customers') : t('accounting.parties.suppliers', 'Suppliers')}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          {t('accounting.parties.new', 'New Party')}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.parties.name', 'Name')} value={formName} onChange={e => setFormName(e.target.value)} />
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formRole} onChange={e => setFormRole(e.target.value as any)}>
              <option value="Both">{t('accounting.parties.both', 'Both')}</option>
              <option value="Customer">{t('accounting.parties.customer', 'Customer')}</option>
              <option value="Supplier">{t('accounting.parties.supplier', 'Supplier')}</option>
            </select>
            <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Email" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
            <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.parties.phone', 'Phone')} value={formPhone} onChange={e => setFormPhone(e.target.value)} />
            <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.parties.taxId', 'Tax ID / BIN')} value={formTaxId} onChange={e => setFormTaxId(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted transition-colors">{t('common.cancel', 'Cancel')}</button>
            <button onClick={handleCreate} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{t('common.create', 'Create')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t('accounting.parties.empty', 'No parties yet')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.parties.name', 'Name')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.parties.role', 'Role')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.parties.phone', 'Phone')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.parties.taxId', 'Tax ID')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.parties.outstanding', 'Outstanding')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      p.role === 'Customer' ? 'bg-emerald-500/10 text-emerald-600' : p.role === 'Supplier' ? 'bg-blue-500/10 text-blue-600' : 'bg-violet-500/10 text-violet-600'
                    }`}>{p.role}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.tax_id || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(p.outstanding_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
