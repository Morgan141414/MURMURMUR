import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Download, Filter } from 'lucide-react'
import { listPayments, createPayment, submitPayment, cancelPayment, listParties, listAccounts, listInvoices, type Payment, type Party, type AccountingAccount, type Invoice } from '@/api/accounting'
import { AccPageHeader } from '../components/AccPageHeader'
import { AccButton } from '../components/AccButton'
import { AccStatusPill } from '../components/AccStatusPill'
import { AccList, type AccColumn } from '../components/AccList'
import { toast } from 'sonner'

type PaymentType = 'Receive' | 'Pay'

const fmt = (n: number | string) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))

export function PaymentListView({ orgId, paymentType }: { orgId: string; paymentType: PaymentType }) {
  const { t } = useTranslation()
  const isReceive = paymentType === 'Receive'
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [parties, setParties] = useState<Party[]>([])
  const [accounts, setAccounts] = useState<AccountingAccount[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const load = () => {
    setLoading(true)
    listPayments(orgId, { payment_type: paymentType })
      .then((r) => setPayments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId, paymentType])

  useEffect(() => {
    if (!showForm) return
    Promise.all([
      listParties(orgId),
      listAccounts(orgId),
      listInvoices(orgId, { invoice_type: isReceive ? 'SalesInvoice' : 'PurchaseInvoice' }),
    ]).then(([p, a, inv]) => { setParties(p.data); setAccounts(a.data); setInvoices(inv.data) })
  }, [showForm, orgId])

  const statusLabel = (p: Payment) => {
    if (p.cancelled) return 'Cancelled'
    if (p.submitted) return 'Submitted'
    return 'Draft'
  }

  const columns: AccColumn[] = [
    { key: 'number', label: 'Name', width: 1.5, render: (v: string) => <span className="font-medium" style={{ color: 'var(--acc-blue-500)' }}>{v}</span> },
    { key: 'party_name', label: isReceive ? 'Received From' : 'Paid To', width: 1.5 },
    { key: 'date', label: 'Date', width: 1, render: (v: string) => v?.slice(0, 10) ?? '—' },
    { key: 'amount', label: 'Amount', width: 1, align: 'right', render: (v: any) => <span className="font-medium tabular-nums">{fmt(v)}</span> },
    { key: '_status', label: 'Status', width: 0.8, render: (_: any, row: Payment) => <AccStatusPill status={statusLabel(row)} /> },
  ]

  const title = isReceive ? t('accounting.nav.salesPayments', 'Sales Payments') : t('accounting.nav.purchasePayments', 'Purchase Payments')

  return (
    <div className="flex flex-col h-full">
      <AccPageHeader title={title}>
        <AccButton variant="icon"><Filter size={14} /></AccButton>
        <AccButton variant="icon"><Download size={14} /></AccButton>
        <AccButton variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New</AccButton>
      </AccPageHeader>

      {showForm ? (
        <PaymentForm orgId={orgId} paymentType={paymentType} parties={parties} accounts={accounts} invoices={invoices}
          onSave={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      ) : loading ? (
        <div className="flex-1 p-5 space-y-1.5 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="rounded h-11" style={{ background: 'var(--acc-gray-100)' }} />)}
        </div>
      ) : (
        <AccList columns={columns} data={payments}
          emptyTitle="No payments yet"
          emptyAction={{ label: 'Create Payment', onClick: () => setShowForm(true) }}
          onRowClick={(row) => {
            const st = statusLabel(row)
            if (st === 'Draft') submitPayment(orgId, row.id).then(() => { toast.success('Submitted'); load() }).catch((e) => toast.error(e?.response?.data?.detail || 'Error'))
            else if (st === 'Submitted') cancelPayment(orgId, row.id).then(() => { toast.success('Cancelled'); load() }).catch((e) => toast.error(e?.response?.data?.detail || 'Error'))
          }}
        />
      )}
    </div>
  )
}

function PaymentForm({ orgId, paymentType, parties, accounts, invoices, onSave, onCancel }: {
  orgId: string; paymentType: PaymentType; parties: Party[]; accounts: AccountingAccount[]; invoices: Invoice[]; onSave: () => void; onCancel: () => void
}) {
  const [partyId, setPartyId] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [forAccountId, setForAccountId] = useState('')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [invoiceId, setInvoiceId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await createPayment(orgId, {
        payment_type: paymentType,
        party_id: partyId || undefined,
        payment_account_id: paymentAccountId || undefined,
        for_account_id: forAccountId || undefined,
        amount, date,
        invoice_id: invoiceId || undefined,
      })
      toast.success('Payment created')
      onSave()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--acc-gray-25)' }}>
      <div className="mx-auto p-6" style={{ maxWidth: 'var(--acc-form-w)' }}>
        <div className="acc-form-card space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="acc-label">{paymentType === 'Receive' ? 'Received From' : 'Paid To'}</label>
              <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="acc-input">
                <option value="">— Select —</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label className="acc-label">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="acc-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="acc-label">Payment Account</label>
              <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className="acc-input">
                <option value="">— Select —</option>
                {accounts.filter(a => !a.is_group).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><label className="acc-label">For Account</label>
              <select value={forAccountId} onChange={(e) => setForAccountId(e.target.value)} className="acc-input">
                <option value="">— Select —</option>
                {accounts.filter(a => !a.is_group).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="acc-label">Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="acc-input text-right" />
            </div>
            <div><label className="acc-label">Against Invoice</label>
              <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} className="acc-input">
                <option value="">— None —</option>
                {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.number} ({fmt(inv.grand_total)})</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--acc-gray-200)' }}>
            <AccButton onClick={onCancel}>Cancel</AccButton>
            <AccButton variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</AccButton>
          </div>
        </div>
      </div>
    </div>
  )
}
