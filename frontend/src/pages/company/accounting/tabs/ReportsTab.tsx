import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, FileSpreadsheet } from 'lucide-react'
import { getGeneralLedger, getTrialBalance, getProfitAndLoss, getBalanceSheet } from '@/api/accounting'
import { toast } from 'sonner'

function fmt(v: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

type ReportType = 'general-ledger' | 'trial-balance' | 'profit-loss' | 'balance-sheet'

export function ReportsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [activeReport, setActiveReport] = useState<ReportType>('general-ledger')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const reports = [
    { value: 'general-ledger' as const, label: t('accounting.reports.generalLedger', 'General Ledger') },
    { value: 'trial-balance' as const, label: t('accounting.reports.trialBalance', 'Trial Balance') },
    { value: 'profit-loss' as const, label: t('accounting.reports.profitLoss', 'Profit & Loss') },
    { value: 'balance-sheet' as const, label: t('accounting.reports.balanceSheet', 'Balance Sheet') },
  ]

  const runReport = async () => {
    setLoading(true)
    setData(null)
    try {
      let res
      switch (activeReport) {
        case 'general-ledger':
          res = await getGeneralLedger(orgId, { from_date: fromDate || undefined, to_date: toDate || undefined })
          break
        case 'trial-balance':
          res = await getTrialBalance(orgId, { from_date: fromDate || undefined, to_date: toDate || undefined })
          break
        case 'profit-loss':
          if (!fromDate) { toast.error(t('accounting.reports.selectDateRange', 'Select date range')); setLoading(false); return }
          res = await getProfitAndLoss(orgId, { from_date: new Date(fromDate).toISOString(), to_date: new Date(toDate).toISOString() })
          break
        case 'balance-sheet':
          res = await getBalanceSheet(orgId, { to_date: new Date(toDate).toISOString() })
          break
      }
      setData(res?.data)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {reports.map(r => (
          <button key={r.value} onClick={() => { setActiveReport(r.value); setData(null) }} className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${activeReport === r.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{r.label}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {activeReport !== 'balance-sheet' && (
          <input type="date" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        )}
        <input type="date" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
        <button onClick={runReport} disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {loading ? t('accounting.reports.loading', 'Loading...') : t('accounting.reports.run', 'Run Report')}
        </button>
      </div>

      {data && activeReport === 'general-ledger' && Array.isArray(data) && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.reports.date', 'Date')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.reports.account', 'Account')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.reports.party', 'Party')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.journal.debit', 'Debit')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.journal.credit', 'Credit')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.reports.balance', 'Balance')}</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.reports.reference', 'Reference')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(row.date).toLocaleDateString('ru-RU')}</td>
                  <td className="px-4 py-2.5">{row.account_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.party_name || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.debit > 0 ? fmt(row.debit) : ''}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.credit > 0 ? fmt(row.credit) : ''}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(row.balance)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.reference_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('accounting.reports.noData', 'No data for selected period')}</p>
          )}
        </div>
      )}

      {data && activeReport === 'trial-balance' && Array.isArray(data) && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{t('accounting.reports.account', 'Account')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.reports.openingDebit', 'Opening Dr')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.reports.openingCredit', 'Opening Cr')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.journal.debit', 'Debit')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.journal.credit', 'Credit')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.reports.closingDebit', 'Closing Dr')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{t('accounting.reports.closingCredit', 'Closing Cr')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-2.5">{row.account_name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.opening_debit > 0 ? fmt(row.opening_debit) : ''}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.opening_credit > 0 ? fmt(row.opening_credit) : ''}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.debit > 0 ? fmt(row.debit) : ''}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.credit > 0 ? fmt(row.credit) : ''}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.closing_debit > 0 ? fmt(row.closing_debit) : ''}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.closing_credit > 0 ? fmt(row.closing_credit) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && activeReport === 'profit-loss' && data.income && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h4 className="text-sm font-semibold text-emerald-600 mb-3">{t('accounting.reports.income', 'Income')}</h4>
            <div className="space-y-1">
              {data.income.map((row: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{row.account_name}</span>
                  <span className="tabular-nums">{fmt(row.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                <span>{t('accounting.reports.totalIncome', 'Total Income')}</span>
                <span className="tabular-nums text-emerald-600">{fmt(data.total_income)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h4 className="text-sm font-semibold text-red-600 mb-3">{t('accounting.reports.expenses', 'Expenses')}</h4>
            <div className="space-y-1">
              {data.expenses.map((row: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{row.account_name}</span>
                  <span className="tabular-nums">{fmt(row.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                <span>{t('accounting.reports.totalExpenses', 'Total Expenses')}</span>
                <span className="tabular-nums text-red-600">{fmt(data.total_expenses)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border-2 border-primary bg-card p-5">
            <div className="flex justify-between text-lg font-bold">
              <span>{t('accounting.reports.netProfit', 'Net Profit')}</span>
              <span className={`tabular-nums ${data.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(data.net_profit)}</span>
            </div>
          </div>
        </div>
      )}

      {data && activeReport === 'balance-sheet' && data.assets && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h4 className="text-sm font-semibold text-blue-600 mb-3">{t('accounting.reports.assets', 'Assets')}</h4>
            <div className="space-y-1">
              {data.assets.map((row: any, i: number) => (
                <div key={i} className="flex justify-between text-sm"><span>{row.account_name}</span><span className="tabular-nums">{fmt(row.balance)}</span></div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                <span>{t('accounting.reports.totalAssets', 'Total Assets')}</span>
                <span className="tabular-nums text-blue-600">{fmt(data.total_assets)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h4 className="text-sm font-semibold text-orange-600 mb-3">{t('accounting.reports.liabilities', 'Liabilities')}</h4>
              <div className="space-y-1">
                {data.liabilities.map((row: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm"><span>{row.account_name}</span><span className="tabular-nums">{fmt(row.balance)}</span></div>
                ))}
                <div className="flex justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                  <span>{t('accounting.reports.totalLiabilities', 'Total Liabilities')}</span>
                  <span className="tabular-nums text-orange-600">{fmt(data.total_liabilities)}</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h4 className="text-sm font-semibold text-violet-600 mb-3">{t('accounting.reports.equity', 'Equity')}</h4>
              <div className="space-y-1">
                {data.equity.map((row: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm"><span>{row.account_name}</span><span className="tabular-nums">{fmt(row.balance)}</span></div>
                ))}
                <div className="flex justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                  <span>{t('accounting.reports.totalEquity', 'Total Equity')}</span>
                  <span className="tabular-nums text-violet-600">{fmt(data.total_equity)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t('accounting.reports.selectAndRun', 'Select a report and click "Run Report"')}</p>
        </div>
      )}
    </div>
  )
}
