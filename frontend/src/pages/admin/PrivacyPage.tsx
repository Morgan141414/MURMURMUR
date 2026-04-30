import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useOrgStore } from '@/stores/orgStore'
import { listPrivacyRules, createPrivacyRule, deletePrivacyRule } from '@/api/privacy'
import type { PrivacyRule } from '@/types'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

export default function PrivacyPage() {
  const { t } = useTranslation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const [rules, setRules] = useState<PrivacyRule[]>([])
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState('app_name')
  const [matchType, setMatchType] = useState('contains')
  const [pattern, setPattern] = useState('')
  const [action, setAction] = useState('redact')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const r = await listPrivacyRules(orgId)
      setRules(r.data)
    } catch {
      toast.error(t('admin.privacyLoadError'))
    } finally {
      setLoading(false)
    }
  }, [orgId, t])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!orgId || !pattern.trim()) return
    setCreating(true)
    try {
      await createPrivacyRule(orgId, { target, match_type: matchType, pattern: pattern.trim(), action })
      setPattern('')
      toast.success(t('admin.ruleCreated'))
      load()
    } catch {
      toast.error(t('admin.ruleCreateError'))
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!orgId) return
    try {
      await deletePrivacyRule(orgId, id)
      toast.success(t('admin.ruleDeleted'))
      load()
    } catch {
      toast.error(t('admin.ruleDeleteError'))
    }
  }

  if (!orgId) {
    return (
      <div className="page-enter">
        <PageHeader title={t('admin.privacyTab')} />
        <p className="text-sm text-muted-foreground">{t('admin.noOrg')}</p>
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader title={t('admin.privacyRules')} description={t('admin.privacyRulesConfig')} />

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('admin.createRule')}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 mb-3">
          <select value={target} onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="app_name">app_name</option>
            <option value="window_title">window_title</option>
          </select>
          <select value={matchType} onChange={(e) => setMatchType(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="equals">equals</option>
            <option value="contains">contains</option>
            <option value="regex">regex</option>
          </select>
          <input placeholder={t('admin.patternPlaceholder')} value={pattern} onChange={(e) => setPattern(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <select value={action} onChange={(e) => setAction(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="redact">redact</option>
            <option value="ignore">ignore</option>
          </select>
        </div>
        <button onClick={handleCreate} disabled={creating || !pattern.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('admin.createRule')}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rules.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">{t('admin.noRules')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('admin.target')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('admin.matchType')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('admin.pattern')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{t('admin.action')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule: Record<string, unknown>) => (
                <tr key={String(rule.id)} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-2 text-foreground">{String(rule.target)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{String(rule.match_type)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground">{String(rule.pattern)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{String(rule.action)}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleDelete(String(rule.id))} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
