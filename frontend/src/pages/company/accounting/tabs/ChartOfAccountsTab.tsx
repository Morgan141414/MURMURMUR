import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronDown, Plus, Calculator } from 'lucide-react'
import { getAccountTree, createAccount, type AccountingAccount } from '@/api/accounting'
import { toast } from 'sonner'

function fmt(v: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

const rootTypeColors: Record<string, string> = {
  Asset: 'text-blue-600 bg-blue-500/10',
  Liability: 'text-orange-600 bg-orange-500/10',
  Equity: 'text-violet-600 bg-violet-500/10',
  Income: 'text-emerald-600 bg-emerald-500/10',
  Expense: 'text-red-600 bg-red-500/10',
}

function AccountNode({ account, level, orgId, onRefresh }: { account: AccountingAccount; level: number; orgId: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(level < 1)
  const children = account.children ?? []

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-2 hover:bg-accent/50 transition-colors cursor-pointer"
        style={{ paddingLeft: `${level * 20 + 16}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {children.length > 0 ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${rootTypeColors[account.root_type] || ''}`}>
          {account.root_type}
        </span>
        <span className={`text-sm ${account.is_group ? 'font-semibold' : ''}`}>{account.name}</span>
        {account.account_type && (
          <span className="text-xs text-muted-foreground">({account.account_type})</span>
        )}
        <span className="ml-auto text-sm tabular-nums text-muted-foreground">{fmt(account.balance)}</span>
      </div>
      {expanded && children.map(child => (
        <AccountNode key={child.id} account={child} level={level + 1} orgId={orgId} onRefresh={onRefresh} />
      ))}
    </div>
  )
}

export function ChartOfAccountsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [tree, setTree] = useState<AccountingAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formRootType, setFormRootType] = useState('Asset')
  const [formType, setFormType] = useState('')
  const [formIsGroup, setFormIsGroup] = useState(false)

  const load = () => {
    setLoading(true)
    getAccountTree(orgId).then(r => setTree(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orgId])

  const handleCreate = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      await createAccount(orgId, {
        name: formName,
        root_type: formRootType,
        account_type: formType || undefined,
        is_group: formIsGroup,
      })
      toast.success(t('accounting.accounts.created', 'Account created'))
      setShowCreate(false)
      setFormName('')
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
        <h3 className="text-lg font-semibold">{t('accounting.accounts.title', 'Chart of Accounts')}</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          {t('accounting.accounts.new', 'New Account')}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.accounts.name', 'Account name')} value={formName} onChange={e => setFormName(e.target.value)} />
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formRootType} onChange={e => setFormRootType(e.target.value)}>
              {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map(rt => <option key={rt} value={rt}>{rt}</option>)}
            </select>
            <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t('accounting.accounts.type', 'Account type (optional)')} value={formType} onChange={e => setFormType(e.target.value)} />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formIsGroup} onChange={e => setFormIsGroup(e.target.checked)} className="rounded border-input" />
                {t('accounting.accounts.isGroup', 'Is Group')}
              </label>
              <div className="ml-auto flex gap-2">
                <button onClick={() => setShowCreate(false)} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted transition-colors">{t('common.cancel', 'Cancel')}</button>
                <button onClick={handleCreate} disabled={saving} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{t('common.create', 'Create')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-1 animate-pulse">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 rounded bg-muted" />)}</div>
      ) : tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calculator className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t('accounting.accounts.empty', 'No accounts yet. Run setup first.')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {tree.map(acc => (
            <AccountNode key={acc.id} account={acc} level={0} orgId={orgId} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  )
}
