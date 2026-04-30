import { useEffect, useState, useCallback } from 'react'
import { getCRMDashboard, getSalesFunnel } from '../../api/crm'
import type { CRMDashboard, SalesFunnelData } from '../../types/crm'
import { useOrgStore } from '@/stores/orgStore'
import { RefreshCw, Edit, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { SalesFunnelChart } from '@/components/crm/SalesFunnelChart'
import { cn } from '@/lib/utils'

export default function CRMDashboardPage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [dashboard, setDashboard] = useState<CRMDashboard | null>(null)
  const [funnelData, setFunnelData] = useState<SalesFunnelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!activeOrgId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const [dashboardResponse, funnelResponse] = await Promise.all([
        getCRMDashboard(activeOrgId),
        getSalesFunnel(activeOrgId),
      ])
      setDashboard(dashboardResponse.data)
      setFunnelData(funnelResponse.data)
    } catch (err: any) {
      console.error('Failed to load CRM dashboard:', err)
      setError(err?.response?.data?.detail || 'Не удалось загрузить данные дашборда')
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Дашборд</h1>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-accent transition-colors">
                <RefreshCw className="h-4 w-4" />
                Обновить
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-accent transition-colors">
                <Edit className="h-4 w-4" />
                Редактировать
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-card hover:bg-accent transition-colors">
              <span>Последние 30 дней</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-card hover:bg-accent transition-colors">
              <span>Менеджер по продажам</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Всего лидов"
              value={(dashboard?.total_leads || 0).toString()}
            />
            <MetricCard title="Новые лиды" value={(dashboard?.new_leads_count || 0).toString()} />
            <MetricCard
              title="Текущие сделки"
              value={(dashboard?.open_deals_count || 0).toString()}
            />
            <MetricCard title="Всего сделок" value={(dashboard?.total_deals || 0).toString()} />
            <MetricCard title="Квалифицированные лиды" value={(dashboard?.qualified_leads_count || 0).toString()} />
            <MetricCard title="Контакты" value={(dashboard?.contacts_count || 0).toString()} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend */}
            <div className="bg-card border rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1">Тренд продаж</h3>
                <p className="text-xs text-muted-foreground">Ежедневная динамика лидов, сделок и побед</p>
              </div>
              {dashboard?.sales_trend && dashboard.sales_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dashboard.sales_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} name="Лиды" />
                    <Line type="monotone" dataKey="deals" stroke="#10b981" strokeWidth={2} name="Сделки" />
                    <Line type="monotone" dataKey="wonDeals" stroke="#f59e0b" strokeWidth={2} name="Выигранные" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  Нет данных для отображения
                </div>
              )}
            </div>

            {/* Activity by Date */}
            <div className="bg-card border rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1">Активность по датам</h3>
                <p className="text-xs text-muted-foreground">Количество лидов и сделок по датам</p>
              </div>
              {dashboard?.sales_trend && dashboard.sales_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboard.sales_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="leads" fill="#60a5fa" name="Лиды" />
                    <Bar dataKey="deals" fill="#fbbf24" name="Сделки" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  Нет данных для отображения
                </div>
              )}
            </div>
          </div>

          {/* Bottom Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Summary Stats */}
            <div className="bg-card border rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1">Конверсия</h3>
                <p className="text-xs text-muted-foreground">Общая статистика</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Всего лидов</span>
                  <span className="text-lg font-bold">{dashboard?.total_leads || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Всего сделок</span>
                  <span className="text-lg font-bold">{dashboard?.total_deals || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Конверсия лид → сделка</span>
                  <span className="text-lg font-bold">
                    {dashboard?.total_leads && dashboard.total_leads > 0
                      ? `${Math.round((dashboard.total_deals / dashboard.total_leads) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Открытые сделки</span>
                  <span className="text-lg font-bold">{dashboard?.open_deals_count || 0}</span>
                </div>
              </div>
            </div>

            {/* Deals by Stage */}
            <div className="bg-card border rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1">Сделки по этапам</h3>
                <p className="text-xs text-muted-foreground">Распределение по воронке продаж</p>
              </div>
              {dashboard?.deals_by_stage && dashboard.deals_by_stage.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={dashboard.deals_by_stage}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {dashboard.deals_by_stage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {dashboard.deals_by_stage.map((stage) => (
                      <div key={stage.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: stage.color }} />
                        <span className="text-xs text-muted-foreground">{stage.name}: {stage.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  Нет сделок для отображения
                </div>
              )}
            </div>
          </div>

          {/* Sales Funnel Section */}
          {funnelData && (
            <div className="mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Воронка продаж</h3>
                <p className="text-sm text-muted-foreground">
                  Визуализация прохождения сделок по этапам с метриками конверсии
                </p>
              </div>
              <SalesFunnelChart funnelData={funnelData} />
            </div>
          )}
        </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  positive,
}: {
  title: string
  value: string
  change?: number
  positive?: boolean
}) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', positive ? 'text-green-600' : 'text-red-600')}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{positive ? '↑' : '↓'}{change}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
