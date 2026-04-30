import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useOrgStore } from '@/stores/orgStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { Trophy, Medal, Star, TrendingUp, Building2, Loader2 } from 'lucide-react'
import api from '@/api/client'

interface LeaderboardEntry {
  user_id: string
  full_name: string
  position?: string
  score: number
  tasks_completed: number
  sessions_count: number
  rank: number
}

export default function RatingsPage() {
  const { t } = useTranslation()
  const orgId = useOrgStore((s) => s.activeOrgId)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month')

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const r = await api.get<LeaderboardEntry[]>(`/orgs/${orgId}/leaderboard`, { params: { period } })
      setEntries(r.data)
    } catch {
      // If endpoint doesn't exist yet, show empty state
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [orgId, period])

  useEffect(() => { load() }, [load])

  if (!orgId) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader title={t('ratings.title')} description={t('ratings.subtitle')} />
        <div className="flex flex-col items-center justify-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">{t('ratings.joinOrg')}</p>
        </div>
      </div>
    )
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  function getRankIcon(rank: number) {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-700" />
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
  }

  function getRankBg(rank: number) {
    if (rank === 1) return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
    if (rank === 2) return 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-700'
    if (rank === 3) return 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
    return 'bg-card border-border'
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title={t('ratings.title')} description={t('ratings.subtitle')} />
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(['week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(`ratings.period.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Star className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('ratings.noData')}</h3>
          <p className="text-sm text-muted-foreground">{t('ratings.noDataDesc')}</p>
        </div>
      ) : (
        <>
          {/* Podium - Top 3 */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {top3.map((entry) => (
                <div
                  key={entry.user_id}
                  className={`rounded-lg border p-5 text-center ${getRankBg(entry.rank)}`}
                >
                  <div className="flex justify-center mb-3">{getRankIcon(entry.rank)}</div>
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground mb-2">
                    {entry.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{entry.full_name}</h3>
                  {entry.position && (
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.position}</p>
                  )}
                  <div className="mt-3 flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-lg font-bold text-primary">{entry.score}</span>
                    <span className="text-xs text-muted-foreground">{t('ratings.points')}</span>
                  </div>
                  <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
                    <span>{entry.tasks_completed} {t('ratings.tasks')}</span>
                    <span>{entry.sessions_count} {t('ratings.sessions')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-16">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{t('ratings.employee')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">{t('ratings.score')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">{t('ratings.tasksCol')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">{t('ratings.sessionsCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((entry) => (
                    <tr key={entry.user_id} className="border-b border-border last:border-0 hover:bg-accent/50">
                      <td className="px-4 py-3 font-medium text-muted-foreground">{entry.rank}</td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-foreground">{entry.full_name}</span>
                          {entry.position && (
                            <span className="ml-2 text-xs text-muted-foreground">{entry.position}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-primary">{entry.score}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{entry.tasks_completed}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{entry.sessions_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
