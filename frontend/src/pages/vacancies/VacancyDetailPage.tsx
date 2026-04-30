import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { ArrowLeft, CalendarClock, Clock, DollarSign, FileText, Loader2, MapPin, MessageSquare, Send, Star } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import {
  useApplyToVacancy,
  useCreateHiringOffer,
  useCreateRecruiterNote,
  useCreateVacancyInterview,
  useHiringOffers,
  useRecruiterNotes,
  useVacancy,
  useVacancyApplication,
  useVacancyApplications,
  useVacancyInterviews,
  useUpdateHiringOffer,
  useUpdateVacancyApplication,
  useUpdateVacancyInterview,
} from '@/hooks/useVacancies'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EntityActivityFeed } from '@/components/shared/EntityActivityFeed'

const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none'
const textareaClass = 'min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none'

const interviewStatusOptions = ['scheduled', 'completed', 'feedback_ready', 'cancelled']
const applicationStages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']

function formatDateTime(value?: string | null) {
  if (!value) return 'Не назначено'
  return new Date(value).toLocaleString()
}

export default function VacancyDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const orgId = activeOrgId ?? searchParams.get('orgId')
  const role = useOrgStore((s) => s.activeOrgRole())
  const { data: vacancy, isLoading: loading } = useVacancy(orgId, id ?? null)
  const { data: applications = [] } = useVacancyApplications(orgId, id ?? null)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const { data: selectedApplication } = useVacancyApplication(orgId, id ?? null, selectedApplicationId)
  const { data: interviews = [] } = useVacancyInterviews(orgId, id ?? null, selectedApplicationId)
  const { data: notes = [] } = useRecruiterNotes(orgId, id ?? null, selectedApplicationId)
  const { data: offers = [] } = useHiringOffers(orgId, id ?? null, selectedApplicationId)
  const applyToVacancy = useApplyToVacancy(orgId ?? '', id ?? '')
  const updateApplication = useUpdateVacancyApplication(orgId ?? '', id ?? '')
  const createInterview = useCreateVacancyInterview(orgId ?? '', id ?? '', selectedApplicationId ?? '')
  const updateInterview = useUpdateVacancyInterview(orgId ?? '', id ?? '', selectedApplicationId ?? '')
  const createNote = useCreateRecruiterNote(orgId ?? '', id ?? '', selectedApplicationId ?? '')
  const createOffer = useCreateHiringOffer(orgId ?? '', id ?? '', selectedApplicationId ?? '')
  const updateOffer = useUpdateHiringOffer(orgId ?? '', id ?? '', selectedApplicationId ?? '')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [interviewerName, setInterviewerName] = useState('')
  const [interviewAt, setInterviewAt] = useState('')
  const [interviewFormat, setInterviewFormat] = useState('online')
  const [stage, setStage] = useState('screening')
  const [candidateStatus, setCandidateStatus] = useState('in_review')
  const [rating, setRating] = useState('4')
  const [summary, setSummary] = useState('')
  const [nextStepAt, setNextStepAt] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [offerTitle, setOfferTitle] = useState('')
  const [offerSalary, setOfferSalary] = useState('')
  const [offerBenefits, setOfferBenefits] = useState('')
  const [offerTerms, setOfferTerms] = useState('')
  const [offerExpiry, setOfferExpiry] = useState('')

  const canReviewApplications = useMemo(() => ['hr', 'ceo', 'founder', 'superadmin', 'recruiter', 'hiring_manager'].includes(role ?? ''), [role])

  useEffect(() => {
    if (!selectedApplicationId && applications.length > 0) {
      setSelectedApplicationId(applications[0].id)
    }
  }, [applications, selectedApplicationId])

  useEffect(() => {
    if (!selectedApplication) return
    setStage(selectedApplication.stage || 'screening')
    setCandidateStatus(selectedApplication.status || 'in_review')
    setRating(selectedApplication.rating ? String(selectedApplication.rating) : '4')
    setSummary(selectedApplication.recruiter_summary || '')
    setNextStepAt(selectedApplication.next_step_at ? selectedApplication.next_step_at.slice(0, 16) : '')
    setRejectionReason(selectedApplication.rejection_reason || '')
  }, [selectedApplication])

  async function handleApply() {
    if (!orgId || !id) return
    if (!fullName.trim() || !email.trim()) return toast.error('Заполните имя и почту')
    try {
      await applyToVacancy.mutateAsync({
        full_name: fullName.trim(),
        email: email.trim(),
        cover_letter: coverLetter.trim() || undefined,
        source: activeOrgId ? 'internal' : 'marketplace',
      })
      setFullName('')
      setEmail('')
      setCoverLetter('')
      toast.success('Отклик отправлен')
    } catch {
      toast.error('Не удалось отправить отклик')
    }
  }

  async function handleApplicationSave() {
    if (!selectedApplicationId) return
    try {
      await updateApplication.mutateAsync({
        applicationId: selectedApplicationId,
        body: {
          stage,
          status: candidateStatus,
          rating: Number(rating),
          recruiter_summary: summary.trim() || undefined,
          next_step_at: nextStepAt || undefined,
          rejection_reason: rejectionReason.trim() || undefined,
        },
      })
      toast.success('Карточка кандидата обновлена')
    } catch {
      toast.error('Не удалось обновить карточку кандидата')
    }
  }

  async function handleCreateInterview() {
    if (!selectedApplicationId) return
    try {
      await createInterview.mutateAsync({
        stage,
        interviewer_name: interviewerName.trim() || undefined,
        scheduled_at: interviewAt || undefined,
        format: interviewFormat,
        status: 'scheduled',
      })
      setInterviewerName('')
      setInterviewAt('')
      toast.success('Интервью добавлено')
    } catch {
      toast.error('Не удалось создать интервью')
    }
  }

  async function handleCompleteInterview(interviewId: string) {
    try {
      await updateInterview.mutateAsync({ interviewId, body: { status: 'completed' } })
      toast.success('Интервью отмечено завершённым')
    } catch {
      toast.error('Не удалось обновить интервью')
    }
  }

  async function handleCreateNote() {
    if (!selectedApplicationId || !noteBody.trim()) return
    try {
      await createNote.mutateAsync({ body: noteBody.trim(), visibility: 'internal' })
      setNoteBody('')
      toast.success('Заметка сохранена')
    } catch {
      toast.error('Не удалось сохранить заметку')
    }
  }

  async function handleCreateOffer() {
    if (!selectedApplicationId || !vacancy) return
    try {
      await createOffer.mutateAsync({
        status: 'sent',
        title: offerTitle.trim() || `${vacancy.title} Offer`,
        salary_amount: offerSalary ? Number(offerSalary) : undefined,
        benefits: offerBenefits.split(',').map((item) => item.trim()).filter(Boolean),
        terms: offerTerms.trim() || undefined,
        expires_at: offerExpiry || undefined,
      })
      setOfferTitle('')
      setOfferSalary('')
      setOfferBenefits('')
      setOfferTerms('')
      setOfferExpiry('')
      toast.success('Оффер создан')
    } catch {
      toast.error('Не удалось создать оффер')
    }
  }

  async function handleOfferDecision(offerId: string, status: 'accepted' | 'declined') {
    try {
      await updateOffer.mutateAsync({ offerId, body: { status } })
      toast.success(status === 'accepted' ? 'Оффер принят' : 'Оффер отклонён')
    } catch {
      toast.error('Не удалось обновить статус оффера')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!vacancy) {
    return (
      <div className="page-enter space-y-6">
        <Link to="/vacancies" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('common.back')}
        </Link>
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-foreground">{t('vacancies.notFound')}</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter mx-auto max-w-6xl space-y-6">
      <Link to="/vacancies" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t('vacancies.backToList')}
      </Link>

      <div className="rounded-lg border border-border bg-card p-6">
        <PageHeader title={vacancy.title} description={!activeOrgId ? 'Публичная карточка вакансии. Можно откликнуться без вступления в компанию.' : undefined} />

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
            workflow: {vacancy.status} / {vacancy.approval_status}
          </span>
          {vacancy.city ? <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{vacancy.city}</span> : null}
          {vacancy.employment_type ? <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{vacancy.employment_type}</span> : null}
          {vacancy.experience_years != null ? <span className="flex items-center gap-1.5"><Star className="h-4 w-4" />{vacancy.experience_years} {t('profile.years')}</span> : null}
          {(vacancy.salary_from || vacancy.salary_to) ? (
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              {vacancy.salary_from && vacancy.salary_to
                ? `${vacancy.salary_from.toLocaleString()} – ${vacancy.salary_to.toLocaleString()}`
                : vacancy.salary_from
                  ? `${t('vacancies.from')} ${vacancy.salary_from.toLocaleString()}`
                  : `${t('vacancies.to')} ${vacancy.salary_to!.toLocaleString()}`}
            </span>
          ) : null}
        </div>

        {vacancy.skills.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {vacancy.skills.map((skill) => (
              <span key={skill} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{skill}</span>
            ))}
          </div>
        ) : null}

        {vacancy.description ? (
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="mb-3 text-base font-semibold text-foreground">{t('vacancies.description')}</h3>
            <div className="prose prose-sm whitespace-pre-wrap text-foreground/80">{vacancy.description}</div>
          </div>
        ) : null}

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="mb-3 text-base font-semibold text-foreground">Откликнуться на вакансию</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Имя" required>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Ваше имя" />
            </FormField>
            <FormField label="Email" required>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
            </FormField>
            <FormField label="Сопроводительное письмо" className="md:col-span-2">
              <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className={textareaClass} placeholder="Коротко расскажите о себе" />
            </FormField>
          </div>
          <div className="mt-4">
            <Button onClick={() => void handleApply()} disabled={applyToVacancy.isPending}>
              <Send className="h-4 w-4" />
              Отправить отклик
            </Button>
          </div>
        </div>
      </div>

      {canReviewApplications ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">Pipeline кандидатов</h3>
                <span className="text-sm text-muted-foreground">{applications.length} откликов</span>
              </div>
              {applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Пока нет откликов по этой вакансии.</p>
              ) : (
                <div className="space-y-3">
                  {applications.map((application) => (
                    <button
                      key={application.id}
                      onClick={() => setSelectedApplicationId(application.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        selectedApplicationId === application.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-accent'
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{application.full_name}</p>
                          <p className="text-sm text-muted-foreground">{application.email}</p>
                          {application.cover_letter ? <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{application.cover_letter}</p> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge variant={application.status === 'hired' ? 'success' : application.status === 'rejected' ? 'error' : 'warning'}>
                            {application.status}
                          </StatusBadge>
                          <span className="rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
                            {application.stage}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedApplication ? (
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Карточка кандидата</h3>
                    <p className="text-sm text-muted-foreground">{selectedApplication.full_name} · {selectedApplication.email}</p>
                  </div>
                  <StatusBadge variant={selectedApplication.status === 'hired' ? 'success' : selectedApplication.status === 'rejected' ? 'error' : 'warning'}>
                    {selectedApplication.status}
                  </StatusBadge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Этап">
                    <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
                      {applicationStages.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Статус">
                    <input value={candidateStatus} onChange={(e) => setCandidateStatus(e.target.value)} className={inputClass} placeholder="in_review" />
                  </FormField>
                  <FormField label="Рейтинг">
                    <input value={rating} onChange={(e) => setRating(e.target.value)} type="number" min="1" max="5" className={inputClass} />
                  </FormField>
                  <FormField label="Следующий шаг">
                    <input value={nextStepAt} onChange={(e) => setNextStepAt(e.target.value)} type="datetime-local" className={inputClass} />
                  </FormField>
                  <FormField label="Комментарий рекрутера" className="md:col-span-2">
                    <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className={textareaClass} placeholder="Краткое summary по кандидату" />
                  </FormField>
                  <FormField label="Причина отказа" className="md:col-span-2">
                    <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className={textareaClass} placeholder="Заполняется только если кандидат отклонён" />
                  </FormField>
                </div>
                <div className="mt-4">
                  <Button onClick={() => void handleApplicationSave()} disabled={updateApplication.isPending}>Сохранить карточку</Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            {selectedApplication ? (
              <>
                <div className="rounded-lg border border-border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">Интервью</h3>
                  </div>
                  <div className="grid gap-3">
                    <input value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} className={inputClass} placeholder="Интервьюер" />
                    <input value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)} type="datetime-local" className={inputClass} />
                    <select value={interviewFormat} onChange={(e) => setInterviewFormat(e.target.value)} className={inputClass}>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="phone">Phone</option>
                    </select>
                    <Button onClick={() => void handleCreateInterview()} disabled={createInterview.isPending}>Назначить интервью</Button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {interviews.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Интервью ещё не назначались.</p>
                    ) : interviews.map((interview) => (
                      <div key={interview.id} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{interview.interviewer_name || 'Интервью без имени интервьюера'}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(interview.scheduled_at)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{interview.stage} · {interview.format || 'format tbd'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge variant={interview.status === 'completed' ? 'success' : interview.status === 'cancelled' ? 'error' : 'warning'}>
                              {interview.status}
                            </StatusBadge>
                            {interviewStatusOptions.includes(interview.status) && interview.status !== 'completed' ? (
                              <Button size="sm" variant="outline" onClick={() => void handleCompleteInterview(interview.id)}>
                                Complete
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">Заметки рекрутера</h3>
                  </div>
                  <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} className={textareaClass} placeholder="Добавьте внутреннюю заметку по кандидату" />
                  <div className="mt-3">
                    <Button onClick={() => void handleCreateNote()} disabled={createNote.isPending}>Сохранить заметку</Button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Внутренних заметок пока нет.</p>
                    ) : notes.map((note) => (
                      <div key={note.id} className="rounded-xl border border-border bg-background p-4">
                        <p className="text-sm text-foreground">{note.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(note.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">Офферы</h3>
                  </div>
                  <div className="grid gap-3">
                    <input value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} className={inputClass} placeholder="Senior Backend Engineer Offer" />
                    <input value={offerSalary} onChange={(e) => setOfferSalary(e.target.value)} type="number" className={inputClass} placeholder="2000000" />
                    <input value={offerBenefits} onChange={(e) => setOfferBenefits(e.target.value)} className={inputClass} placeholder="Medical insurance, Bonus, Remote setup" />
                    <input value={offerExpiry} onChange={(e) => setOfferExpiry(e.target.value)} type="datetime-local" className={inputClass} />
                    <textarea value={offerTerms} onChange={(e) => setOfferTerms(e.target.value)} className={textareaClass} placeholder="Ключевые условия оффера" />
                    <Button onClick={() => void handleCreateOffer()} disabled={createOffer.isPending}>Создать оффер</Button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {offers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Офферов пока нет.</p>
                    ) : offers.map((offer) => (
                      <div key={offer.id} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{offer.title || 'Offer'}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {offer.salary_amount ? `${offer.salary_amount.toLocaleString()} ${offer.currency}` : 'Salary TBD'}
                            </p>
                            {offer.terms ? <p className="mt-2 text-sm text-muted-foreground">{offer.terms}</p> : null}
                          </div>
                          <StatusBadge variant={offer.status === 'accepted' ? 'success' : offer.status === 'declined' ? 'error' : 'warning'}>
                            {offer.status}
                          </StatusBadge>
                        </div>
                        {offer.benefits.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {offer.benefits.map((benefit) => (
                              <span key={benefit} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{benefit}</span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={() => void handleOfferDecision(offer.id, 'accepted')}>Accept</Button>
                          <Button size="sm" variant="destructive" onClick={() => void handleOfferDecision(offer.id, 'declined')}>Decline</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {orgId ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <EntityActivityFeed
            orgId={orgId}
            entityType="vacancy"
            entityId={id ?? null}
            title="Activity по вакансии"
            limit={25}
          />
          <EntityActivityFeed
            orgId={orgId}
            entityType="application"
            entityId={selectedApplicationId}
            title="Activity по кандидату"
            limit={25}
          />
        </div>
      ) : null}
    </div>
  )
}
