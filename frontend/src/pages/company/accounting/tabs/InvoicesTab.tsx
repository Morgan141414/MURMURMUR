import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Plus, Send, X } from 'lucide-react'
import {
  listInvoices,
  createInvoice,
  submitInvoice,
  cancelInvoice,
  listParties,
  listAccounts,
  listItems,
  type Invoice,
  type Party,
  type AccountingAccount,
  type AccItem,
} from '@/api/accounting'
import { toast } from 'sonner'

function fmt(v: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

interface InvoiceItemRow {
  item_id: string
  account_id: string
  quantity: number
  rate: number
  tax_id?: string
}

export function InvoicesTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [accounts, setAccounts] = useState<AccountingAccount[]>([])
  const [items, setItems] = useState<AccItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'all' | 'Sales' | 'Purchase'>('all')

  const [formType, setFormType] = useState<'Sales' | 'Purchase'>('Sales')
  const [formParty, setFormParty] = useState('')
  const [formAccount, setFormAccount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formItems, setFormItems] = useState<InvoiceItemRow[]>([{ item_id: '', account_id: '', quantity: 1, rate: 0 }])
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      listInvoices(orgId),
      listParties(orgId),
      listAccounts(orgId, { is_group: false }),
      listItems(orgId),
    ]).then(([inv, par, acc, itm]) => {
      setInvoices(inv.data)
      setParties(par.data)
      setAccounts(acc.data)
      setItems(itm.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId])

  const handleCreate = async () => {
    if (!formParty || !formAccount || formItems.some(i => !i.item_id || !i.account_id)) {
      toast.error(t('accounting.invoices.fillRequired', 'Fill all required fields'))
      return
    }
    setSaving(true)
    try {
      await createInvoice(orgId, {
        invoice_type: formType,
        party_id: formParty,
        account_id: formAccount,
        date: new Date(formDate).toISOString(),
        items: formItems,
      })
      toast.success(t('accounting.invoices.created', 'Invoice created'))
      setShowCreate(false)
      setFormItems([{ item_id: '', account_id: '', quantity: 1, rate: 0 }])
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (id: string) => {
    try {
      await submitInvoice(orgId, id)
      toast.success(t('accounting.invoices.submitted', 'Invoice submitted'))
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelInvoice(orgId, id)
      toast.success(t('accounting.invoices.cancelled', 'Invoice cancelled'))
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    }
  }

  const addItemRow = () => {
    setFormItems([...formItems, { item_id: '', account_id: '', quantity: 1, rate: 0 }])
  }

  const updateItemRow = (idx: number, field: string, value: string | number) => {
    const updated = [...formItems]
    ;(updated[idx] as any)[field] = value
    setFormItems(updated)
  }

  const removeItemRow = (idx: number) => {
    if (formItems.length <= 1) return
    setFormItems(formItems.filter((_, i) => i !== idx))
  }

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.invoice_type === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'Sales', 'Purchase'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all' ? t('common.all', 'All') : f === 'Sales' ? t('accounting.sales', 'Sales') : t('accounting.purchase', 'Purchase')}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('accounting.invoices.new', 'New Invoice')}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">{t('accounting.invoices.create', 'Create Invoice')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <select
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={formType}
              onChange={e => setFormType(e.target.value as 'Sales' | 'Purchase')}
            >
              <option value="Sales">{t('accounting.sales', 'Sales')}</option>
              <option value="Purchase">{t('accounting.purchase', 'Purchase')}</option>
            </select>
            <select
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={formParty}
              onChange={e => setFormParty(e.target.value)}
            >
              <option value="">{t('accounting.invoices.selectParty', 'Select party...')}</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={formAccount}
              onChange={e => setFormAccount(e.target.value)}
            >
              <option value="">{t('accounting.invoices.selectAccount', 'Select account...')}</option>
              {accounts.filter(a => a.account_type === 'Receivable' || a.account_type === 'Payable').map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <input
              type="date"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('accounting.invoices.lineItems', 'Line Items')}
            </div>
            {formItems.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                <select
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={row.item_id}
                  onChange={e => {
                    updateItemRow(idx, 'item_id', e.target.value)
                    const item = items.find(i => i.id === e.target.value)
                    if (item) {
                      updateItemRow(idx, 'rate', item.rate)
                      const accId = formType === 'Sales' ? item.income_account_id : item.expense_account_id
                      if (accId) updateItemRow(idx, 'account_id', accId)
                    }
                  }}
                >
                  <option value="">{t('accounting.invoices.selectItem', 'Select item...')}</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
                <select
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={row.account_id}
                  onChange={e => updateItemRow(idx, 'account_id', e.target.value)}
                >
                  <option value="">{t('accounting.invoices.account', 'Account')}</option>
                  {accounts.filter(a => !a.is_group).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t('accounting.invoices.qty', 'Qty')}
                  value={row.quantity}
                  onChange={e => updateItemRow(idx, 'quantity', Number(e.target.value))}
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t('accounting.invoices.rate', 'Rate')}
                  value={row.rate}
                  onChange={e => updateItemRow(idx, 'rate', Number(e.target.value))}
                />
                <button
                  onClick={() => removeItemRow(idx)}
                  className="flex items-center justify-center rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addItemRow}
              className="text-sm text-primary hover:underline"
            >
              + {t('accounting.invoices.addItem', 'Add item')}
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? t('common.saving', 'Saving...') : t('common.create', 'Create')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t('accounting.invoices.empty', 'No invoices yet')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">#</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.invoices.type', 'Type')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.invoices.date', 'Date')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.invoices.total', 'Total')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.invoices.outstanding', 'Outstanding')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.invoices.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{inv.number}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      inv.invoice_type === 'Sales' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {inv.invoice_type === 'Sales' ? t('accounting.sales', 'Sales') : t('accounting.purchase', 'Purchase')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(inv.date).toLocaleDateString('ru-RU')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(inv.grand_total)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(inv.outstanding_amount)}</td>
                  <td className="px-4 py-3">
                    {inv.cancelled ? (
                      <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                        {t('accounting.cancelled', 'Cancelled')}
                      </span>
                    ) : inv.submitted ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        {t('accounting.submitted', 'Submitted')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">
                        {t('accounting.draft', 'Draft')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!inv.submitted && !inv.cancelled && (
                        <button
                          onClick={() => handleSubmit(inv.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title={t('accounting.invoices.submit', 'Submit')}
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      {inv.submitted && !inv.cancelled && (
                        <button
                          onClick={() => handleCancel(inv.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title={t('accounting.invoices.cancel', 'Cancel')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
