import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProjectStats } from '@/types'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { BarChart3, CheckCircle2, Clock3, FolderKanban } from 'lucide-react'
import { formatPriorityLabel } from './priority'

const STATUS_COLORS: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  done: '#22c55e',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#3b82f6',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
}

interface Props {
  stats: ProjectStats | undefined
  isLoading: boolean
}

export function SummaryView({ stats, isLoading }: Props) {
  const { t } = useTranslation()

  if (isLoading || !stats) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  const statusData = Object.entries(stats.by_status).map(([name, value]) => ({ name, value }))
  const priorityData = Object.entries(stats.by_priority).map(([key, value]) => ({ key, name: formatPriorityLabel(t, key), value }))
  const hasCharts = statusData.length > 0 || priorityData.length > 0

  if (!hasCharts && stats.total_tasks === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <EmptyState
          icon={BarChart3}
          title="No project analytics yet"
          description="As tasks move through the board, this summary will show throughput, status mix, priorities, and overdue work."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={FolderKanban} label={t('board.totalTasks')} value={stats.total_tasks} />
        <StatCard icon={Clock3} label={t('board.overdue')} value={stats.overdue} />
        <StatCard icon={BarChart3} label={t('board.storyPoints')} value={stats.total_story_points} />
        <StatCard icon={CheckCircle2} label={t('board.done')} value={stats.by_status.done ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {statusData.length > 0 && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>{t('board.byStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {priorityData.length > 0 && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>{t('board.byPriority')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value">
                    {priorityData.map((entry) => (
                      <Cell key={entry.key} fill={PRIORITY_COLORS[entry.key] ?? '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
