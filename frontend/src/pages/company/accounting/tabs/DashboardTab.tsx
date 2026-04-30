import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { getDashboard, type DashboardSummary } from '@/api/accounting'

function fmt(v: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

export function AccountingDashboardTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getDashboard(orgId)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-card" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const cards = [
    {
      label: t('accounting.dashboard.revenue', 'Total Revenue'),
      value: data.total_revenue,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: t('accounting.dashboard.expenses', 'Total Expenses'),
      value: data.total_expenses,
      icon: TrendingDown,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      label: t('accounting.dashboard.netProfit', 'Net Profit'),
      value: data.net_profit,
      icon: CircleDollarSign,
      color: data.net_profit >= 0 ? 'text-emerald-500' : 'text-red-500',
      bg: data.net_profit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
    {
      label: t('accounting.dashboard.receivable', 'Accounts Receivable'),
      value: data.total_receivable,
      icon: ArrowDownRight,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: t('accounting.dashboard.payable', 'Accounts Payable'),
      value: data.total_payable,
      icon: ArrowUpRight,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      label: t('accounting.dashboard.cashBalance', 'Cash Balance'),
      value: data.cash_balance,
      icon: Wallet,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold tabular-nums">{fmt(value)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold">
              {t('accounting.dashboard.recentInvoices', 'Recent Invoices')}
            </h3>
          </div>
          <div className="divide-y divide-border">
            {data.recent_invoices.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                {t('accounting.dashboard.noInvoices', 'No invoices yet')}
              </p>
            ) : (
              data.recent_invoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.invoice_type === 'Sales' ? t('accounting.sales', 'Sales') : t('accounting.purchase', 'Purchase')}
                      {' · '}
                      {new Date(inv.date).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">{fmt(inv.grand_total)}</p>
                    <p className={`text-xs ${inv.submitted ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {inv.submitted ? t('accounting.submitted', 'Submitted') : t('accounting.draft', 'Draft')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold">
              {t('accounting.dashboard.recentPayments', 'Recent Payments')}
            </h3>
          </div>
          <div className="divide-y divide-border">
            {data.recent_payments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                {t('accounting.dashboard.noPayments', 'No payments yet')}
              </p>
            ) : (
              data.recent_payments.slice(0, 5).map((pay) => (
                <div key={pay.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{pay.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {pay.payment_type === 'Receive' ? t('accounting.receive', 'Receive') : t('accounting.pay', 'Pay')}
                      {' · '}
                      {new Date(pay.date).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">{fmt(pay.amount)}</p>
                    <p className={`text-xs ${pay.submitted ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {pay.submitted ? t('accounting.submitted', 'Submitted') : t('accounting.draft', 'Draft')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
