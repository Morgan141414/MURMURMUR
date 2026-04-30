import { useState } from 'react'
import { FunnelChart, Funnel, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'
import type { SalesFunnelData, FunnelViewMode } from '@/types/crm'
import { TrendingDown, DollarSign, Target, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  funnelData: SalesFunnelData
}

export function SalesFunnelChart({ funnelData }: Props) {
  const [viewMode, setViewMode] = useState<FunnelViewMode>('count')

  // Transform data based on view mode
  const chartData = funnelData.stages.map((stage) => {
    let value: number
    let label: string

    switch (viewMode) {
      case 'revenue':
        value = stage.total_revenue
        label = formatCurrency(stage.total_revenue)
        break
      case 'expected':
        value = stage.expected_revenue
        label = formatCurrency(stage.expected_revenue)
        break
      case 'count':
      default:
        value = stage.deal_count
        label = `${stage.deal_count} сделок`
        break
    }

    return {
      name: stage.stage,
      value,
      label,
      fill: stage.color,
      conversion_rate: stage.conversion_rate,
      deal_count: stage.deal_count,
      total_revenue: stage.total_revenue,
      expected_revenue: stage.expected_revenue,
      avg_probability: stage.avg_probability,
    }
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KZT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number | null) => {
    if (value === null) return '—'
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('count')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors',
              viewMode === 'count'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border hover:bg-accent'
            )}
          >
            <Users className="w-4 h-4 inline mr-1" />
            По количеству
          </button>
          <button
            onClick={() => setViewMode('revenue')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors',
              viewMode === 'revenue'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border hover:bg-accent'
            )}
          >
            <DollarSign className="w-4 h-4 inline mr-1" />
            По доходу
          </button>
          <button
            onClick={() => setViewMode('expected')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors',
              viewMode === 'expected'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border hover:bg-accent'
            )}
          >
            <Target className="w-4 h-4 inline mr-1" />
            Ожидаемый доход
          </button>
        </div>
      </div>

      {/* Funnel Chart */}
      <div className="bg-card border rounded-lg p-6">
        <ResponsiveContainer width="100%" height={400}>
          <FunnelChart>
            <Tooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null
                const data = payload[0].payload

                return (
                  <div className="bg-card border rounded-lg p-3 shadow-lg text-sm">
                    <div className="font-semibold mb-2">{data.name}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Сделок:</span>
                        <span className="font-medium">{data.deal_count}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Всего:</span>
                        <span className="font-medium">{formatCurrency(data.total_revenue)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Ожидаемый:</span>
                        <span className="font-medium">{formatCurrency(data.expected_revenue)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Средняя вероятность:</span>
                        <span className="font-medium">{data.avg_probability.toFixed(0)}%</span>
                      </div>
                      {data.conversion_rate !== null && (
                        <div className="flex justify-between gap-4 pt-1 border-t">
                          <span className="text-muted-foreground">Конверсия:</span>
                          <span className="font-medium text-emerald-600">
                            {formatPercent(data.conversion_rate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }}
            />
            <Funnel
              dataKey="value"
              data={chartData}
              isAnimationActive={true}
            >
              <LabelList
                position="inside"
                fill="#fff"
                stroke="none"
                dataKey="name"
                style={{ fontSize: '14px', fontWeight: 500 }}
              />
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>

        {/* Conversion Rates Below Chart */}
        <div className="grid grid-cols-4 gap-3 mt-6 pt-4 border-t">
          {funnelData.stages.slice(1).map((stage) => (
            <div key={stage.stage} className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingDown className="w-3 h-3" />
                <span className="truncate">→ {stage.stage}</span>
              </div>
              <div className="text-lg font-bold" style={{ color: stage.color }}>
                {formatPercent(stage.conversion_rate)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Общая стоимость воронки</div>
          <div className="text-xl font-bold">{formatCurrency(funnelData.total_pipeline_value)}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Ожидаемый доход</div>
          <div className="text-xl font-bold text-emerald-600">
            {formatCurrency(funnelData.total_expected_value)}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Общая конверсия в Won</div>
          <div className="text-xl font-bold text-primary">
            {formatPercent(funnelData.overall_conversion_rate)}
          </div>
        </div>
      </div>
    </div>
  )
}
