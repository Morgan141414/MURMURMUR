import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { listParties, createParty, type Party } from '@/api/accounting'
import { AccPageHeader } from '../components/AccPageHeader'
import { AccButton } from '../components/AccButton'
import { AccList, type AccColumn } from '../components/AccList'
import { toast } from 'sonner'

type PartyFilter = 'Customer' | 'Supplier' | 'Both' | 'all'

const fmt = (n: number | string) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))

export function PartyListView({ orgId, filter }: { orgId: string; filter: PartyFilter }) {
  const { t } = useTranslation()
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    listParties(orgId, filter !== 'all' ? { role: filter } : undefined)
      .then((r) => setParties(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId, filter])

  const columns: AccColumn[] = [
    { key: 'name', label: 'Name', width: 2, render: (v: string) => <span className="font-medium" style={{ color: 'var(--acc-blue-500)' }}>{v}</span> },
    { key: 'role', label: 'Role', width: 1, render: (v: string) => <span className="acc-pill" style={{ background: v === 'Customer' ? 'var(--acc-blue-100)' : v === 'Supplier' ? 'var(--acc-pink-100)' : 'var(--acc-gray-100)', color: v === 'Customer' ? 'var(--acc-blue-600)' : v === 'Supplier' ? 'var(--acc-pink-600)' : 'var(--acc-gray-600)' }}>{v}</span> },
    { key: 'email', label: 'Email', width: 1.5 },
    { key: 'phone', label: 'Phone', width: 1 },
    { key: 'outstanding_amount', label: 'Outstanding', width: 1, align: 'right', render: (v: any) => <span className="tabular-nums" style={{ color: Number(v) > 0 ? 'var(--acc-orange-500)' : 'var(--acc-gray-400)' }}>{fmt(v ?? 0)}</span> },
  ]

  const titleMap: Record<string, string> = { Customer: 'Customers', Supplier: 'Suppliers', all: 'Party', Both: 'Party' }

  return (
    <div className="flex flex-col h-full">
      <AccPageHeader title={titleMap[filter] ?? 'Party'}>
        <AccButton variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New</AccButton>
      </AccPageHeader>

      {showForm ? (
        <PartyForm orgId={orgId} defaultRole={filter !== 'all' ? filter : undefined} onSave={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      ) : loading ? (
        <div className="flex-1 p-5 space-y-1.5 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded h-11" style={{ background: 'var(--acc-gray-100)' }} />)}
        </div>
      ) : (
        <AccList columns={columns} data={parties} emptyTitle="No parties yet" emptyAction={{ label: 'Create Party', onClick: () => setShowForm(true) }} />
      )}
    </div>
  )
}

function PartyForm({ orgId, defaultRole, onSave, onCancel }: { orgId: string; defaultRole?: string; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState(defaultRole || 'Customer')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [taxId, setTaxId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createParty(orgId, { name, role, email: email || undefined, phone: phone || undefined, tax_id: taxId || undefined })
      toast.success('Created')
      onSave()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--acc-gray-25)' }}>
      <div className="mx-auto p-6" style={{ maxWidth: 'var(--acc-form-w)' }}>
        <div className="acc-form-card space-y-4">
          <div><label className="acc-label">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="acc-input" autoFocus /></div>
          <div><label className="acc-label">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="acc-input">
              <option value="Customer">Customer</option><option value="Supplier">Supplier</option><option value="Both">Both</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="acc-label">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} className="acc-input" /></div>
            <div><label className="acc-label">Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="acc-input" /></div>
          </div>
          <div><label className="acc-label">Tax ID</label><input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="acc-input" /></div>
          <div className="flex justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--acc-gray-200)' }}>
            <AccButton onClick={onCancel}>Cancel</AccButton>
            <AccButton variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</AccButton>
          </div>
        </div>
      </div>
    </div>
  )
}
