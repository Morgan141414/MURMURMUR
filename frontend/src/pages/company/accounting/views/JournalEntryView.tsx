import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Download } from 'lucide-react'
import { listJournalEntries, createJournalEntry, submitJournalEntry, cancelJournalEntry, listAccounts, type JournalEntry, type AccountingAccount } from '@/api/accounting'
import { AccPageHeader } from '../components/AccPageHeader'
import { AccButton } from '../components/AccButton'
import { AccStatusPill } from '../components/AccStatusPill'
import { AccList, type AccColumn } from '../components/AccList'
import { toast } from 'sonner'

const fmt = (n: number | string) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))

export function JournalEntryView({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [accounts, setAccounts] = useState<AccountingAccount[]>([])

  const load = () => {
    setLoading(true)
    listJournalEntries(orgId).then((r) => setEntries(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId])
  useEffect(() => { if (showForm) listAccounts(orgId).then((r) => setAccounts(r.data)) }, [showForm, orgId])

  const statusLabel = (je: JournalEntry) => {
    if (je.cancelled) return 'Cancelled'
    if (je.submitted) return 'Submitted'
    return 'Draft'
  }

  const columns: AccColumn[] = [
    { key: 'number', label: 'Name', width: 1.5, render: (v: string) => <span className="font-medium" style={{ color: 'var(--acc-blue-500)' }}>{v}</span> },
    { key: 'entry_type', label: 'Entry Type', width: 1 },
    { key: 'date', label: 'Date', width: 1, render: (v: string) => v?.slice(0, 10) ?? '—' },
    { key: 'total_debit', label: 'Total Debit', width: 1, align: 'right', render: (v: any) => <span className="font-medium tabular-nums">{fmt(v ?? 0)}</span> },
    { key: '_status', label: 'Status', width: 0.8, render: (_: any, row: JournalEntry) => <AccStatusPill status={statusLabel(row)} /> },
  ]

  return (
    <div className="flex flex-col h-full">
      <AccPageHeader title={t('accounting.nav.journalEntry', 'Journal Entry')}>
        <AccButton variant="icon"><Download size={14} /></AccButton>
        <AccButton variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New</AccButton>
      </AccPageHeader>

      {showForm ? (
        <JournalEntryForm orgId={orgId} accounts={accounts} onSave={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      ) : loading ? (
        <div className="flex-1 p-5 space-y-1.5 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded h-11" style={{ background: 'var(--acc-gray-100)' }} />)}
        </div>
      ) : (
        <AccList columns={columns} data={entries}
          emptyTitle="No journal entries yet"
          emptyAction={{ label: 'Create Entry', onClick: () => setShowForm(true) }}
          onRowClick={(row) => {
            const st = statusLabel(row)
            if (st === 'Draft') submitJournalEntry(orgId, row.id).then(() => { toast.success('Submitted'); load() }).catch((e) => toast.error(e?.response?.data?.detail || 'Error'))
            else if (st === 'Submitted') cancelJournalEntry(orgId, row.id).then(() => { toast.success('Cancelled'); load() }).catch((e) => toast.error(e?.response?.data?.detail || 'Error'))
          }}
        />
      )}
    </div>
  )
}

function JournalEntryForm({ orgId, accounts, onSave, onCancel }: { orgId: string; accounts: AccountingAccount[]; onSave: () => void; onCancel: () => void }) {
  const [entryType, setEntryType] = useState('Journal Entry')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState([{ account_id: '', debit: 0, credit: 0 }, { account_id: '', debit: 0, credit: 0 }])
  const [saving, setSaving] = useState(false)

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const addRow = () => setRows([...rows, { account_id: '', debit: 0, credit: 0 }])
  const updateRow = (idx: number, field: string, value: any) => {
    const next = [...rows]; (next[idx] as any)[field] = value; setRows(next)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await createJournalEntry(orgId, { entry_type: entryType, date, accounts: rows.filter((r) => r.account_id).map((r) => ({ account_id: r.account_id, debit: r.debit, credit: r.credit })) })
      toast.success('Created')
      onSave()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--acc-gray-25)' }}>
      <div className="mx-auto p-6" style={{ maxWidth: 'var(--acc-form-w)' }}>
        <div className="acc-form-card space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="acc-label">Entry Type</label>
              <select value={entryType} onChange={(e) => setEntryType(e.target.value)} className="acc-input">
                {['Journal Entry', 'Bank Entry', 'Cash Entry', 'Credit Card Entry', 'Debit Note', 'Credit Note', 'Write Off'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div><label className="acc-label">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="acc-input" />
            </div>
          </div>

          <div className="acc-table">
            <div className="acc-table-head" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
              <span>Account</span><span className="text-right">Debit</span><span className="text-right">Credit</span>
            </div>
            {rows.map((row, idx) => (
              <div key={idx} className="acc-table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                <select value={row.account_id} onChange={(e) => updateRow(idx, 'account_id', e.target.value)} className="acc-input" style={{ border: 'none', background: 'transparent' }}>
                  <option value="">—</option>
                  {accounts.filter(a => !a.is_group).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <input type="number" value={row.debit || ''} onChange={(e) => updateRow(idx, 'debit', Number(e.target.value))} className="acc-input text-right" style={{ border: 'none', background: 'transparent' }} placeholder="0.00" />
                <input type="number" value={row.credit || ''} onChange={(e) => updateRow(idx, 'credit', Number(e.target.value))} className="acc-input text-right" style={{ border: 'none', background: 'transparent' }} placeholder="0.00" />
              </div>
            ))}
            <button onClick={addRow} className="flex items-center gap-1 px-3 py-2 text-[12px] w-full" style={{ color: 'var(--acc-gray-400)' }}>
              <Plus size={14} /> Add Row
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-6 text-[13px]" style={{ color: 'var(--acc-gray-600)' }}>
              <span>Debit: <strong className="tabular-nums">{fmt(totalDebit)}</strong></span>
              <span>Credit: <strong className="tabular-nums">{fmt(totalCredit)}</strong></span>
            </div>
            {!isBalanced && <span className="text-[12px] font-medium" style={{ color: 'var(--acc-red-500)' }}>Not balanced</span>}
          </div>

          <div className="flex justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--acc-gray-200)' }}>
            <AccButton onClick={onCancel}>Cancel</AccButton>
            <AccButton variant="primary" onClick={handleSave} disabled={saving || !isBalanced}>{saving ? 'Saving...' : 'Save'}</AccButton>
          </div>
        </div>
      </div>
    </div>
  )
}
