import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Plus, Send, X } from 'lucide-react'
import {
  listJournalEntries,
  createJournalEntry,
  submitJournalEntry,
  cancelJournalEntry,
  listAccounts,
  type JournalEntry,
  type AccountingAccount,
} from '@/api/accounting'
import { toast } from 'sonner'

function fmt(v: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

interface JERow {
  account_id: string
  debit: number
  credit: number
}

export function JournalEntriesTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<AccountingAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formType, setFormType] = useState('Journal Entry')
  const [formRemark, setFormRemark] = useState('')
  const [formRows, setFormRows] = useState<JERow[]>([
    { account_id: '', debit: 0, credit: 0 },
    { account_id: '', debit: 0, credit: 0 },
  ])

  const load = () => {
    setLoading(true)
    Promise.all([
      listJournalEntries(orgId),
      listAccounts(orgId, { is_group: false }),
    ]).then(([je, acc]) => {
      setEntries(je.data)
      setAccounts(acc.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId])

  const totalDebit = formRows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = formRows.reduce((s, r) => s + r.credit, 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  const handleCreate = async () => {
    if (!balanced || formRows.some(r => !r.account_id)) {
      toast.error(t('accounting.journal.mustBalance', 'Debit must equal credit'))
      return
    }
    setSaving(true)
    try {
      await createJournalEntry(orgId, {
        entry_type: formType,
        date: new Date(formDate).toISOString(),
        user_remark: formRemark || undefined,
        accounts: formRows.filter(r => r.debit > 0 || r.credit > 0),
      })
      toast.success(t('accounting.journal.created', 'Journal entry created'))
      setShowCreate(false)
      setFormRows([{ account_id: '', debit: 0, credit: 0 }, { account_id: '', debit: 0, credit: 0 }])
      setFormRemark('')
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
        <h3 className="text-lg font-semibold">{t('accounting.journal.title', 'Journal Entries')}</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          {t('accounting.journal.new', 'New Entry')}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formType} onChange={e => setFormType(e.target.value)}>
              {['Journal Entry', 'Bank Entry', 'Cash Entry', 'Credit Note', 'Debit Note', 'Contra Entry', 'Write Off Entry', 'Opening Entry'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input type="date" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formDate} onChange={e => setFormDate(e.target.value)} />
            <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.journal.remark', 'Remark')} value={formRemark} onChange={e => setFormRemark(e.target.value)} />
          </div>

          <div className="space-y-2">
            {formRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2" value={row.account_id} onChange={e => { const u = [...formRows]; u[idx].account_id = e.target.value; setFormRows(u) }}>
                  <option value="">{t('accounting.journal.selectAccount', 'Select account...')}</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <input type="number" min={0} step={0.01} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.journal.debit', 'Debit')} value={row.debit || ''} onChange={e => { const u = [...formRows]; u[idx].debit = Number(e.target.value); if (u[idx].debit > 0) u[idx].credit = 0; setFormRows(u) }} />
                <div className="flex gap-2">
                  <input type="number" min={0} step={0.01} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.journal.credit', 'Credit')} value={row.credit || ''} onChange={e => { const u = [...formRows]; u[idx].credit = Number(e.target.value); if (u[idx].credit > 0) u[idx].debit = 0; setFormRows(u) }} />
                  {formRows.length > 2 && (
                    <button onClick={() => setFormRows(formRows.filter((_, i) => i !== idx))} className="rounded-lg border border-input px-2 text-muted-foreground hover:text-destructive transition-colors"><X className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <button onClick={() => setFormRows([...formRows, { account_id: '', debit: 0, credit: 0 }])} className="text-sm text-primary hover:underline">+ {t('accounting.journal.addRow', 'Add row')}</button>
              <div className="flex gap-4 text-sm">
                <span className={balanced ? 'text-emerald-600' : 'text-red-600'}>
                  {t('accounting.journal.debit', 'Debit')}: {fmt(totalDebit)}
                </span>
                <span className={balanced ? 'text-emerald-600' : 'text-red-600'}>
                  {t('accounting.journal.credit', 'Credit')}: {fmt(totalCredit)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted transition-colors">{t('common.cancel', 'Cancel')}</button>
            <button onClick={handleCreate} disabled={saving || !balanced} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{saving ? t('common.saving', 'Saving...') : t('common.create', 'Create')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted" />)}</div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t('accounting.journal.empty', 'No journal entries yet')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">#</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.journal.entryType', 'Type')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.journal.date', 'Date')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.journal.totalDebit', 'Total Debit')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.journal.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map(je => {
                const total = je.accounts.reduce((s, a) => s + a.debit, 0)
                return (
                  <tr key={je.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{je.number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{je.entry_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(je.date).toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(total)}</td>
                    <td className="px-4 py-3">
                      {je.cancelled ? (
                        <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">{t('accounting.cancelled', 'Cancelled')}</span>
                      ) : je.submitted ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">{t('accounting.submitted', 'Submitted')}</span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">{t('accounting.draft', 'Draft')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!je.submitted && !je.cancelled && (
                          <button onClick={async () => { try { await submitJournalEntry(orgId, je.id); toast.success('Submitted'); load() } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error') } }} className="rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Send className="h-4 w-4" /></button>
                        )}
                        {je.submitted && !je.cancelled && (
                          <button onClick={async () => { try { await cancelJournalEntry(orgId, je.id); toast.success('Cancelled'); load() } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error') } }} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><X className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
