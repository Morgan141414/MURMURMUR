import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Download, Filter } from 'lucide-react'
import { listInvoices, createInvoice, submitInvoice, cancelInvoice, listParties, listItems, listAccounts, type Invoice, type Party, type AccItem, type AccountingAccount } from '@/api/accounting'
import { AccPageHeader } from '../components/AccPageHeader'
import { AccButton } from '../components/AccButton'
import { AccStatusPill } from '../components/AccStatusPill'
import { AccList, type AccColumn } from '../components/AccList'
import { toast } from 'sonner'

type InvoiceType = 'SalesInvoice' | 'PurchaseInvoice'

const fmt = (n: number | string) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))

export function InvoiceListView({ orgId, invoiceType }: { orgId: string; invoiceType: InvoiceType }) {
  const { t } = useTranslation()
  const isSales = invoiceType === 'SalesInvoice'
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [parties, setParties] = useState<Party[]>([])
  const [items, setItems] = useState<AccItem[]>([])
  const [accounts, setAccounts] = useState<AccountingAccount[]>([])

  const load = () => {
    setLoading(true)
    listInvoices(orgId, { invoice_type: invoiceType })
      .then((r) => setInvoices(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId, invoiceType])

  useEffect(() => {
    if (!showForm) return
    Promise.all([listParties(orgId), listItems(orgId), listAccounts(orgId)])
      .then(([p, i, a]) => { setParties(p.data); setItems(i.data); setAccounts(a.data) })
  }, [showForm, orgId])

  const statusLabel = (inv: Invoice) => {
    if (inv.cancelled) return 'Cancelled'
    if (inv.is_return) return 'Return'
    if (inv.submitted) {
      const out = Number(inv.outstanding_amount ?? 0)
      const grand = Number(inv.grand_total ?? 0)
      if (out <= 0) return 'Paid'
      if (out < grand) return 'Partly Paid'
      return 'Unpaid'
    }
    return 'Draft'
  }

  const columns: AccColumn[] = [
    {
      key: 'number', label: t('accounting.invoice.name', 'Name'), width: 1.5,
      render: (v: string) => <span className="font-medium" style={{ color: 'var(--acc-blue-500)' }}>{v}</span>,
    },
    { key: 'party_name', label: isSales ? 'Customer' : 'Supplier', width: 1.5 },
    { key: 'date', label: 'Date', width: 1, render: (v: string) => v?.slice(0, 10) ?? '—' },
    { key: 'grand_total', label: 'Grand Total', width: 1, align: 'right', render: (v: any) => <span className="font-medium tabular-nums">{fmt(v)}</span> },
    { key: 'outstanding_amount', label: 'Outstanding', width: 1, align: 'right', render: (v: any) => <span className="tabular-nums" style={{ color: Number(v) > 0 ? 'var(--acc-orange-500)' : 'var(--acc-gray-400)' }}>{fmt(v)}</span> },
    { key: '_status', label: 'Status', width: 0.8, render: (_: any, row: Invoice) => <AccStatusPill status={statusLabel(row)} /> },
  ]

  const title = isSales ? t('accounting.nav.salesInvoices', 'Sales Invoices') : t('accounting.nav.purchaseInvoices', 'Purchase Invoices')

  return (
    <div className="flex flex-col h-full">
      <AccPageHeader title={title}>
        <AccButton variant="icon" title="Filter"><Filter size={14} /></AccButton>
        <AccButton variant="icon" title="Export"><Download size={14} /></AccButton>
        <AccButton variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New</AccButton>
      </AccPageHeader>

      {showForm ? (
        <InvoiceForm orgId={orgId} invoiceType={invoiceType} parties={parties} items={items} accounts={accounts}
          onSave={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      ) : loading ? (
        <div className="flex-1 p-5 space-y-1.5 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded h-11" style={{ background: 'var(--acc-gray-100)' }} />
          ))}
        </div>
      ) : (
        <AccList columns={columns} data={invoices}
          emptyTitle={t('accounting.invoice.noEntries', 'No invoices yet')}
          emptyAction={{ label: 'Create Invoice', onClick: () => setShowForm(true) }}
          onRowClick={(row) => {
            const st = statusLabel(row)
            if (st === 'Draft') {
              submitInvoice(orgId, row.id).then(() => { toast.success('Submitted'); load() }).catch((e) => toast.error(e?.response?.data?.detail || 'Error'))
            } else if (st === 'Unpaid' || st === 'Partly Paid') {
              cancelInvoice(orgId, row.id).then(() => { toast.success('Cancelled'); load() }).catch((e) => toast.error(e?.response?.data?.detail || 'Error'))
            }
          }}
        />
      )}
    </div>
  )
}

