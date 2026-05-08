import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { listDeals, createDeal, deleteDeal, updateDeal, listOrganizations, listPipelines } from '../../api/crm'
import { listUsers } from '../../api/users'
import type { Deal, DealCreate, DealUpdate, Organization, PipelineWithStages } from '../../types/crm'
import type { TaskColumn, User } from '@/types'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { Plus, X, Trash2, Building2, DollarSign, Calendar, ChevronDown } from 'lucide-react'
import { DealBoardView } from '@/components/board/DealBoardView'
import { ViewSwitcher, type ViewType } from '@/components/crm/ViewSwitcher'
import { QuickDealDrawer } from '@/components/crm/QuickDealDrawer'

const DEAL_STATUSES = [
  { value: '', label: 'Без статуса', color: '#94a3b8' },
  { value: 'Qualification', label: 'Квалификация', color: '#3b82f6' },
  { value: 'Demo/Making', label: 'Демо', color: '#a855f7' },
  { value: 'Proposal/Quotation', label: 'Предложение', color: '#eab308' },
  { value: 'Negotiation', label: 'Переговоры', color: '#f97316' },
  { value: 'Ready to Close', label: 'Готово к закрытию', color: '#22c55e' },
  { value: 'Won', label: 'Выиграно', color: '#10b981' },
  { value: 'Lost', label: 'Проиграно', color: '#ef4444' },
]

