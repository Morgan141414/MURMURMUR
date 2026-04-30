import { useEffect, useState, useCallback, useMemo } from 'react'
import { listLeads, createLead, deleteLead, updateLead, createDeal, listPipelines } from '../../api/crm'
import { listUsers } from '../../api/users'
import type { Lead, LeadCreate, LeadUpdate, LeadStatus, DealCreate, PipelineWithStages } from '../../types/crm'
import type { TaskColumn, User } from '@/types'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { ViewSwitcher, type ViewType } from '@/components/crm/ViewSwitcher'
import { ArrowRight, X, Plus, CheckCircle2, UserPlus } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'

const LEAD_STATUSES = [
  { value: 'New', label: 'Новый', color: '#3b82f6' },
  { value: 'Qualified', label: 'Квалифицирован', color: '#22c55e' },
  { value: 'Unqualified', label: 'Не квалифицирован', color: '#ef4444' },
  { value: 'Converted', label: 'Конвертирован', color: '#8b5cf6' },
]

interface LeadColumnProps {
  status: typeof LEAD_STATUSES[number]
  leads: Lead[]
  users: User[]
  onOpenDetail: (lead: Lead) => void
  onAssignToMe: (leadId: string) => void
  onOpenConvert: (lead: Lead) => void
  onQuickCreate: () => void
}