function InvoiceForm({ orgId, invoiceType, parties, items, accounts, onSave, onCancel }: {
  orgId: string; invoiceType: InvoiceType; parties: Party[]; items: AccItem[]; accounts: AccountingAccount[]; onSave: () => void; onCancel: () => void
}) {
  const { t } = useTranslation()
  const [partyId, setPartyId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [lineItems, setLineItems] = useState([{ item_id: '', quantity: 1, rate: 0 }])
  const [saving, setSaving] = useState(false)

  const addRow = () => setLineItems([...lineItems, { item_id: '', quantity: 1, rate: 0 }])
  const removeRow = (idx: number) => { if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== idx)) }
  const updateRow = (idx: number, field: string, value: any) => {
    const next = [...lineItems]
    ;(next[idx] as any)[field] = value
    if (field === 'item_id') {
      const item = items.find((i) => i.id === value)
      if (item) next[idx].rate = Number(item.rate ?? 0)
    }
    setLineItems(next)
  }

  const grandTotal = lineItems.reduce((s, r) => s + r.quantity * r.rate, 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      await createInvoice(orgId, {
        invoice_type: invoiceType,
        party_id: partyId || undefined,
        account_id: accountId || undefined,
        date,
        items: lineItems.filter((l) => l.item_id).map((l) => ({ item_id: l.item_id, quantity: l.quantity, rate: l.rate })),
      })
      toast.success('Invoice created')
      onSave()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--acc-gray-25)' }}>
      <div className="mx-auto p-6" style={{ maxWidth: 'var(--acc-form-w)' }}>
        <div className="acc-form-card space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="acc-label">{invoiceType === 'SalesInvoice' ? 'Customer' : 'Supplier'}</label>
              <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="acc-input">
                <option value="">— Select —</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="acc-label">Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="acc-input">
                <option value="">— Select —</option>
                {accounts.filter(a => !a.is_group).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="acc-label">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="acc-input" />
            </div>
          </div>

          {/* Line items */}
          <div className="acc-table">
            <div className="acc-table-head" style={{ gridTemplateColumns: '2fr 0.8fr 1fr 1fr 32px' }}>
              <span>Item</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Amount</span><span />
            </div>
            {lineItems.map((row, idx) => (
              <div key={idx} className="acc-table-row" style={{ gridTemplateColumns: '2fr 0.8fr 1fr 1fr 32px' }}>
                <select value={row.item_id} onChange={(e) => updateRow(idx, 'item_id', e.target.value)} className="acc-input" style={{ border: 'none', background: 'transparent', padding: '0 4px' }}>
                  <option value="">—</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input type="number" value={row.quantity} onChange={(e) => updateRow(idx, 'quantity', Number(e.target.value))} className="acc-input text-right" style={{ border: 'none', background: 'transparent' }} />
                <input type="number" value={row.rate} onChange={(e) => updateRow(idx, 'rate', Number(e.target.value))} className="acc-input text-right" style={{ border: 'none', background: 'transparent' }} />
                <span className="flex items-center justify-end text-[13px] font-medium tabular-nums">{fmt(row.quantity * row.rate)}</span>
                <button onClick={() => removeRow(idx)} className="text-[16px] opacity-30 hover:opacity-70" title="Remove">&times;</button>
              </div>
            ))}
            <button onClick={addRow} className="flex items-center gap-1 px-3 py-2 text-[12px] w-full" style={{ color: 'var(--acc-gray-400)' }}>
              <Plus size={14} /> Add Row
            </button>
          </div>

          {/* Total */}
          <div className="acc-totals">
            <div className="text-right">
              <p className="acc-totals-label">Grand Total</p>
              <p className="acc-totals-value">{fmt(grandTotal)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--acc-gray-200)' }}>
            <AccButton onClick={onCancel}>Cancel</AccButton>
            <AccButton variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </AccButton>
          </div>
        </div>
      </div>
    </div>
  )
}
