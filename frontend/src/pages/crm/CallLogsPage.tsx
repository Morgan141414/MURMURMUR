import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, PhoneIncoming, PhoneOutgoing, Phone, Clock } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { listCallLogs, createCallLog, deleteCallLog } from '@/api/crm'
import type { CallLog, CallLogCreate } from '@/types/crm'

const CALL_TYPES = ['Incoming', 'Outgoing']
const CALL_STATUSES = ['Completed', 'Missed Call', 'Busy', 'No Answer']

const STATUS_COLORS = {
  'Completed': 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  'Missed Call': 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  'Busy': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
  'No Answer': 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400'
}

export default function CallLogsPage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<Partial<CallLogCreate>>({})

  const loadCallLogs = useCallback(async () => {
    if (!activeOrgId) return

    try {
      setLoading(true)
      const response = await listCallLogs(activeOrgId)
      const callsData = (response.data as any)?.data || response.data || []
      setCallLogs(callsData)
    } catch (err) {
      console.error('Failed to load call logs:', err)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadCallLogs()
  }, [loadCallLogs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId || !formData.caller_name || !formData.receiver_name) return

    try {
      await createCallLog(activeOrgId, formData as CallLogCreate)
      setShowModal(false)
      setFormData({})
      loadCallLogs()
    } catch (err) {
      console.error('Failed to create call log:', err)
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'сегодня'
    if (diffInDays === 1) return '1 день назад'
    if (diffInDays < 7) return `${diffInDays} дней назад`
    if (diffInDays < 14) return '1 неделю назад'
    return `${Math.floor(diffInDays / 7)} недель назад`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Call Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">List</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Создать
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option>Telephony Medium</option>
          </select>
          <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option>Тип</option>
            <option>Incoming</option>
            <option>Outgoing</option>
          </select>
          <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option>Статус</option>
            {CALL_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="From Number"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="To Number"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Звонящий
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Получатель
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Длительность
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    From (number)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    To (number)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Создан
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {callLogs.map((call) => (
                  <tr key={call.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-xs font-semibold text-white">
                          {call.caller_name.substring(0, 1).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{call.caller_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-semibold text-white">
                          {call.receiver_name.substring(0, 1).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{call.receiver_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {call.call_type === 'Incoming' ? (
                          <PhoneIncoming className="h-4 w-4 text-blue-500" />
                        ) : (
                          <PhoneOutgoing className="h-4 w-4 text-emerald-500" />
                        )}
                        <span className="text-sm text-muted-foreground">{call.call_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${STATUS_COLORS[call.status as keyof typeof STATUS_COLORS] || STATUS_COLORS['Completed']}`}>
                        {call.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(call.duration)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {call.from_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {call.to_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(call.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {callLogs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Звонки не найдены
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Новый звонок</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Звонящий *</label>
                  <input
                    type="text"
                    required
                    value={formData.caller_name || ''}
                    onChange={(e) => setFormData({ ...formData, caller_name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Sarah Connor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Получатель *</label>
                  <input
                    type="text"
                    required
                    value={formData.receiver_name || ''}
                    onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Bob Martinez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Тип</label>
                  <select
                    value={formData.call_type || 'Outgoing'}
                    onChange={(e) => setFormData({ ...formData, call_type: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {CALL_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Статус</label>
                  <select
                    value={formData.status || 'Completed'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {CALL_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Длительность (сек)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duration || 0}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">From Number</label>
                  <input
                    type="text"
                    value={formData.from_number || ''}
                    onChange={(e) => setFormData({ ...formData, from_number: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="+1 555 100 0002"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">To Number</label>
                  <input
                    type="text"
                    value={formData.to_number || ''}
                    onChange={(e) => setFormData({ ...formData, to_number: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="+1 555 000 5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Заметки</label>
                <textarea
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({})
                  }}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