export default function DealsPage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const currentUserId = useAuthStore((s) => s.userId)
  const navigate = useNavigate()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [useExistingOrg, setUseExistingOrg] = useState(false)
  const [useExistingContact, setUseExistingContact] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [showOrgSuggestions, setShowOrgSuggestions] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('deals-view')
    return (saved as ViewType) || 'kanban'
  })
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineWithStages | null>(null)
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false)
  const [users, setUsers] = useState<User[]>([])

  const [formData, setFormData] = useState({
    // Organization fields
    organization: '',
    website: '',
    employees: '1-10',
    territory: '',
    annual_revenue: 0,
    industry: '',
    // Contact fields
    salutation: '',
    first_name: '',
    last_name: '',
    email: '',
    mobile_no: '',
    gender: '',
    // Deal fields
    probability: 50,
    status: 'Qualification',
    deal_owner: '',
  })

  // Загружаем пайплайны
  const loadPipelines = useCallback(async () => {
    if (!activeOrgId) return

    try {
      const response = await listPipelines(activeOrgId)
      const data = (response.data as any)?.data || response.data || []
      setPipelines(data)

      // Автоматически выбираем первый пайплайн (или default)
      if (data.length > 0 && !selectedPipeline) {
        const defaultPipeline = data.find((p: PipelineWithStages) => p.is_default) || data[0]
        setSelectedPipeline(defaultPipeline)
      }
    } catch (err) {
      console.error('Failed to load pipelines:', err)
    }
  }, [activeOrgId, selectedPipeline])

  useEffect(() => {
    loadPipelines()
  }, [loadPipelines])

  // Создаём колонки из этапов выбранного пайплайна
  const columns: TaskColumn[] = useMemo(() => {
    if (selectedPipeline && selectedPipeline.stages && selectedPipeline.stages.length > 0) {
      return selectedPipeline.stages.map((stage, index) => ({
        id: stage.id,
        org_id: activeOrgId || '',
        project_id: '',
        name: stage.name,
        color: stage.color,
        position: index,
        created_at: new Date().toISOString(),
      }))
    }

    // Если нет воронки с этапами, возвращаем пустой массив
    return []
  }, [activeOrgId, selectedPipeline])

  const loadDeals = useCallback(async () => {
    if (!activeOrgId) {
      setDeals([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await listDeals(activeOrgId)
      // Backend returns {data: [...]}
      const dealsData = (response.data as any)?.data || response.data || []
      setDeals(dealsData)
    } catch (err: any) {
      console.error('Failed to load deals:', err)
      setError(err?.response?.data?.detail || 'Не удалось загрузить сделки')
      setDeals([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  const loadOrganizations = useCallback(async () => {
    if (!activeOrgId) return

    try {
      const response = await listOrganizations(activeOrgId)
      // Backend returns {data: [...]} wrapped in axios response.data
      const orgs = (response.data as any)?.data || response.data || []
      setOrganizations(orgs)
    } catch (err) {
      console.error('Failed to load organizations:', err)
    }
  }, [activeOrgId])

  const loadUsers = useCallback(async () => {
    if (!activeOrgId) return

    try {
      const response = await listUsers(activeOrgId)
      const userList = (response.data as any)?.data || response.data || []
      setUsers(userList)
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    if (showCreateForm) {
      loadOrganizations()
    }
  }, [showCreateForm, loadOrganizations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId) return

    try {
      // Отправляем только базовые поля сделки
      const dealData: DealCreate = {
        name: formData.organization || 'Новая сделка', // Название сделки (обязательное)
        organization_name: formData.organization, // Название организации
        annual_revenue: formData.annual_revenue,
        probability: formData.probability,
        status: formData.status,
      }

      // Contact отправляем только если заполнены имя/фамилия
      if (formData.first_name || formData.last_name) {
        const contactName = `${formData.first_name} ${formData.last_name}`.trim()
        if (contactName) {
          dealData.contact_name = contactName
        }
      }

      await createDeal(activeOrgId, dealData)
      setShowCreateForm(false)
      setFormData({
        organization: '',
        website: '',
        employees: '1-10',
        territory: '',
        annual_revenue: 0,
        industry: '',
        salutation: '',
        first_name: '',
        last_name: '',
        email: '',
        mobile_no: '',
        gender: '',
        probability: 50,
        status: 'Qualification',
        deal_owner: '',
      })
      loadDeals()
    } catch (err: any) {
      console.error('Failed to create deal:', err)
      console.error('Error details:', err.response?.data)
      alert(`Не удалось создать сделку: ${err.response?.data?.detail || err.message}`)
    }
  }

  const handleDelete = async (dealId: string) => {
    if (!activeOrgId) return
    if (!confirm('Удалить эту сделку?')) return

    try {
      await deleteDeal(activeOrgId, dealId)
      setSelectedDeal(null)
      loadDeals()
    } catch (err) {
      console.error('Failed to delete deal:', err)
      alert('Не удалось удалить сделку')
    }
  }

  const handleReorderDeal = async (dealId: string, columnId: string) => {
    if (!activeOrgId) return

    // Проверяем что есть воронка с этапами
    if (!selectedPipeline || !selectedPipeline.stages || selectedPipeline.stages.length === 0) {
      alert('Невозможно переместить сделку: нет этапов в воронке')
      return
    }

    try {
      // Находим сделку по ID
      const deal = deals.find((d) => d.id === dealId)
      if (!deal) return

      // Проверяем что columnId это валидный UUID (этап из воронки)
      const isValidStage = selectedPipeline.stages.some(s => s.id === columnId)
      if (!isValidStage) {
        console.error('Invalid stage ID:', columnId)
        alert('Невозможно переместить сделку: невалидный этап')
        return
      }

      // Обновляем stage_id
      const newStageId = columnId
      if (deal.stage_id !== newStageId) {
        const dealData: DealUpdate = {
          stage_id: newStageId,
          pipeline_id: selectedPipeline.id
        }
        await updateDeal(activeOrgId, deal.id, dealData)
        loadDeals()
      }
    } catch (err) {
      console.error('Failed to update deal:', err)
      alert('Не удалось обновить статус')
    }
  }

  const handleQuickDealCreate = async (dealData: Partial<Deal>) => {
    if (!activeOrgId) return

    try {
      const newDeal: DealCreate = {
        name: dealData.name || 'Новая сделка',
        ...(dealData.annual_revenue !== undefined && { annual_revenue: dealData.annual_revenue }),
        ...(dealData.contact_name && { contact_name: dealData.contact_name }),
        ...(dealData.organization_name && { organization_name: dealData.organization_name }),
        ...(dealData.stage_id && { stage_id: dealData.stage_id }),
        ...(dealData.pipeline_id && { pipeline_id: dealData.pipeline_id }),
        ...(dealData.deal_owner_id && { deal_owner_id: dealData.deal_owner_id }),
        ...(dealData.close_date && { close_date: dealData.close_date }),
        ...(dealData.notes && { notes: dealData.notes }),
        probability: dealData.probability || 50,
      }

      await createDeal(activeOrgId, newDeal)
      await loadDeals() // Перезагружаем список сделок
    } catch (err) {
      console.error('Failed to create quick deal:', err)
      alert('Не удалось создать сделку')
      throw err // Пробросим ошибку чтобы модал не закрылся
    }
  }

  const handleAssignDealToMe = async (dealId: string) => {
    if (!activeOrgId || !currentUserId) return

    try {
      await updateDeal(activeOrgId, dealId, { deal_owner_id: currentUserId })
      await loadDeals()
    } catch (err) {
      console.error('Failed to assign deal:', err)
      alert('Не удалось назначить ответственного')
    }
  }

  const handleDealClick = (deal: Deal) => {
    navigate(`/company/crm/deals/${deal.id}`)
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KZT',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Загрузка сделок...</div>
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

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    localStorage.setItem('deals-view', view)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Сделки</h1>

            {/* Pipeline Selector */}
            {pipelines.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background hover:bg-accent text-sm"
                >
                  <span className="text-muted-foreground">Воронка:</span>
                  <span className="font-medium">{selectedPipeline?.name || 'Все'}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>

                {showPipelineDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowPipelineDropdown(false)}
                    />
                    <div className="absolute left-0 mt-2 w-64 rounded-md border bg-popover shadow-lg z-20">
                      <div className="p-1">
                        {pipelines.map((pipeline) => (
                          <button
                            key={pipeline.id}
                            onClick={() => {
                              setSelectedPipeline(pipeline)
                              setShowPipelineDropdown(false)
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-accent ${
                              selectedPipeline?.id === pipeline.id ? 'bg-accent' : ''
                            }`}
                          >
                            <span>{pipeline.name}</span>
                            {pipeline.is_default && (
                              <span className="text-xs text-muted-foreground">По умолчанию</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ViewSwitcher currentView={currentView} onViewChange={handleViewChange} />
            <button
              onClick={() => {
                if (!selectedPipeline || !selectedPipeline.stages || selectedPipeline.stages.length === 0) {
                  alert('Сначала создайте воронку продаж с этапами в разделе Настройки → CRM → Воронки')
                  return
                }
                setShowCreateForm(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />
              Создать сделку
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {currentView === 'kanban' ? (
          columns.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-md">
                <h3 className="text-lg font-semibold mb-2">Нет этапов в воронке</h3>
                <p className="text-muted-foreground mb-4">
                  Выбранная воронка "{selectedPipeline?.name || 'без названия'}" не содержит этапов.
                  Добавьте этапы в воронку для работы с канбан-доской.
                </p>
                <p className="text-sm text-muted-foreground">
                  Перейдите в <span className="font-medium">Настройки → CRM → Воронки</span> для настройки этапов.
                </p>
              </div>
            </div>
          ) : (
            <DealBoardView
              columns={columns}
              deals={deals}
              pipelineId={selectedPipeline?.id}
              users={users}
              currentUserId={currentUserId || undefined}
              onReorderDeal={handleReorderDeal}
              onDealClick={handleDealClick}
              onQuickDealCreate={handleQuickDealCreate}
              onAssignToMe={handleAssignDealToMe}
            />
          )
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="bg-card border rounded-lg">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Название</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Организация</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Контакт</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Выручка</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Статус</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Вероятность</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Дата закрытия</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deals.map((deal) => {
                    const statusInfo = DEAL_STATUSES.find((s) => s.value === deal.status)
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => handleDealClick(deal)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">{deal.name}</td>
                        <td className="px-4 py-3">
                          {deal.organization_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {deal.organization_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{deal.contact_name || '—'}</td>
                        <td className="px-4 py-3">
                          {deal.annual_revenue && (
                            <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatCurrency(deal.annual_revenue)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: `${statusInfo?.color}20`,
                              color: statusInfo?.color,
                            }}
                          >
                            {statusInfo?.label || deal.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{deal.probability}%</td>
                        <td className="px-4 py-3">
                          {deal.close_date && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(deal.close_date)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(deal.id)
                            }}
                            className="p-1 hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {deals.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Сделки не найдены
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Deal Form */}
      {selectedPipeline && selectedPipeline.stages && selectedPipeline.stages.length > 0 ? (
        <QuickDealDrawer
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          stageId={selectedPipeline.stages[0].id}
          pipelineId={selectedPipeline.id}
          stages={selectedPipeline.stages}
          users={users}
          currentUserId={currentUserId || undefined}
          onSave={handleQuickDealCreate}
        />
      ) : showCreateForm ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Нет активной воронки продаж</h3>
              <p className="text-muted-foreground mb-4">
                Для создания сделок необходимо сначала создать воронку продаж с этапами.
              </p>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                {selectedDeal.name || 'Сделка без названия'}
              </h2>
              <button
                onClick={() => setSelectedDeal(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Статус</label>
                <select
                  value={selectedDeal.status || ''}
                  onChange={(e) => {
                    handleReorderDeal(selectedDeal.id, e.target.value)
                    setSelectedDeal({ ...selectedDeal, status: e.target.value })
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {DEAL_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Key Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Сумма</div>
                  <div className="text-xl font-semibold">
                    {formatCurrency(selectedDeal.annual_revenue)}
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Вероятность</div>
                  <div className="text-xl font-semibold">
                    {selectedDeal.probability || 0}%
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">ID</div>
                  <div className="text-sm">{selectedDeal.id}</div>
                </div>

                {selectedDeal.organization_name && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Организация</div>
                    <div className="text-sm">{selectedDeal.organization_name}</div>
                  </div>
                )}

                {selectedDeal.contact_name && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Контакт</div>
                    <div className="text-sm">{selectedDeal.contact_name}</div>
                  </div>
                )}

                {selectedDeal.close_date && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Дата закрытия</div>
                    <div className="text-sm">{selectedDeal.close_date}</div>
                  </div>
                )}

                {selectedDeal.created_at && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Создана</div>
                    <div className="text-sm">
                      {new Date(selectedDeal.created_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                )}

                {selectedDeal.updated_at && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Изменена</div>
                    <div className="text-sm">
                      {new Date(selectedDeal.updated_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => handleDelete(selectedDeal.id)}
                  className="flex items-center gap-2 px-4 py-2 text-destructive border border-destructive rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </button>
                <button
                  onClick={() => setSelectedDeal(null)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
