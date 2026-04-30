import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Calendar } from 'lucide-react'
import { getGeneralLedger, getTrialBalance, getProfitAndLoss, getBalanceSheet } from '@/api/accounting'
import { AccPageHeader } from '../components/AccPageHeader'
import { AccButton } from '../components/AccButton'
import { toast } from 'sonner'

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

type ReportType = 'general-ledger' | 'profit-and-loss' | 'balance-sheet' | 'trial-balance'

const reportTitles: Record<ReportType, string> = {
  'general-ledger': 'General Ledger',
  'profit-and-loss': 'Profit and Loss',
  'balance-sheet': 'Balance Sheet',
  'trial-balance': 'Trial Balance',
}

export function ReportsView({ orgId, report, onBack }: { orgId: string; report: ReportType; onBack: () => void }) {
  const { t } = useTranslation()
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(0, 1); return d.toISOString().slice(0, 10) })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const body = { from_date: from, to_date: to }
      const fetcher = { 'general-ledger': getGeneralLedger, 'trial-balance': getTrialBalance, 'profit-and-loss': getProfitAndLoss, 'balance-sheet': getBalanceSheet }[report]
      const res = await fetcher(orgId, body)
      setData(res.data)
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }

  const title = reportTitles[report]

  return (
    <div className="flex flex-col h-full">
      <AccPageHeader title={title} onBack={onBack}>
        <AccButton variant="icon"><Download size={14} /></AccButton>
      </AccPageHeader>

      {/* Date filter bar */}
      <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--acc-gray-200)', background: 'var(--acc-gray-50)' }}>
        <Calendar size={14} style={{ color: 'var(--acc-gray-400)' }} />
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="acc-input" style={{ width: 150 }} />
        <span style={{ color: 'var(--acc-gray-400)' }}>—</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="acc-input" style={{ width: 150 }} />
        <AccButton variant="primary" onClick={run} disabled={loading}>
          {loading ? 'Loading...' : 'Run'}
        </AccButton>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {!data && !loading && (
          <div className="acc-empty">
            <div className="acc-empty-bars">{[40, 56, 32, 48].map((h, i) => <div key={i} className="acc-empty-bar" style={{ height: h }} />)}</div>
            <p className="acc-empty-text">Select date range and click Run</p>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--acc-blue-500)' }} />
          </div>
        )}
        {data && report === 'general-ledger' && <GLTable data={data} />}
        {data && report === 'trial-balance' && <TBTable data={data} />}
        {data && report === 'profit-and-loss' && <PLTable data={data} />}
        {data && report === 'balance-sheet' && <BSTable data={data} />}
      </div>
    </div>
  )
}

