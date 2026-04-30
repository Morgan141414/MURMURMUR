/**
 * Страница деталей сделки с Activity Timeline
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus, Calendar, DollarSign, Percent, User, Building2, UserPlus } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { getDeal, getDealActivityCounts, updateDeal } from '../../api/crm'
import { listUsers } from '../../api/users'
import type { Deal, ActivityCountsResponse } from '../../types/crm'
import type { User as UserType } from '../../types'
import ActivityTimeline from '../../components/crm/ActivityTimeline'

export default function DealDetailPage() {
  const { t } = useTranslation()
  const { dealId } = useParams<{ dealId: string }>()
  const navigate = useNavigate()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const currentUserId = useAuthStore((s) => s.userId)

  const [deal, setDeal] = useState<Deal | null>(null)
  const [counts, setCounts] = useState<ActivityCountsResponse | null>(null)
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)

  const loadDealDetails = async () => {
    if (!activeOrgId || !dealId) return

    try {
      setLoading(true)
      const [dealResponse, countsResponse] = await Promise.all([
        getDeal(activeOrgId, dealId),
        getDealActivityCounts(activeOrgId, dealId),
      ])
      setDeal(dealResponse.data)
      setCounts(countsResponse.data)
    } catch (err) {
      console.error('Failed to load deal details:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    if (!activeOrgId) return
    try {
      const response = await listUsers(activeOrgId)
      setUsers(response.data || [])
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }

  useEffect(() => {
    loadDealDetails()
    loadUsers()
  }, [activeOrgId, dealId])

  const handleAssignToMe = async () => {
    if (!activeOrgId || !dealId || !currentUserId) return
    try {
      await updateDeal(activeOrgId, dealId, { deal_owner_id: currentUserId })
      await loadDealDetails()
    } catch (err) {
      console.error('Failed to assign deal:', err)
      alert('Не удалось назначить ответственного')
    }
  }

  const handleBack = () => {
    navigate('/crm/deals')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Сделка не найдена</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к сделкам
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{deal.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {deal.organization_name && (
                <div className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {deal.organization_name}
                </div>
              )}
              {deal.contact_name && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {deal.contact_name}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowTaskForm(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              Задача
            </button>
            <button
              onClick={() => setShowNoteForm(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              Заметка
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">История активностей</h2>
              {counts && (
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Задачи: {counts.tasks}</span>
                  <span>Заметки: {counts.notes}</span>
                  <span>Звонки: {counts.calls}</span>
                  <span>История: {counts.history}</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <ActivityTimeline
                dealId={dealId!}
                showTaskForm={showTaskForm}
                showNoteForm={showNoteForm}
                onTaskFormClose={() => setShowTaskForm(false)}
                onNoteFormClose={() => setShowNoteForm(false)}
                onActivityAdded={loadDealDetails}
              />
            </div>
          </div>
        </div>

        {/* Right - Deal Info */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Информация о сделке</h2>

            <div className="space-y-4">
              {/* Amount */}
              {deal.annual_revenue && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DollarSign className="w-4 h-4" />
                    Сумма
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    ${deal.annual_revenue.toLocaleString()}
                  </div>
                </div>
              )}

              {/* Probability */}
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Percent className="w-4 h-4" />
                  Вероятность
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {deal.probability}%
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${deal.probability}%` }}
                  />
                </div>
              </div>

              {/* Responsible Person */}
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="w-4 h-4" />
                  Ответственный
                </div>
                {deal.deal_owner_id ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {users.find(u => u.id === deal.deal_owner_id)?.full_name?.[0]?.toUpperCase() ||
                       users.find(u => u.id === deal.deal_owner_id)?.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {users.find(u => u.id === deal.deal_owner_id)?.full_name ||
                       users.find(u => u.id === deal.deal_owner_id)?.email || 'Пользователь'}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleAssignToMe}
                    className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded-md transition-all"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Назначить мне</span>
                  </button>
                )}
              </div>

              {/* Close Date */}
              {deal.close_date && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    Дата закрытия
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {new Date(deal.close_date).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Статус</div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {deal.status}
                </span>
              </div>

              {/* Notes */}
              {deal.notes && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Заметки</div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {deal.notes}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-4 border-t border-gray-200 text-xs text-muted-foreground">
                <div>
                  Создано: {new Date(deal.created_at).toLocaleDateString()}
                </div>
                <div>
                  Обновлено: {new Date(deal.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
