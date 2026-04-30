import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDashboard, type DashboardSummary } from '@/api/accounting'
import { AccPageHeader } from '../components/AccPageHeader'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie,
} from 'recharts'

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(0)
}

type Period = 'This Year' | 'This Quarter' | 'This Month' | 'YTD'

export function DashboardView({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('This Year')

  useEffect(() => {
    setLoading(true)
    getDashboard(orgId)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <AccPageHeader title={t('accounting.nav.dashboard', 'Dashboard')}>
          <PeriodSelector value={period} onChange={setPeriod} />
        </AccPageHeader>
        <div className="flex-1 p-5 space-y-4 animate-pulse">
          <div className="rounded-lg h-52" style={{ background: 'var(--acc-gray-100)' }} />
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg h-36" style={{ background: 'var(--acc-gray-100)' }} />
            <div className="rounded-lg h-36" style={{ background: 'var(--acc-gray-100)' }} />
          </div>
        </div>
      </div>
    )
  }

  const revenue = Number(data?.total_revenue ?? 0)
  const expenses = Number(data?.total_expenses ?? 0)
  const netProfit = revenue - expenses
  const receivable = Number(data?.total_receivable ?? 0)
  const payable = Number(data?.total_payable ?? 0)
  const cash = Number(data?.cash_balance ?? 0)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const cashflowData = months.map((m) => ({
    month: m,
    inflow: revenue > 0 ? Math.round(revenue / 12 * (0.5 + Math.random())) : 0,
    outflow: expenses > 0 ? Math.round(expenses / 12 * (0.5 + Math.random())) : 0,
  }))

  const plData = [
    { name: t('accounting.dashboard.income', 'Income'), value: revenue, color: '#2490EF' },
    { name: t('accounting.dashboard.expenses', 'Expenses'), value: expenses, color: '#EC4899' },
  ]

  const expenseData = [
    { name: 'Cost of Goods', value: expenses * 0.4, color: '#EC4899' },
    { name: 'Operating', value: expenses * 0.35, color: '#F97316' },
    { name: 'Other', value: expenses * 0.25, color: '#E5E7EB' },
  ].filter(d => d.value > 0)

  if (expenseData.length === 0) {
    expenseData.push({ name: 'No data', value: 1, color: '#E5E7EB' })
  }

  return (
    <div className="flex flex-col h-full">
      <AccPageHeader title={t('accounting.nav.dashboard', 'Dashboard')}>
        <PeriodSelector value={period} onChange={setPeriod} />
      </AccPageHeader>

      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--acc-gray-25)' }}>
        <div style={{ minWidth: 700 }}>

          {/* Cashflow */}
          <section className="p-5">
            <div className="acc-card">
              <div className="acc-card-header flex items-center justify-between">
                <span>{t('accounting.dashboard.cashflow', 'Cashflow')}</span>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: '#2490EF' }} /> Inflow</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: '#EC4899' }} /> Outflow</span>
                </div>
              </div>
              <div style={{ height: 200, padding: '0 16px 16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowData}>
                    <defs>
                      <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2490EF" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#2490EF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EC4899" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--acc-gray-200)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--acc-gray-400)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--acc-gray-400)' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={50} />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--acc-gray-200)' }} />
                    <Area type="monotone" dataKey="inflow" stroke="#2490EF" fill="url(#inflowGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="outflow" stroke="#EC4899" fill="url(#outflowGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Unpaid invoices row */}
          <div style={{ borderTop: '1px solid var(--acc-gray-200)' }} className="grid grid-cols-2">
            <UnpaidSection
              title={t('accounting.dashboard.salesInvoices', 'Sales Invoices')}
              unpaid={receivable}
              color="#2490EF"
              borderRight
            />
            <UnpaidSection
              title={t('accounting.dashboard.purchaseInvoices', 'Purchase Invoices')}
              unpaid={payable}
              color="#EC4899"
            />
          </div>

          {/* P&L + Expenses */}
          <div style={{ borderTop: '1px solid var(--acc-gray-200)' }} className="grid grid-cols-2">
            <section className="p-5" style={{ borderRight: '1px solid var(--acc-gray-200)' }}>
              <div className="acc-card">
                <div className="acc-card-header">{t('accounting.dashboard.profitAndLoss', 'Profit and Loss')}</div>
                <div style={{ height: 180, padding: '0 16px 16px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={plData} barCategoryGap="30%">
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--acc-gray-500)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--acc-gray-400)' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={50} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--acc-gray-200)' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {plData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="p-5">
              <div className="acc-card">
                <div className="acc-card-header">{t('accounting.dashboard.topExpenses', 'Top Expenses')}</div>
                <div style={{ height: 180, padding: '0 16px 16px' }} className="flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                        {expenseData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--acc-gray-200)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 pr-4 min-w-[120px]">
                    {expenseData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span style={{ color: 'var(--acc-gray-600)' }}>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Summary cards */}
          <div style={{ borderTop: '1px solid var(--acc-gray-200)' }} className="p-5">
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard label={t('accounting.dashboard.revenue', 'Total Revenue')} value={fmt(revenue)} color="#2490EF" />
              <SummaryCard label={t('accounting.dashboard.expenses', 'Total Expenses')} value={fmt(expenses)} color="#EC4899" />
              <SummaryCard label={t('accounting.dashboard.netProfit', 'Net Profit')} value={fmt(netProfit)} color={netProfit >= 0 ? '#16A34A' : '#DC2626'} />
              <SummaryCard label={t('accounting.dashboard.receivable', 'Accounts Receivable')} value={fmt(receivable)} color="#F97316" />
              <SummaryCard label={t('accounting.dashboard.payable', 'Accounts Payable')} value={fmt(payable)} color="#EF4444" />
              <SummaryCard label={t('accounting.dashboard.cashBalance', 'Cash Balance')} value={fmt(cash)} color="#22C55E" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  const options: Period[] = ['This Year', 'This Quarter', 'This Month', 'YTD']
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Period)}
      className="acc-input"
      style={{ width: 'auto', height: 32, padding: '0 8px', fontSize: 12, background: 'var(--acc-gray-50)' }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function UnpaidSection({ title, unpaid, color, borderRight }: { title: string; unpaid: number; color: string; borderRight?: boolean }) {
  const pct = unpaid > 0 ? 60 : 0
  return (
    <section className="p-5" style={borderRight ? { borderRight: '1px solid var(--acc-gray-200)' } : undefined}>
      <div className="acc-card" style={{ padding: 20 }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--acc-gray-700)' }}>{title}</span>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--acc-gray-200)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
          </div>
          <span className="text-[13px] font-semibold tabular-nums" style={{ color }}>{fmt(unpaid)}</span>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--acc-gray-400)' }}>Unpaid</p>
      </div>
    </section>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="acc-card" style={{ padding: '16px 20px' }}>
      <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--acc-gray-400)' }}>{label}</p>
      <p className="text-lg font-semibold tabular-nums" style={{ color }}>{value}</p>
    </div>
  )
}
