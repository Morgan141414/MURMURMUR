import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CreditCard, Plus, Send, X } from 'lucide-react'
import {
  listPayments,
  createPayment,
  submitPayment,
  cancelPayment,
  listParties,
  listAccounts,
  listInvoices,
  type Payment,
  type Party,
  type AccountingAccount,
  type Invoice,
} from '@/api/accounting'
import { toast } from 'sonner'

function fmt(v: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

export function PaymentsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [payments, setPayments] = useState<Payment[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [accounts, setAccounts] = useState<AccountingAccount[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formType, setFormType] = useState<'Receive' | 'Pay'>('Receive')
  const [formParty, setFormParty] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formAccount, setFormAccount] = useState('')
  const [formPaymentAccount, setFormPaymentAccount] = useState('')
  const [formAmount, setFormAmount] = useState(0)
  const [formInvoice, setFormInvoice] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      listPayments(orgId),
      listParties(orgId),
      listAccounts(orgId, { is_group: false }),
      listInvoices(orgId, { submitted: true }),
    ]).then(([pay, par, acc, inv]) => {
      setPayments(pay.data)
      setParties(par.data)
      setAccounts(acc.data)
      setInvoices(inv.data.filter((i: Invoice) => i.outstanding_amount > 0))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId])

  const handleCreate = async () => {
    if (!formParty || !formAccount || !formPaymentAccount || formAmount <= 0) {
      toast.error(t('accounting.payments.fillRequired', 'Fill all required fields'))
      return
    }
    setSaving(true)
    try {
      const allocations = formInvoice ? [{ invoice_id: formInvoice, amount: formAmount }] : []
      await createPayment(orgId, {
        party_id: formParty,
        date: new Date(formDate).toISOString(),
        payment_type: formType,
        account_id: formAccount,
        payment_account_id: formPaymentAccount,
        amount: formAmount,
        allocations,
      })
      toast.success(t('accounting.payments.created', 'Payment created'))
      setShowCreate(false)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (id: string) => {
    try {
      await submitPayment(orgId, id)
      toast.success(t('accounting.payments.submitted', 'Payment submitted'))
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelPayment(orgId, id)
      toast.success(t('accounting.payments.cancelled', 'Payment cancelled'))
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('accounting.payments.title', 'Payments')}</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('accounting.payments.new', 'New Payment')}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">{t('accounting.payments.create', 'Create Payment')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formType} onChange={e => setFormType(e.target.value as any)}>
              <option value="Receive">{t('accounting.receive', 'Receive')}</option>
              <option value="Pay">{t('accounting.pay', 'Pay')}</option>
            </select>
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formParty} onChange={e => setFormParty(e.target.value)}>
              <option value="">{t('accounting.payments.selectParty', 'Select party...')}</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formAccount} onChange={e => setFormAccount(e.target.value)}>
              <option value="">{t('accounting.payments.fromAccount', 'From account...')}</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formPaymentAccount} onChange={e => setFormPaymentAccount(e.target.value)}>
              <option value="">{t('accounting.payments.toAccount', 'To account...')}</option>
              {accounts.filter(a => a.account_type === 'Cash' || a.account_type === 'Bank').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input type="number" min={0} step={0.01} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.payments.amount', 'Amount')} value={formAmount || ''} onChange={e => setFormAmount(Number(e.target.value))} />
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formInvoice} onChange={e => setFormInvoice(e.target.value)}>
              <option value="">{t('accounting.payments.againstInvoice', 'Against invoice (optional)')}</option>
              {invoices.map(i => <option key={i.id} value={i.id}>{i.number} — {fmt(i.outstanding_amount)}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted transition-colors">{t('common.cancel', 'Cancel')}</button>
            <button onClick={handleCreate} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{saving ? t('common.saving', 'Saving...') : t('common.create', 'Create')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted" />)}
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t('accounting.payments.empty', 'No payments yet')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">#</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.payments.type', 'Type')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.payments.date', 'Date')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.payments.amount', 'Amount')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.payments.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.number}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      p.payment_type === 'Receive' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'
                    }`}>
                      {p.payment_type === 'Receive' ? t('accounting.receive', 'Receive') : t('accounting.pay', 'Pay')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.date).toLocaleDateString('ru-RU')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(p.amount)}</td>
                  <td className="px-4 py-3">
                    {p.cancelled ? (
                      <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">{t('accounting.cancelled', 'Cancelled')}</span>
                    ) : p.submitted ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">{t('accounting.submitted', 'Submitted')}</span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">{t('accounting.draft', 'Draft')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!p.submitted && !p.cancelled && (
                        <button onClick={() => handleSubmit(p.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Submit"><Send className="h-4 w-4" /></button>
                      )}
                      {p.submitted && !p.cancelled && (
                        <button onClick={() => handleCancel(p.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Cancel"><X className="h-4 w-4" /></button>
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
