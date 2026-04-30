import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronRight, ChevronDown, Folder, Circle } from 'lucide-react'
import { getAccountTree, createAccount, type AccountingAccount } from '@/api/accounting'
import { AccPageHeader } from '../components/AccPageHeader'
import { AccButton } from '../components/AccButton'
import { toast } from 'sonner'

const ROOT_COLORS: Record<string, string> = {
  Asset: '#2490EF',
  Liability: '#EC4899',
  Equity: '#22C55E',
  Income: '#16A34A',
  Expense: '#F97316',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export function ChartOfAccountsView({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [accounts, setAccounts] = useState<AccountingAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [formParent, setFormParent] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    getAccountTree(orgId)
      .then((r) => {
        setAccounts(r.data)
        setExpanded(new Set(r.data.filter((a) => !a.parent_account_id).map((a) => a.id)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId])

  const toggle = (id: string) => {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const byParent = new Map<string, AccountingAccount[]>()
  for (const acc of accounts) {
    const pid = acc.parent_account_id || '__root__'
    if (!byParent.has(pid)) byParent.set(pid, [])
    byParent.get(pid)!.push(acc)
  }

  const renderNode = (account: AccountingAccount, level: number): React.ReactNode => {
    const children = byParent.get(account.id)
    const hasChildren = children && children.length > 0
    const isExpanded = expanded.has(account.id)
    const isRoot = level === 0
    const color = ROOT_COLORS[account.root_type ?? ''] ?? 'var(--acc-gray-500)'

    return (
      <div key={account.id}>
        <div
          className="flex items-center gap-2 group cursor-pointer transition-colors"
          style={{
            paddingLeft: `${16 + level * 24}px`,
            paddingRight: 16,
            height: 'var(--acc-row-h)',
            borderBottom: '1px solid var(--acc-gray-100)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--acc-gray-50)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          onClick={() => hasChildren && toggle(account.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} style={{ color: 'var(--acc-gray-400)' }} /> : <ChevronRight size={14} style={{ color: 'var(--acc-gray-400)' }} />
          ) : (
            <Circle size={7} style={{ color }} fill={color} className="ml-0.5 mr-0.5" />
          )}

          {hasChildren && <Folder size={14} style={{ color }} />}

          <span className="flex-1" style={{
            fontSize: isRoot ? 14 : 13,
            fontWeight: isRoot ? 600 : 400,
            color: isRoot ? color : 'var(--acc-gray-700)',
          }}>
            {account.name}
          </span>

          {isRoot && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: `${color}15`, color }}>
              {account.root_type}
            </span>
          )}

          {Number(account.balance) !== 0 && !isRoot && (
            <span className="text-[12px] tabular-nums" style={{ color: 'var(--acc-gray-500)' }}>
              {fmt(Number(account.balance))}
            </span>
          )}

          <div className="hidden group-hover:flex items-center">
            <button
              onClick={(e) => { e.stopPropagation(); setFormParent(account.id); setShowForm(true) }}
              className="acc-btn" style={{ height: 24, fontSize: 11, padding: '0 8px', border: 'none', background: 'var(--acc-gray-100)' }}
            >
              + Add
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && children!.map((child) => renderNode(child, level + 1))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <AccPageHeader title={t('accounting.nav.chartOfAccounts', 'Chart of Accounts')} />
        <div className="flex-1 p-5 space-y-1 animate-pulse">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-10 rounded" style={{ background: 'var(--acc-gray-100)' }} />)}
        </div>
      </div>
    )
  }

  const roots = byParent.get('__root__') ?? []

  return (
    <div className="flex flex-col h-full">
      <AccPageHeader title={t('accounting.nav.chartOfAccounts', 'Chart of Accounts')}>
        <AccButton variant="primary" icon={<Plus size={14} />} onClick={() => { setFormParent(null); setShowForm(true) }}>
          New Account
        </AccButton>
      </AccPageHeader>

      <div className="flex-1 overflow-y-auto">
        {roots.map((root) => renderNode(root, 0))}
        {roots.length === 0 && (
          <div className="acc-empty">
            <div className="acc-empty-bars">{[40, 56, 32, 48].map((h, i) => <div key={i} className="acc-empty-bar" style={{ height: h }} />)}</div>
            <p className="acc-empty-text">No accounts. Run setup first.</p>
          </div>
        )}
      </div>

      {showForm && (
        <AccountFormModal orgId={orgId} parentId={formParent} accounts={accounts}
          onSave={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      )}
    </div>
  )
}

function AccountFormModal({ orgId, parentId, accounts, onSave, onCancel }: {
  orgId: string; parentId: string | null; accounts: AccountingAccount[]; onSave: () => void; onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [rootType, setRootType] = useState('Asset')
  const [isGroup, setIsGroup] = useState(false)
  const [saving, setSaving] = useState(false)

  const parent = parentId ? accounts.find((a) => a.id === parentId) : null

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createAccount(orgId, { name, root_type: parent ? parent.root_type : rootType, parent_account_id: parentId || undefined, is_group: isGroup })
      toast.success('Created')
      onSave()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="acc-modal-overlay" onClick={onCancel}>
      <div className="acc-modal space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--acc-gray-900)' }}>New Account</h3>
        {parent && <p className="text-[12px]" style={{ color: 'var(--acc-gray-500)' }}>Under: <strong>{parent.name}</strong></p>}
        <div><label className="acc-label">Account Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="acc-input" autoFocus /></div>
        {!parent && (
          <div><label className="acc-label">Root Type</label>
            <select value={rootType} onChange={(e) => setRootType(e.target.value)} className="acc-input">
              {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        )}
        <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--acc-gray-600)' }}>
          <input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} /> Is Group
        </label>
        <div className="flex justify-end gap-2 pt-3" style={{ borderTop: '1px solid var(--acc-gray-200)' }}>
          <AccButton onClick={onCancel}>Cancel</AccButton>
          <AccButton variant="primary" onClick={handleSave} disabled={saving}>{saving ? '...' : 'Save'}</AccButton>
        </div>
      </div>
    </div>
  )
}
