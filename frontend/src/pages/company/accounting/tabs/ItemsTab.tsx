import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Plus } from 'lucide-react'
import { listItems, createItem, listAccounts, type AccItem, type AccountingAccount } from '@/api/accounting'
import { toast } from 'sonner'

function fmt(v: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

export function ItemsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<AccItem[]>([])
  const [accounts, setAccounts] = useState<AccountingAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formType, setFormType] = useState('Product')
  const [formFor, setFormFor] = useState('Both')
  const [formRate, setFormRate] = useState(0)
  const [formIncome, setFormIncome] = useState('')
  const [formExpense, setFormExpense] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      listItems(orgId),
      listAccounts(orgId, { is_group: false }),
    ]).then(([itm, acc]) => {
      setItems(itm.data)
      setAccounts(acc.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId])

  const handleCreate = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      await createItem(orgId, {
        name: formName,
        item_code: formCode || undefined,
        item_type: formType,
        for_type: formFor,
        rate: formRate,
        income_account_id: formIncome || undefined,
        expense_account_id: formExpense || undefined,
      })
      toast.success(t('accounting.items.created', 'Item created'))
      setShowCreate(false)
      setFormName('')
      setFormCode('')
      setFormRate(0)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('accounting.items.title', 'Items')}</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          {t('accounting.items.new', 'New Item')}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.items.name', 'Item name')} value={formName} onChange={e => setFormName(e.target.value)} />
            <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.items.code', 'Item code')} value={formCode} onChange={e => setFormCode(e.target.value)} />
            <input type="number" min={0} step={0.01} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.items.rate', 'Rate')} value={formRate || ''} onChange={e => setFormRate(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formType} onChange={e => setFormType(e.target.value)}>
              <option value="Product">{t('accounting.items.product', 'Product')}</option>
              <option value="Service">{t('accounting.items.service', 'Service')}</option>
            </select>
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formFor} onChange={e => setFormFor(e.target.value)}>
              <option value="Both">{t('accounting.parties.both', 'Both')}</option>
              <option value="Sales">{t('accounting.sales', 'Sales')}</option>
              <option value="Purchases">{t('accounting.purchase', 'Purchase')}</option>
            </select>
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formIncome} onChange={e => setFormIncome(e.target.value)}>
              <option value="">{t('accounting.items.incomeAccount', 'Income account...')}</option>
              {accounts.filter(a => a.root_type === 'Income').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formExpense} onChange={e => setFormExpense(e.target.value)}>
              <option value="">{t('accounting.items.expenseAccount', 'Expense account...')}</option>
              {accounts.filter(a => a.root_type === 'Expense').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted transition-colors">{t('common.cancel', 'Cancel')}</button>
            <button onClick={handleCreate} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{t('common.create', 'Create')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t('accounting.items.empty', 'No items yet')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.items.name', 'Name')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.items.code', 'Code')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.items.type', 'Type')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.items.for', 'For')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.items.rate', 'Rate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.item_code || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${item.item_type === 'Product' ? 'bg-blue-500/10 text-blue-600' : 'bg-violet-500/10 text-violet-600'}`}>{item.item_type}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.for_type}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
