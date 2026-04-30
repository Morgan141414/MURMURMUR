import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { listItems, createItem, listAccounts, type AccItem, type AccountingAccount } from '@/api/accounting'
import { AccPageHeader } from '../components/AccPageHeader'
import { AccButton } from '../components/AccButton'
import { AccList, type AccColumn } from '../components/AccList'
import { toast } from 'sonner'

const fmt = (n: number | string) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))

export function ItemsView({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<AccItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [accounts, setAccounts] = useState<AccountingAccount[]>([])

  const load = () => {
    setLoading(true)
    listItems(orgId).then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId])
  useEffect(() => { if (showForm) listAccounts(orgId).then((r) => setAccounts(r.data)) }, [showForm, orgId])

  const columns: AccColumn[] = [
    { key: 'name', label: 'Name', width: 2, render: (v: string) => <span className="font-medium" style={{ color: 'var(--acc-blue-500)' }}>{v}</span> },
    { key: 'item_type', label: 'Type', width: 1, render: (v: string) => <span className="acc-pill" style={{ background: v === 'Product' ? 'var(--acc-blue-100)' : 'var(--acc-green-100)', color: v === 'Product' ? 'var(--acc-blue-600)' : 'var(--acc-green-600)' }}>{v}</span> },
    { key: 'for_type', label: 'For', width: 1 },
    { key: 'rate', label: 'Rate', width: 1, align: 'right', render: (v: any) => <span className="tabular-nums">{fmt(v ?? 0)}</span> },
  ]

  return (
    <div className="flex flex-col h-full">
      <AccPageHeader title={t('accounting.nav.items', 'Items')}>
        <AccButton variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New</AccButton>
      </AccPageHeader>

      {showForm ? (
        <ItemForm orgId={orgId} accounts={accounts} onSave={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      ) : loading ? (
        <div className="flex-1 p-5 space-y-1.5 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded h-11" style={{ background: 'var(--acc-gray-100)' }} />)}
        </div>
      ) : (
        <AccList columns={columns} data={items} emptyTitle="No items yet" emptyAction={{ label: 'Create Item', onClick: () => setShowForm(true) }} />
      )}
    </div>
  )
}

function ItemForm({ orgId, accounts, onSave, onCancel }: { orgId: string; accounts: AccountingAccount[]; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [itemType, setItemType] = useState('Product')
  const [rate, setRate] = useState(0)
  const [incomeAccountId, setIncomeAccountId] = useState('')
  const [expenseAccountId, setExpenseAccountId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createItem(orgId, { name, item_type: itemType, rate, income_account_id: incomeAccountId || undefined, expense_account_id: expenseAccountId || undefined })
      toast.success('Created')
      onSave()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--acc-gray-25)' }}>
      <div className="mx-auto p-6" style={{ maxWidth: 'var(--acc-form-w)' }}>
        <div className="acc-form-card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="acc-label">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="acc-input" autoFocus /></div>
            <div><label className="acc-label">Type</label>
              <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="acc-input">
                <option value="Product">Product</option><option value="Service">Service</option>
              </select>
            </div>
          </div>
          <div><label className="acc-label">Rate</label>
            <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="acc-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="acc-label">Income Account</label>
              <select value={incomeAccountId} onChange={(e) => setIncomeAccountId(e.target.value)} className="acc-input">
                <option value="">—</option>
                {accounts.filter(a => !a.is_group).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><label className="acc-label">Expense Account</label>
              <select value={expenseAccountId} onChange={(e) => setExpenseAccountId(e.target.value)} className="acc-input">
                <option value="">—</option>
                {accounts.filter(a => !a.is_group).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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