function GLTable({ data }: { data: any[] }) {
  return (
    <div className="acc-card overflow-hidden">
      <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--acc-gray-50)', borderBottom: '2px solid var(--acc-gray-200)' }}>
            {['Date', 'Account', 'Party', 'Debit', 'Credit', 'Balance'].map((h, i) => (
              <th key={h} className="py-2 px-3 font-semibold text-[12px]" style={{ color: 'var(--acc-gray-500)', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data as any[]).map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--acc-gray-100)' }}>
              <td className="py-2 px-3" style={{ color: 'var(--acc-gray-600)' }}>{row.date?.slice(0, 10)}</td>
              <td className="py-2 px-3 font-medium" style={{ color: 'var(--acc-gray-800)' }}>{row.account}</td>
              <td className="py-2 px-3" style={{ color: 'var(--acc-gray-500)' }}>{row.party || '—'}</td>
              <td className="py-2 px-3 text-right tabular-nums" style={{ color: row.debit > 0 ? 'var(--acc-blue-500)' : 'var(--acc-gray-400)' }}>{fmt(row.debit || 0)}</td>
              <td className="py-2 px-3 text-right tabular-nums" style={{ color: row.credit > 0 ? 'var(--acc-pink-500)' : 'var(--acc-gray-400)' }}>{fmt(row.credit || 0)}</td>
              <td className="py-2 px-3 text-right font-medium tabular-nums" style={{ color: 'var(--acc-gray-800)' }}>{fmt(row.balance || 0)}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={6} className="py-8 text-center" style={{ color: 'var(--acc-gray-400)' }}>No entries</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function TBTable({ data }: { data: any[] }) {
  return (
    <div className="acc-card overflow-hidden">
      <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--acc-gray-50)', borderBottom: '2px solid var(--acc-gray-200)' }}>
            {['Account', 'Opening (Dr)', 'Opening (Cr)', 'Closing (Dr)', 'Closing (Cr)'].map((h, i) => (
              <th key={h} className="py-2 px-3 font-semibold text-[12px]" style={{ color: 'var(--acc-gray-500)', textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data as any[]).map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--acc-gray-100)' }}>
              <td className="py-2 px-3 font-medium" style={{ color: 'var(--acc-gray-800)' }}>{row.account}</td>
              <td className="py-2 px-3 text-right tabular-nums">{fmt(row.opening_debit || 0)}</td>
              <td className="py-2 px-3 text-right tabular-nums">{fmt(row.opening_credit || 0)}</td>
              <td className="py-2 px-3 text-right tabular-nums font-medium" style={{ color: 'var(--acc-blue-500)' }}>{fmt(row.closing_debit || 0)}</td>
              <td className="py-2 px-3 text-right tabular-nums font-medium" style={{ color: 'var(--acc-pink-500)' }}>{fmt(row.closing_credit || 0)}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={5} className="py-8 text-center" style={{ color: 'var(--acc-gray-400)' }}>No data</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function PLTable({ data }: { data: any }) {
  const income = data?.income || []
  const expenses = data?.expenses || []
  const totalI = income.reduce((s: number, r: any) => s + (r.amount || 0), 0)
  const totalE = expenses.reduce((s: number, r: any) => s + (r.amount || 0), 0)
  const net = totalI - totalE

  return (
    <div className="space-y-4">
      <ReportSection title="Income" rows={income} total={totalI} color="var(--acc-green-600)" />
      <ReportSection title="Expenses" rows={expenses} total={totalE} color="var(--acc-pink-500)" />
      <div className="acc-card flex justify-between items-center px-5 py-4" style={{ background: net >= 0 ? 'var(--acc-green-50)' : 'var(--acc-red-50)' }}>
        <span className="font-semibold text-[14px]" style={{ color: 'var(--acc-gray-800)' }}>Net Profit</span>
        <span className="font-bold text-[18px] tabular-nums" style={{ color: net >= 0 ? 'var(--acc-green-600)' : 'var(--acc-red-500)' }}>{fmt(net)}</span>
      </div>
    </div>
  )
}

function BSTable({ data }: { data: any }) {
  const assets = data?.assets || []; const liabilities = data?.liabilities || []; const equity = data?.equity || []
  const totalA = assets.reduce((s: number, r: any) => s + (r.amount || 0), 0)
  const totalL = liabilities.reduce((s: number, r: any) => s + (r.amount || 0), 0)
  const totalE = equity.reduce((s: number, r: any) => s + (r.amount || 0), 0)

  return (
    <div className="space-y-4">
      <ReportSection title="Assets" rows={assets} total={totalA} color="var(--acc-blue-500)" />
      <ReportSection title="Liabilities" rows={liabilities} total={totalL} color="var(--acc-pink-500)" />
      <ReportSection title="Equity" rows={equity} total={totalE} color="var(--acc-green-600)" />
    </div>
  )
}

function ReportSection({ title, rows, total, color }: { title: string; rows: any[]; total: number; color: string }) {
  return (
    <div className="acc-card overflow-hidden">
      <div className="flex justify-between items-center px-5 py-3" style={{ background: 'var(--acc-gray-50)', borderBottom: '2px solid var(--acc-gray-200)' }}>
        <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--acc-gray-500)' }}>{title}</span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color }}>{fmt(total)}</span>
      </div>
      {rows.map((r: any, i: number) => (
        <div key={i} className="flex justify-between items-center px-5 py-2.5" style={{ borderBottom: '1px solid var(--acc-gray-100)' }}>
          <span className="text-[13px]" style={{ color: 'var(--acc-gray-700)' }}>{r.account}</span>
          <span className="text-[13px] font-medium tabular-nums" style={{ color: 'var(--acc-gray-800)' }}>{fmt(r.amount || 0)}</span>
        </div>
      ))}
      {rows.length === 0 && <div className="py-4 text-center text-[13px]" style={{ color: 'var(--acc-gray-400)' }}>No data</div>}
    </div>
  )
}