function LeadColumn({
  status,
  leads,
  users,
  onOpenDetail,
  onAssignToMe,
  onOpenConvert,
  onQuickCreate,
}: LeadColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-drop:${status.value}`,
    data: { type: 'column-drop', columnId: status.value },
  })

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b" style={{ borderColor: status.color }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold" style={{ color: status.color }}>
              {status.label}
            </h3>
            <span className="text-sm text-muted-foreground">
              {leads.length}
            </span>
          </div>
          {status.value !== 'Converted' && (
            <button
              onClick={onQuickCreate}
              className="flex items-center justify-center gap-1 w-full px-2 py-1.5 text-xs font-medium border border-dashed rounded hover:bg-accent transition-colors"
              style={{ borderColor: status.color, color: status.color }}
            >
              <Plus className="h-3.5 w-3.5" />
              Быстрый лид
            </button>
          )}
        </div>
        <SortableContext
          items={leads.map(l => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className={`p-2 space-y-2 max-h-[600px] overflow-y-auto ${isOver ? 'bg-primary/5' : ''}`}
          >
            {leads.map((lead) => {
              const owner = users.find(u => u.id === lead.owner_id)
              const hasOwner = !!lead.owner_id

              return (
                <DraggableLeadCard
                  key={lead.id}
                  lead={lead}
                  owner={owner}
                  hasOwner={hasOwner}
                  onOpenDetail={onOpenDetail}
                  onAssignToMe={onAssignToMe}
                  onOpenConvert={onOpenConvert}
                />
              )
            })}
            {leads.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Нет лидов
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

interface DraggableLeadCardProps {
  lead: Lead
  owner?: User
  hasOwner: boolean
  onOpenDetail: (lead: Lead) => void
  onAssignToMe: (leadId: string) => void
  onOpenConvert: (lead: Lead) => void
}

function DraggableLeadCard({
  lead,
  owner,
  hasOwner,
  onOpenDetail,
  onAssignToMe,
  onOpenConvert,
}: DraggableLeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpenDetail(lead)}
      className="p-3 bg-background rounded-lg border hover:border-primary/50 transition-colors space-y-2 cursor-pointer"
    >
      <div className="font-medium text-sm">
        {lead.first_name} {lead.last_name}
      </div>
      {lead.organization_name && (
        <div className="text-xs text-muted-foreground">{lead.organization_name}</div>
      )}
      {lead.email && (
        <div className="text-xs text-muted-foreground">{lead.email}</div>
      )}
      {lead.mobile_no && (
        <div className="text-xs text-muted-foreground">{lead.mobile_no}</div>
      )}

      {/* Ответственный */}
      <div className="pt-2 border-t border-border/50">
        {hasOwner ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
              {owner?.full_name?.[0]?.toUpperCase() || owner?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {owner?.full_name || owner?.email || 'Пользователь'}
            </span>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAssignToMe(lead.id)
            }}
            className="flex items-center justify-center gap-1 w-full px-2 py-1 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded transition-all"
          >
            <UserPlus className="h-3 w-3" />
            <span>Назначить мне</span>
          </button>
        )}
      </div>

      {/* Кнопки действий */}
      {lead.status === 'Converted' ? (
        <div className="text-xs text-center text-muted-foreground py-1.5 bg-purple-500/10 rounded">
          ✓ Конвертирован в сделку
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenConvert(lead)
          }}
          className="flex items-center gap-1 w-full justify-center px-2 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors"
        >
          <ArrowRight className="h-3 w-3" />
          В сделку
        </button>
      )}
    </div>
  )
}

export default function LeadsPage() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const currentUserId = useAuthStore((s) => s.userId)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([])
  const [quickCreateStatus, setQuickCreateStatus] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('leads-view')
    return (saved as ViewType) || 'kanban'
  })
  const [formData, setFormData] = useState<LeadCreate>({
    first_name: '',
    last_name: '',
    email: '',
    mobile_no: '',
    organization_name: '',
  })
  const [convertFormData, setConvertFormData] = useState({
    pipelineId: '',
    stageId: '',
    amount: '',
    closeDate: '',
  })
  const [activeLead, setActiveLead] = useState<Lead | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const loadLeads = useCallback(async () => {
    if (!activeOrgId) {
      setLeads([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await listLeads(activeOrgId)
      // Backend returns {data: [...]}
      const leadsData = (response.data as any)?.data || response.data || []
      setLeads(leadsData)
    } catch (err: any) {
      console.error('Failed to load leads:', err)
      setError(err?.response?.data?.detail || 'Не удалось загрузить лиды')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  const loadPipelines = useCallback(async () => {
    if (!activeOrgId) return

    try {
      const response = await listPipelines(activeOrgId)
      const data = (response.data as any)?.data || response.data || []
      setPipelines(data)

      // Автоматически выбираем первый пайплайн
      if (data.length > 0) {
        const defaultPipeline = data.find((p: PipelineWithStages) => p.is_default) || data[0]
        setConvertFormData(prev => ({
          ...prev,
          pipelineId: defaultPipeline.id,
          stageId: defaultPipeline.stages?.[0]?.id || '',
        }))
      }
    } catch (err) {
      console.error('Failed to load pipelines:', err)
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
    loadLeads()
    loadPipelines()
    loadUsers()
  }, [loadLeads, loadPipelines, loadUsers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId) return

    try {
      await createLead(activeOrgId, formData)
      setShowCreateForm(false)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        mobile_no: '',
        organization_name: '',
      })
      loadLeads()
    } catch (err) {
      console.error('Failed to create lead:', err)
      alert('Не удалось создать лид')
    }
  }

  const handleDelete = async (leadId: string) => {
    if (!activeOrgId) return
    if (!confirm('Удалить этот лид?')) return

    try {
      await deleteLead(activeOrgId, leadId)
      loadLeads()
    } catch (err) {
      console.error('Failed to delete lead:', err)
      alert('Не удалось удалить лид')
    }
  }

  const handleOpenDetail = (lead: Lead) => {
    setSelectedLead(lead)
    setShowDetailModal(true)
  }

  const handleOpenConvert = (lead: Lead) => {
    setSelectedLead(lead)
    setShowConvertModal(true)

    // Устанавливаем дефолтную дату закрытия (через месяц)
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    setConvertFormData(prev => ({
      ...prev,
      closeDate: nextMonth.toISOString().split('T')[0],
    }))
  }

  const handleConvertToDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId || !selectedLead) return

    if (!convertFormData.pipelineId || !convertFormData.stageId) {
      alert('Выберите воронку и этап')
      return
    }

    try {
      // Создаем сделку из лида
      const dealData: DealCreate = {
        name: `${selectedLead.first_name} ${selectedLead.last_name}${selectedLead.organization_name ? ' - ' + selectedLead.organization_name : ''}`,
        contact_name: `${selectedLead.first_name} ${selectedLead.last_name}`,
        organization_name: selectedLead.organization_name || undefined,
        stage_id: convertFormData.stageId,
        pipeline_id: convertFormData.pipelineId,
        annual_revenue: convertFormData.amount ? parseFloat(convertFormData.amount) : undefined,
        close_date: convertFormData.closeDate ? new Date(convertFormData.closeDate).toISOString() : undefined,
        notes: `Конвертирован из лида: ${selectedLead.first_name} ${selectedLead.last_name}\nТелефон: ${selectedLead.mobile_no || selectedLead.phone || '—'}\nEmail: ${selectedLead.email || '—'}`,
        probability: 50,
      }

      await createDeal(activeOrgId, dealData)

      // Обновляем статус лида на "Converted"
      await updateLead(activeOrgId, selectedLead.id, { status: 'Converted' })

      // Закрываем модал и обновляем список
      setShowConvertModal(false)
      setConvertFormData({
        pipelineId: pipelines[0]?.id || '',
        stageId: pipelines[0]?.stages?.[0]?.id || '',
        amount: '',
        closeDate: '',
      })
      loadLeads()

      // Показываем красивое модальное окно успеха
      setShowSuccessModal(true)
    } catch (err) {
      console.error('Failed to convert lead:', err)
      alert('Не удалось конвертировать лид в сделку')
    }
  }

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    localStorage.setItem('leads-view', view)
  }

  const handleQuickCreateLead = async (status: string, leadData: Partial<Lead>) => {
    if (!activeOrgId) return

    try {
      const newLead: LeadCreate = {
        first_name: leadData.first_name || 'Новый лид',
        last_name: leadData.last_name,
        email: leadData.email,
        mobile_no: leadData.mobile_no,
        organization_name: leadData.organization_name,
        status: status as LeadStatus,
      }

      await createLead(activeOrgId, newLead)
      setQuickCreateStatus(null)
      loadLeads()
    } catch (err) {
      console.error('Failed to create quick lead:', err)
      alert('Не удалось создать лид')
    }
  }

  const handleAssignLeadToMe = async (leadId: string) => {
    if (!activeOrgId || !currentUserId) return

    try {
      await updateLead(activeOrgId, leadId, { owner_id: currentUserId })
      loadLeads()
    } catch (err) {
      console.error('Failed to assign lead:', err)
      alert('Не удалось назначить ответственного')
    }
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const lead = leads.find(l => l.id === event.active.id)
    if (lead) setActiveLead(lead)
  }, [leads])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveLead(null)
    const { active, over } = event
    if (!over || !activeOrgId) return

    const leadId = active.id as string
    let newStatus: LeadStatus | undefined
    const overType = over.data.current?.type

    // Проверяем куда упал элемент
    if (overType === 'column-drop') {
      // Если на колонку
      newStatus = over.data.current?.columnId as LeadStatus
    } else {
      // Если на другой лид, берем его статус
      const overLead = leads.find(l => l.id === over.id)
      if (overLead) {
        newStatus = overLead.status as LeadStatus
      }
    }

    if (!newStatus) return

    // Проверяем что статус изменился
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === newStatus) return

    try {
      await updateLead(activeOrgId, leadId, { status: newStatus })
      await loadLeads()
    } catch (err) {
      console.error('Failed to update lead status:', err)
      alert('Не удалось обновить статус лида')
    }
  }, [leads, activeOrgId, loadLeads])

  const leadsByStatus = useMemo(() => {
    const grouped: Record<string, Lead[]> = {}
    LEAD_STATUSES.forEach(status => {
      grouped[status.value] = []
    })
    leads.forEach(lead => {
      const status = lead.status || 'New'
      if (grouped[status]) {
        grouped[status].push(lead)
      }
    })
    return grouped
  }, [leads])

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Лиды</h1>
        <div className="flex items-center gap-3">
          <ViewSwitcher currentView={currentView} onViewChange={handleViewChange} />
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Создать лид
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Новый лид</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Имя *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Фамилия</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Телефон</label>
                <input
                  type="tel"
                  value={formData.mobile_no}
                  onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Компания</label>
                <input
                  type="text"
                  value={formData.organization_name}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border rounded hover:bg-accent"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно конвертации лида в сделку */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Конвертировать лид в сделку</h2>
              <button
                onClick={() => {
                  setShowConvertModal(false)
                  setSelectedLead(null)
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConvertToDeal} className="space-y-4">
              {/* Информация о лиде */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Данные из лида:</h3>
                <div className="text-sm">
                  <span className="font-medium">Имя:</span> {selectedLead.first_name} {selectedLead.last_name}
                </div>
                {selectedLead.organization_name && (
                  <div className="text-sm">
                    <span className="font-medium">Компания:</span> {selectedLead.organization_name}
                  </div>
                )}
                {selectedLead.mobile_no && (
                  <div className="text-sm">
                    <span className="font-medium">Телефон:</span> {selectedLead.mobile_no}
                  </div>
                )}
                {selectedLead.email && (
                  <div className="text-sm">
                    <span className="font-medium">Email:</span> {selectedLead.email}
                  </div>
                )}
              </div>

              {/* Выбор воронки */}
              <div>
                <label className="block text-sm font-medium mb-1">Воронка *</label>
                <select
                  value={convertFormData.pipelineId}
                  onChange={(e) => {
                    const pipeline = pipelines.find(p => p.id === e.target.value)
                    setConvertFormData({
                      ...convertFormData,
                      pipelineId: e.target.value,
                      stageId: pipeline?.stages?.[0]?.id || '',
                    })
                  }}
                  className="w-full px-3 py-2 border rounded bg-background"
                  required
                >
                  <option value="">Выберите воронку</option>
                  {pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Выбор этапа */}
              {convertFormData.pipelineId && (
                <div>
                  <label className="block text-sm font-medium mb-1">Этап *</label>
                  <select
                    value={convertFormData.stageId}
                    onChange={(e) => setConvertFormData({ ...convertFormData, stageId: e.target.value })}
                    className="w-full px-3 py-2 border rounded bg-background"
                    required
                  >
                    <option value="">Выберите этап</option>
                    {pipelines
                      .find(p => p.id === convertFormData.pipelineId)
                      ?.stages?.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Сумма сделки */}
              <div>
                <label className="block text-sm font-medium mb-1">Сумма сделки</label>
                <input
                  type="number"
                  value={convertFormData.amount}
                  onChange={(e) => setConvertFormData({ ...convertFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-background"
                  placeholder="0"
                />
              </div>

              {/* Дата закрытия */}
              <div>
                <label className="block text-sm font-medium mb-1">Предполагаемая дата закрытия</label>
                <input
                  type="date"
                  value={convertFormData.closeDate}
                  onChange={(e) => setConvertFormData({ ...convertFormData, closeDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-background"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertModal(false)
                    setSelectedLead(null)
                  }}
                  className="px-4 py-2 border rounded hover:bg-accent"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  <ArrowRight className="h-4 w-4" />
                  Создать сделку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно успешной конвертации */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Лид конвертирован!
            </h3>
            <p className="text-muted-foreground mb-2">
              Сделка успешно создана для
            </p>
            {selectedLead && (
              <p className="text-lg font-semibold text-foreground mb-6">
                {selectedLead.first_name} {selectedLead.last_name}
                {selectedLead.organization_name && (
                  <span className="block text-sm text-muted-foreground font-normal mt-1">
                    {selectedLead.organization_name}
                  </span>
                )}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setSelectedLead(null)
                }}
                className="flex-1 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
              >
                Отлично
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setSelectedLead(null)
                  window.location.href = '/company/crm/deals'
                }}
                className="flex-1 px-6 py-2.5 border border-border rounded-lg hover:bg-accent font-medium transition-colors"
              >
                К сделкам
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно деталей лида */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedLead.first_name} {selectedLead.last_name}
                </h2>
                <div className="mt-1">
                  <span
                    className="inline-block px-2.5 py-1 rounded-md text-sm font-medium"
                    style={{
                      backgroundColor: LEAD_STATUSES.find(s => s.value === selectedLead.status)?.color + '20' || '#3b82f620',
                      color: LEAD_STATUSES.find(s => s.value === selectedLead.status)?.color || '#3b82f6',
                    }}
                  >
                    {LEAD_STATUSES.find(s => s.value === selectedLead.status)?.label || selectedLead.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedLead(null)
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Ответственный */}
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Ответственный</span>
                {selectedLead.owner_id ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {users.find(u => u.id === selectedLead.owner_id)?.full_name?.[0]?.toUpperCase() ||
                       users.find(u => u.id === selectedLead.owner_id)?.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium">
                      {users.find(u => u.id === selectedLead.owner_id)?.full_name ||
                       users.find(u => u.id === selectedLead.owner_id)?.email || 'Пользователь'}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssignLeadToMe(selectedLead.id)
                      setShowDetailModal(false)
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded-md transition-all"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Назначить мне</span>
                  </button>
                )}
              </div>

              {/* Контактная информация */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Контактная информация</h3>
                {selectedLead.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <a href={`mailto:${selectedLead.email}`} className="text-sm font-medium text-primary hover:underline">
                      {selectedLead.email}
                    </a>
                  </div>
                )}
                {selectedLead.mobile_no && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Телефон</span>
                    <a href={`tel:${selectedLead.mobile_no}`} className="text-sm font-medium text-primary hover:underline">
                      {selectedLead.mobile_no}
                    </a>
                  </div>
                )}
                {selectedLead.organization_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Компания</span>
                    <span className="text-sm font-medium">{selectedLead.organization_name}</span>
                  </div>
                )}
                {selectedLead.website && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Веб-сайт</span>
                    <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                      {selectedLead.website}
                    </a>
                  </div>
                )}
              </div>

              {/* Дополнительная информация */}
              {(selectedLead.city || selectedLead.country || selectedLead.industry) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">Дополнительная информация</h3>
                  {selectedLead.city && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Город</span>
                      <span className="text-sm font-medium">{selectedLead.city}</span>
                    </div>
                  )}
                  {selectedLead.country && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Страна</span>
                      <span className="text-sm font-medium">{selectedLead.country}</span>
                    </div>
                  )}
                  {selectedLead.industry && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Отрасль</span>
                      <span className="text-sm font-medium">{selectedLead.industry}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Заметки */}
              {selectedLead.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">Заметки</h3>
                  <div className="p-3 bg-muted/20 rounded-lg text-sm">
                    {selectedLead.notes}
                  </div>
                </div>
              )}

              {/* Действия */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedLead.status !== 'Converted' && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false)
                      handleOpenConvert(selectedLead)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Конвертировать в сделку
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (confirm('Удалить этот лид?')) {
                      await handleDelete(selectedLead.id)
                      setShowDetailModal(false)
                      setSelectedLead(null)
                    }
                  }}
                  className="px-4 py-2.5 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 font-medium transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно быстрого создания лида */}
      {quickCreateStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: LEAD_STATUSES.find(s => s.value === quickCreateStatus)?.color }}
                />
                <h3 className="text-lg font-semibold">Быстрый лид</h3>
              </div>
              <button
                onClick={() => setQuickCreateStatus(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
              <span className="text-sm text-muted-foreground">Статус:</span>{' '}
              <span
                className="text-sm font-semibold"
                style={{ color: LEAD_STATUSES.find(s => s.value === quickCreateStatus)?.color }}
              >
                {LEAD_STATUSES.find(s => s.value === quickCreateStatus)?.label}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const formData = new FormData(form)
                handleQuickCreateLead(quickCreateStatus, {
                  first_name: formData.get('first_name') as string,
                  last_name: formData.get('last_name') as string,
                  mobile_no: formData.get('mobile_no') as string,
                  email: formData.get('email') as string,
                  organization_name: formData.get('organization_name') as string,
                })
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium mb-1.5">Имя *</label>
                <input
                  type="text"
                  name="first_name"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Иван"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Фамилия</label>
                <input
                  type="text"
                  name="last_name"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Иванов"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Телефон</label>
                <input
                  type="tel"
                  name="mobile_no"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="ivan@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Компания</label>
                <input
                  type="text"
                  name="organization_name"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="ООО Ромашка"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
                >
                  Создать лид
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCreateStatus(null)}
                  className="px-4 py-2.5 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentView === 'list' ? (
        <div className="bg-card rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Имя</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Телефон</th>
                <th className="text-left p-4">Компания</th>
                <th className="text-left p-4">Статус</th>
                <th className="text-left p-4">Ответственный</th>
                <th className="text-left p-4">Действия</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground">
                    Нет лидов. Создайте первый лид!
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const owner = users.find(u => u.id === lead.owner_id)
                  const hasOwner = !!lead.owner_id

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleOpenDetail(lead)}
                      className="border-b hover:bg-accent/50 cursor-pointer"
                    >
                      <td className="p-4">
                        {lead.first_name} {lead.last_name}
                      </td>
                      <td className="p-4">{lead.email || '—'}</td>
                      <td className="p-4">{lead.mobile_no || lead.phone || '—'}</td>
                      <td className="p-4">{lead.organization_name || '—'}</td>
                      <td className="p-4">
                        <span
                          className="px-2 py-1 rounded text-sm"
                          style={{
                            backgroundColor: LEAD_STATUSES.find(s => s.value === lead.status)?.color + '20' || '#3b82f620',
                            color: LEAD_STATUSES.find(s => s.value === lead.status)?.color || '#3b82f6',
                          }}
                        >
                          {LEAD_STATUSES.find(s => s.value === lead.status)?.label || lead.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {hasOwner ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {owner?.full_name?.[0]?.toUpperCase() || owner?.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="text-sm text-foreground">
                              {owner?.full_name || owner?.email || 'Пользователь'}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAssignLeadToMe(lead.id)
                            }}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Мне</span>
                          </button>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {lead.status !== 'Converted' && (
                            <button
                              onClick={() => handleOpenConvert(lead)}
                              className="flex items-center gap-1 text-primary hover:underline text-sm font-medium"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                              В сделку
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="text-destructive hover:underline text-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {LEAD_STATUSES.map((status) => (
              <LeadColumn
                key={status.value}
                status={status}
                leads={leadsByStatus[status.value] || []}
                users={users}
                onOpenDetail={handleOpenDetail}
                onAssignToMe={handleAssignLeadToMe}
                onOpenConvert={handleOpenConvert}
                onQuickCreate={() => setQuickCreateStatus(status.value)}
              />
            ))}
          </div>

        <DragOverlay>
          {activeLead ? (
            <div className="p-3 bg-background rounded-lg border border-primary shadow-lg space-y-2 w-80 opacity-90">
              <div className="font-medium text-sm">
                {activeLead.first_name} {activeLead.last_name}
              </div>
              {activeLead.organization_name && (
                <div className="text-xs text-muted-foreground">{activeLead.organization_name}</div>
              )}
              {activeLead.email && (
                <div className="text-xs text-muted-foreground">{activeLead.email}</div>
              )}
              {activeLead.mobile_no && (
                <div className="text-xs text-muted-foreground">{activeLead.mobile_no}</div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}
    </div>
  )
}
