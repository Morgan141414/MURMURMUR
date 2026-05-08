import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import axios from 'axios'
import {
  Building2, Users, ArrowRight, ArrowLeft, Plus, Loader2, Sparkles,
  CheckCircle2, Briefcase, Factory, GraduationCap, ShoppingBag, Stethoscope,
  Code2, Landmark, Truck, Palette, Rocket, Globe, Shield, CreditCard,
  Star, Crown, Zap, BarChart3, Lock, UserPlus, Mail, Copy, Check,
  ChevronRight, Paperclip, FileImage, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateOrg, useJoinOrg } from '@/hooks/useOrg'
import { getOrg, getOrgRegistrationSubmission, getRegistrationProfiles, updateOrgRegistrationSubmission } from '@/api/orgs'
import type { CompanyAccount, ModerationDocument, RegistrationProfile } from '@/types'
import { toast } from 'sonner'

/* ═══════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════ */

type WizardPath = null | 'create' | 'join'
type RegistrationKind = 'company' | 'startup'
type CreateStep = 'industry' | 'details' | 'plan' | 'invite' | 'review'
type RequiredCompanyDocumentType = string

type RegistrationProfileOption = RegistrationProfile & {
  icon: typeof Building2
  color: string
  hint: string
}

const CREATE_STEPS: { key: CreateStep; label: string }[] = [
  { key: 'industry', label: 'Industry' },
  { key: 'details', label: 'Company' },
  { key: 'plan', label: 'Plan' },
  { key: 'invite', label: 'Team' },
  { key: 'review', label: 'Launch' },
]

const PROFILE_VISUALS: Record<string, { icon: typeof Building2; color: string; hint: string }> = {
  it_service_company: { icon: Code2, color: 'text-blue-400 bg-blue-500/10', hint: 'Best for product teams, software studios and SaaS.' },
  medical_clinic: { icon: Stethoscope, color: 'text-red-400 bg-red-500/10', hint: 'Adds stricter checks for regulated healthcare organizations.' },
  accounting_firm: { icon: Landmark, color: 'text-emerald-400 bg-emerald-500/10', hint: 'Best for accounting firms, finance operators and tax advisors.' },
  generic_company: { icon: Building2, color: 'text-white/70 bg-white/5', hint: 'Universal profile for companies that need a flexible start.' },
}

const FALLBACK_REGISTRATION_PROFILES: RegistrationProfile[] = [
  {
    niche_code: 'it_service_company',
    industry_group: 'technology',
    label: 'IT company',
    industry_label: 'Information technology',
    description: 'Product teams, software studios, SaaS companies and system integrators.',
    allowed_registration_kinds: ['company', 'startup'],
    required_creation_documents: [
      { type: 'registration_certificate', label: 'Certificate of incorporation' },
      { type: 'charter', label: 'Company charter' },
      { type: 'founder_decision', label: 'Founder decision or meeting minutes' },
      { type: 'ceo_appointment_order', label: 'CEO appointment order' },
    ],
    workspace_blueprint: ['documents', 'tasks', 'projects', 'hr', 'knowledge_base'],
    version: 1,
  },
  {
    niche_code: 'medical_clinic',
    industry_group: 'healthcare',
    label: 'Medical organization',
    industry_label: 'Healthcare',
    description: 'Clinics, laboratories and healthcare service operators.',
    allowed_registration_kinds: ['company'],
    required_creation_documents: [
      { type: 'registration_certificate', label: 'Certificate of incorporation' },
      { type: 'charter', label: 'Company charter' },
      { type: 'founder_decision', label: 'Founder decision or meeting minutes' },
      { type: 'ceo_appointment_order', label: 'CEO appointment order' },
      { type: 'medical_license', label: 'Medical license' },
    ],
    workspace_blueprint: ['documents', 'approvals', 'hr', 'patients', 'compliance'],
    version: 1,
  },
  {
    niche_code: 'accounting_firm',
    industry_group: 'finance',
    label: 'Accounting company',
    industry_label: 'Finance and accounting',
    description: 'Outsourced accounting firms, tax advisors and finance operators.',
    allowed_registration_kinds: ['company', 'startup'],
    required_creation_documents: [
      { type: 'registration_certificate', label: 'Certificate of incorporation' },
      { type: 'charter', label: 'Company charter' },
      { type: 'founder_decision', label: 'Founder decision or meeting minutes' },
      { type: 'ceo_appointment_order', label: 'CEO appointment order' },
      { type: 'tax_registration_card', label: 'Tax registration document' },
    ],
    workspace_blueprint: ['documents', 'approvals', 'accounting', 'contracts', 'clients'],
    version: 1,
  },
  {
    niche_code: 'generic_company',
    industry_group: 'general_business',
    label: 'Other company',
    industry_label: 'General business',
    description: 'Universal profile for teams that need a clean starting point.',
    allowed_registration_kinds: ['company', 'startup'],
    required_creation_documents: [
      { type: 'registration_certificate', label: 'Certificate of incorporation' },
      { type: 'charter', label: 'Company charter' },
      { type: 'founder_decision', label: 'Founder decision or meeting minutes' },
      { type: 'ceo_appointment_order', label: 'CEO appointment order' },
    ],
    workspace_blueprint: ['documents', 'tasks', 'hr', 'approvals'],
    version: 1,
  },
]

function enrichRegistrationProfile(profile: RegistrationProfile): RegistrationProfileOption {
  const visual = PROFILE_VISUALS[profile.niche_code] ?? { icon: Building2, color: 'text-white/70 bg-white/5', hint: 'Flexible registration profile.' }
  return {
    ...profile,
    icon: visual.icon,
    color: visual.color,
    hint: visual.hint,
  }
}

const COMPANY_SIZES = [
  { id: '1-10', label: '1–10', desc: 'Startup' },
  { id: '11-50', label: '11–50', desc: 'Small' },
  { id: '51-200', label: '51–200', desc: 'Medium' },
  { id: '201-1000', label: '201–1000', desc: 'Large' },
  { id: '1000+', label: '1000+', desc: 'Enterprise' },
]

function RequiredMark() {
  return <span className="ml-1 text-red-400">*</span>
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    period: '',
    icon: Zap,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-500/5',
    features: ['Up to 10 users', 'Basic dashboards', 'Email support', 'Core modules'],
    highlighted: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: '$29',
    period: '/user/mo',
    icon: Crown,
    color: 'text-primary',
    borderColor: 'border-primary/30',
    bgColor: 'bg-primary/5',
    features: ['Unlimited users', 'Advanced analytics', 'Priority support', 'All modules', 'API access', 'Custom roles'],
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    icon: Shield,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/20',
    bgColor: 'bg-violet-500/5',
    features: ['Everything in Business', 'Dedicated support', 'SLA guarantee', 'Custom integrations', 'On-premise option', 'SSO & SAML'],
    highlighted: false,
  },
]

function getDocumentHint(label: string) {
  const normalized = label.toLowerCase()
  if (normalized.includes('license')) return 'Required for regulated niches before activation.'
  if (normalized.includes('tax')) return 'Confirms the tax registration status of the company.'
  if (normalized.includes('charter')) return 'Confirms the legal framework of the organization.'
  if (normalized.includes('appointment')) return 'Links the acting executive to the company profile.'
  return 'Required document for legal verification and moderation.'
}

const ORG_FORMS = [
  { value: 'too', label: 'ТОО' },
  { value: 'ao', label: 'АО' },
  { value: 'ip', label: 'ИП' },
  { value: 'other', label: 'Другое' },
] as const

const DEFAULT_COMPANY_ACCOUNT: CompanyAccount = {
  iban: '',
  bank_name: '',
  bic: '',
  kbe: '',
  client_iin: '',
  currency: 'KZT',
  comment: '',
}

function normalizeDigits(value: string, maxLen?: number) {
  const onlyDigits = value.replace(/\D/g, '')
  return typeof maxLen === 'number' ? onlyDigits.slice(0, maxLen) : onlyDigits
}

function normalizeIban(value: string) {
  const up = value.toUpperCase()
  const alnum = up.replace(/[^A-Z0-9]/g, '')
  if (!alnum) return ''
  const tail = (alnum.startsWith('KZ') ? alnum.slice(2) : alnum).slice(0, 18)
  return `KZ${tail}`
}

function formatIban(value: string) {
  return normalizeIban(value)
}

function normalizeBic(value: string) {
  const up = value.toUpperCase()
  const alnum = up.replace(/[^A-Z0-9]/g, '')
  return alnum.slice(0, 11)
}

function normalizeKzPhoneDigits(value: string) {
  let digits = value.replace(/\D/g, '')
  if (!digits) return ''

  // Strip country code only when it is explicitly present (+7...) or pasted as 11 digits.
  // A single leading 7 can be the first digit of the area code, so keep it while typing.
  const hasExplicitCountryCode = /^\s*\+7/.test(value)
  if (hasExplicitCountryCode && digits.startsWith('7')) {
    digits = digits.slice(1)
  }

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return digits.slice(1)
  }
  return digits.slice(0, 10)
}

function formatKzPhone(value: string) {
  const digits = normalizeKzPhoneDigits(value)
  if (!digits) return ''
  const part1 = digits.slice(0, 3)
  const part2 = digits.slice(3, 6)
  const part3 = digits.slice(6, 8)
  const part4 = digits.slice(8, 10)
  let out = '+7'
  if (part1) out += `(${part1}`
  if (part1.length === 3) out += ')'
  if (part2) out += ` ${part2}`
  if (part3) out += `-${part3}`
  if (part4) out += `-${part4}`
  return out
}

function isCompleteKzPhone(value: string) {
  return normalizeKzPhoneDigits(value).length === 10
}

function countKzPhoneDigitsBeforeCaret(value: string, caret: number) {
  let count = 0
  let skippedCountryCode = !value.trimStart().startsWith('+7')

  for (let i = 0; i < Math.min(caret, value.length); i += 1) {
    if (!/\d/.test(value[i])) continue
    if (!skippedCountryCode) {
      skippedCountryCode = true
      continue
    }
    count += 1
  }

  return count
}

function removeKzPhoneDigitAtIndex(value: string, index: number) {
  const digits = normalizeKzPhoneDigits(value)
  if (index < 0 || index >= digits.length) return formatKzPhone(digits)
  return formatKzPhone(`${digits.slice(0, index)}${digits.slice(index + 1)}`)
}

function applyKzPhoneDelete(value: string, key: string, caret: number | null, selectionEnd: number | null) {
  if (key !== 'Backspace' && key !== 'Delete') return null
  if (caret === null || selectionEnd === null || caret !== selectionEnd) return null

  const digitsBeforeCaret = countKzPhoneDigitsBeforeCaret(value, caret)
  const digitIndexToRemove = key === 'Backspace' ? digitsBeforeCaret - 1 : digitsBeforeCaret
  const nextValue = removeKzPhoneDigitAtIndex(value, digitIndexToRemove)
  return nextValue === '+7' ? '' : nextValue
}

const MAX_MODERATION_FILE_SIZE_MB = 25
const MAX_MODERATION_FILE_SIZE_BYTES = MAX_MODERATION_FILE_SIZE_MB * 1024 * 1024

function formatFileSizeMb(sizeBytes: number) {
  return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */

function StepIndicator({ steps, currentIndex }: { steps: typeof CREATE_STEPS; currentIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300',
                i < currentIndex && 'bg-emerald-500/20 text-emerald-400',
                i === currentIndex && 'bg-primary/20 text-primary ring-2 ring-primary/30',
                i > currentIndex && 'bg-white/5 text-white/20',
              )}
            >
              {i < currentIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn(
              'mt-1.5 text-[10px] font-medium transition-colors',
              i === currentIndex ? 'text-white/70' : 'text-white/20',
            )}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'mx-2 h-px w-8 sm:w-12 transition-colors mt-[-14px]',
              i < currentIndex ? 'bg-emerald-500/30' : 'bg-white/8',
            )} />
          )}
        </div>
      ))}
    </div>
  )
}

function WizardCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm',
      className,
    )}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */

interface OnboardingFlowProps {
  onDismiss?: () => void
  mode?: 'create' | 'edit'
  editOrgId?: string | null
}

async function fileToModerationDocument(
  file: File,
  documentType: string,
  documentLabel: string,
): Promise<ModerationDocument> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
  return {
    id: crypto.randomUUID(),
    file_name: file.name,
    content_type: file.type || 'application/octet-stream',
    size: file.size,
    data_url: dataUrl,
    document_type: documentType,
    document_label: documentLabel,
  }
}

export function OnboardingFlow({ onDismiss, mode = 'create', editOrgId = null }: OnboardingFlowProps = {}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createOrgMutation = useCreateOrg()
  const joinOrgMutation = useJoinOrg()
  const isEditMode = mode === 'edit' && !!editOrgId

  // Wizard state
  const [path, setPath] = useState<WizardPath>(isEditMode ? 'create' : null)
  const [registrationKind, setRegistrationKind] = useState<RegistrationKind>('company')
  const [createStepIdx, setCreateStepIdx] = useState(0)

  // Company creation form
  const [companyName, setCompanyName] = useState('')
  const [companyDesc, setCompanyDesc] = useState('')
  const [industry, setIndustry] = useState('')
  const [industryGroup, setIndustryGroup] = useState('')
  const [nicheCode, setNicheCode] = useState('')
  const [registrationProfiles, setRegistrationProfiles] = useState<RegistrationProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [legalNameKz, setLegalNameKz] = useState('')
  const [legalNameRu, setLegalNameRu] = useState('')
  const [organizationForm, setOrganizationForm] = useState<string>('too')
  const [bin, setBin] = useState('')
  const [legalAddress, setLegalAddress] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [oked, setOked] = useState('')
  const [companyAccounts, setCompanyAccounts] = useState<CompanyAccount[]>([{ ...DEFAULT_COMPANY_ACCOUNT }])
  const [companySize, setCompanySize] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('starter')
  const [inviteEmails, setInviteEmails] = useState<string[]>([''])
  const [coFounderEmail, setCoFounderEmail] = useState('')
  const [coFounderShare, setCoFounderShare] = useState('')
  const [moderatorMessage, setModeratorMessage] = useState('')
  const [moderationCommentFromReview, setModerationCommentFromReview] = useState<string>('')
  const [moderationIssuesFromReview, setModerationIssuesFromReview] = useState<Array<{ scope?: string; target?: string; label?: string; message?: string }>>([])
  const [moderationFiles, setModerationFiles] = useState<Partial<Record<RequiredCompanyDocumentType, File>>>({})
  const [existingModerationDocuments, setExistingModerationDocuments] = useState<Partial<Record<RequiredCompanyDocumentType, ModerationDocument>>>({})
  const [additionalModerationDocuments, setAdditionalModerationDocuments] = useState<ModerationDocument[]>([])
  const [startupFile, setStartupFile] = useState<File | null>(null)
  const [loadingEditSubmission, setLoadingEditSubmission] = useState(false)
  const [editingSubmission, setEditingSubmission] = useState(false)
  const [editLocked, setEditLocked] = useState(isEditMode)
  const fileInputRefs = useRef<Partial<Record<RequiredCompanyDocumentType, HTMLInputElement | null>>>({})
  const startupFileInputRef = useRef<HTMLInputElement | null>(null)

  // Join form
  const [joinCode, setJoinCode] = useState('')

  // Animation key for smooth transitions
  const [animKey, setAnimKey] = useState(0)
  const canEditFields = !isEditMode || !editLocked
  const issuesWithKey = useMemo(
    () => moderationIssuesFromReview.map((issue, index) => ({
      key: `${issue.scope || 'issue'}:${issue.target || index}:${index}`,
      issue,
    })),
    [moderationIssuesFromReview],
  )

  const resolveIssueTargetId = useCallback((issue: { scope?: string; target?: string }) => {
    const target = (issue.target || '').trim()
    if (!target) return ''
    if ((issue.scope || '') === 'document') return `onboard-document-${target}`
    return `onboard-field-${target}`
  }, [])

  const scrollToIssueTarget = useCallback((issue: { scope?: string; target?: string }) => {
    const targetId = resolveIssueTargetId(issue)
    if (!targetId) return
    const element = window.document.getElementById(targetId)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [resolveIssueTargetId])

  const availableRegistrationProfiles = useMemo(
    () => (registrationProfiles.length > 0 ? registrationProfiles : FALLBACK_REGISTRATION_PROFILES),
    [registrationProfiles],
  )

  const profileOptions = useMemo(
    () => availableRegistrationProfiles.map(enrichRegistrationProfile),
    [availableRegistrationProfiles],
  )

  const selectedProfile = useMemo(
    () => profileOptions.find((profile) => profile.niche_code === nicheCode)
      ?? profileOptions.find((profile) => profile.industry_group === industryGroup)
      ?? profileOptions.find((profile) => profile.industry_label === industry)
      ?? null,
    [profileOptions, nicheCode, industryGroup, industry],
  )

  const requiredCompanyDocuments = useMemo(
    () => registrationKind === 'company' && selectedProfile
      ? selectedProfile.required_creation_documents.map((document) => ({
        ...document,
        hint: getDocumentHint(document.label),
      }))
      : [],
    [registrationKind, selectedProfile],
  )

  useEffect(() => {
    let cancelled = false
    setProfilesLoading(true)
    getRegistrationProfiles()
      .then((response) => {
        if (!cancelled) setRegistrationProfiles(response.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setRegistrationProfiles([])
      })
      .finally(() => {
        if (!cancelled) setProfilesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isEditMode) return
    setPath('create')
    setRegistrationKind('company')
    setEditLocked(true)
  }, [isEditMode])

  useEffect(() => {
    if (!isEditMode || !editOrgId) return
    let cancelled = false
    setLoadingEditSubmission(true)
    Promise.allSettled([
      getOrgRegistrationSubmission(editOrgId),
      getOrg(editOrgId),
    ])
      .then(([submissionResult, orgResult]) => {
        if (cancelled) return

        const orgData = orgResult.status === 'fulfilled' ? orgResult.value.data : null
        const submissionData = submissionResult.status === 'fulfilled' ? submissionResult.value.data : null

        if (!orgData && !submissionData) {
          toast.error('Не удалось загрузить текущую заявку на доработку')
          return
        }

        setCompanyName(submissionData?.name || orgData?.name || submissionData?.legal_name_ru || submissionData?.legal_name_kz || '')
        setCompanyDesc(submissionData?.description || orgData?.description || '')
        setIndustry(submissionData?.industry || orgData?.industry || '')
        setIndustryGroup(submissionData?.industry_group || orgData?.industry_group || '')
        setNicheCode(submissionData?.niche_code || orgData?.niche_code || '')
        setLegalNameKz(submissionData?.legal_name_kz || orgData?.legal_name_kz || '')
        setLegalNameRu(submissionData?.legal_name_ru || orgData?.legal_name_ru || '')
        setOrganizationForm(submissionData?.organization_form || orgData?.organization_form || 'too')
        setBin(submissionData?.bin || orgData?.bin || '')
        setLegalAddress(submissionData?.legal_address || orgData?.legal_address || '')
        setCompanyPhone(formatKzPhone(submissionData?.company_phone || orgData?.company_phone || ''))
        setCompanyEmail(submissionData?.company_email || orgData?.company_email || '')
        setOked(submissionData?.oked || orgData?.oked || '')
        {
          const accounts = (submissionData?.company_accounts_json || orgData?.company_accounts_json || []) as CompanyAccount[]
          const normalized = accounts.map((acc) => ({
            ...DEFAULT_COMPANY_ACCOUNT,
            ...acc,
            iban: acc?.iban ? normalizeIban(String(acc.iban)) : '',
            bic: acc?.bic ? normalizeBic(String(acc.bic)) : '',
            kbe: acc?.kbe ? normalizeDigits(String(acc.kbe), 2) : '',
            client_iin: acc?.client_iin ? normalizeDigits(String(acc.client_iin), 12) : '',
          }))
          setCompanyAccounts(normalized.length > 0 ? normalized : [{ ...DEFAULT_COMPANY_ACCOUNT }])
        }
        setModeratorMessage(submissionData?.moderator_message || '')
        setModerationCommentFromReview(submissionData?.moderation_comment || orgData?.moderation_comment || '')
        setModerationIssuesFromReview((submissionData?.moderation_issues ?? []) as Array<{ scope?: string; target?: string; label?: string; message?: string }>)

        if (submissionData) {
          const profileForSubmission = availableRegistrationProfiles.find((profile) => profile.niche_code === (submissionData?.niche_code || orgData?.niche_code || ''))
            ?? availableRegistrationProfiles.find((profile) => profile.industry_group === (submissionData?.industry_group || orgData?.industry_group || ''))
            ?? availableRegistrationProfiles.find((profile) => profile.industry_label === (submissionData?.industry || orgData?.industry || ''))
            ?? null
          const requiredTypes = new Set((profileForSubmission?.required_creation_documents ?? []).map((item) => item.type))
          const requiredMap: Partial<Record<RequiredCompanyDocumentType, ModerationDocument>> = {}
          const extra: ModerationDocument[] = []
          for (const document of submissionData.attachments_json ?? []) {
            const type = (document.document_type || '') as RequiredCompanyDocumentType
            if (requiredTypes.has(type)) {
              requiredMap[type] = document
            } else {
              extra.push(document)
            }
          }
          setExistingModerationDocuments(requiredMap)
          setAdditionalModerationDocuments(extra)
        } else {
          setExistingModerationDocuments({})
          setAdditionalModerationDocuments([])
          toast.error('Заявка загружена частично: документы не удалось получить, приложите их повторно перед отправкой')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEditSubmission(false)
      })
    return () => {
      cancelled = true
    }
  }, [isEditMode, editOrgId, availableRegistrationProfiles])

  const goStep = useCallback((dir: 1 | -1) => {
    setCreateStepIdx((p) => Math.max(0, Math.min(CREATE_STEPS.length - 1, p + dir)))
    setAnimKey((k) => k + 1)
  }, [])

  function handleSubmitShortcut() {
    if (currentStep === 'review') {
      void handleCreate()
      return
    }
    setCreateStepIdx(CREATE_STEPS.length - 1)
    setAnimKey((k) => k + 1)
  }

  /* ── Submit create ── */
  async function handleCreate() {
    if (!companyName.trim()) return
    const missingDocuments = registrationKind === 'company'
      ? requiredCompanyDocuments.filter((item) => !moderationFiles[item.type] && !existingModerationDocuments[item.type])
      : []
    const binDigits = normalizeDigits(bin, 12)
    const normalizedAccounts = companyAccounts
      .map((acc) => ({
        id: acc.id,
        iban: normalizeIban(acc.iban || ''),
        bank_name: (acc.bank_name || '').trim() || null,
        bic: normalizeBic(acc.bic || '') || null,
        kbe: normalizeDigits(acc.kbe || '', 2) || null,
        client_iin: normalizeDigits(acc.client_iin || '', 12) || null,
        currency: (acc.currency || '').trim() || null,
        comment: (acc.comment || '').trim() || null,
      }))
    const meaningfulAccounts = normalizedAccounts.filter((acc) => {
      return acc.iban || acc.bank_name || acc.bic || acc.kbe || acc.client_iin || acc.currency || acc.comment
    })
    const hasInvalidAccount = meaningfulAccounts.some((acc) => !acc.iban)
    const hasInvalidKbe = meaningfulAccounts.some((acc) => acc.kbe && !/^\d{2}$/.test(String(acc.kbe)))
    const startupMissingBankFields = meaningfulAccounts.some((acc) => {
      if (registrationKind !== 'startup') return false
      return !acc.bank_name || !acc.bic || !acc.client_iin
    })
    const startupInvalidClientIin = meaningfulAccounts.some((acc) => {
      if (registrationKind !== 'startup') return false
      return !!acc.client_iin && !/^\d{12}$/.test(String(acc.client_iin))
    })
    const validationErrors = [
      registrationKind === 'company' && !legalNameRu.trim() ? 'Укажите юридическое наименование (RU)' : null,
      registrationKind === 'company' && !legalNameKz.trim() ? 'Укажите юридическое наименование (KZ)' : null,
      registrationKind === 'company' && !organizationForm.trim() ? 'Укажите форму организации' : null,
      registrationKind === 'company' && !binDigits ? 'Укажите БИН' : null,
      registrationKind === 'company' && binDigits && binDigits.length !== 12 ? 'БИН должен содержать 12 цифр' : null,
      registrationKind === 'company' && !legalAddress.trim() ? 'Укажите юридический адрес' : null,
      registrationKind === 'company' && !companyEmail.trim() ? 'Укажите почту компании' : null,
      registrationKind === 'company' && !companyPhone.trim() ? 'Укажите телефон компании' : null,
      registrationKind === 'company' && companyPhone.trim() && !isCompleteKzPhone(companyPhone) ? 'Телефон компании должен быть в формате +7(777) 777-77-77' : null,
      registrationKind === 'company' && !oked.trim() ? 'Укажите ОКЭД' : null,
      registrationKind === 'company' && meaningfulAccounts.length === 0 ? 'Добавьте хотя бы один счёт компании' : null,
      registrationKind === 'company' && hasInvalidAccount ? 'В каждом счёте нужно заполнить IBAN' : null,
      registrationKind === 'company' && hasInvalidKbe ? 'КБе должно быть из 2 цифр (например: 19)' : null,
      registrationKind === 'startup' && meaningfulAccounts.length === 0 ? 'Добавьте банковские реквизиты (IBAN/БИК/банк/ИИН клиента)' : null,
      registrationKind === 'startup' && hasInvalidAccount ? 'В каждом счёте нужно заполнить IBAN' : null,
      registrationKind === 'startup' && startupMissingBankFields ? 'Для стартапа нужны: банк, БИК и ИИН клиента' : null,
      registrationKind === 'startup' && startupInvalidClientIin ? 'ИИН клиента должен содержать 12 цифр' : null,
    ].filter(Boolean)
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0] as string)
      return
    }
    if (missingDocuments.length > 0) {
      toast.error(`Добавьте обязательные документы: ${missingDocuments.map((item) => item.label).join(', ')}`)
      return
    }
    if (registrationKind === 'company') {
      for (const item of requiredCompanyDocuments) {
        const selectedFile = moderationFiles[item.type]
        if (selectedFile && selectedFile.size > MAX_MODERATION_FILE_SIZE_BYTES) {
          toast.error(`Файл "${selectedFile.name}" слишком большой (${formatFileSizeMb(selectedFile.size)}). Максимум ${MAX_MODERATION_FILE_SIZE_MB} MB.`)
          return
        }
        const existingDocument = existingModerationDocuments[item.type]
        if (existingDocument && existingDocument.size > MAX_MODERATION_FILE_SIZE_BYTES) {
          toast.error(`Документ "${existingDocument.file_name}" превышает лимит ${MAX_MODERATION_FILE_SIZE_MB} MB. Загрузите версию меньшего размера.`)
          return
        }
      }
    }
    try {
      if (isEditMode && editOrgId) {
        setEditingSubmission(true)
        const attachments: ModerationDocument[] = []
        for (const item of requiredCompanyDocuments) {
          const replacement = moderationFiles[item.type]
          if (replacement) {
            attachments.push(await fileToModerationDocument(replacement, item.type, item.label))
          } else if (existingModerationDocuments[item.type]) {
            attachments.push(existingModerationDocuments[item.type] as ModerationDocument)
          }
        }
        attachments.push(...additionalModerationDocuments)
        await updateOrgRegistrationSubmission(editOrgId, {
          name: companyName.trim() || undefined,
          description: companyDesc.trim() || undefined,
          industry: (selectedProfile?.industry_label || industry) || undefined,
          industry_group: selectedProfile?.industry_group || industryGroup || undefined,
          niche_code: selectedProfile?.niche_code || nicheCode || undefined,
          legal_name_kz: legalNameKz.trim() || undefined,
          legal_name_ru: legalNameRu.trim() || undefined,
          organization_form: organizationForm || undefined,
          bin: binDigits || undefined,
          legal_address: legalAddress.trim() || undefined,
          company_phone: companyPhone.trim() || undefined,
          company_email: companyEmail.trim() || undefined,
          oked: oked.trim() || undefined,
          company_accounts_json: meaningfulAccounts,
          moderator_message: moderatorMessage.trim() || undefined,
          attachments: attachments.map((document) => ({
            id: document.id,
            file_name: document.file_name,
            content_type: document.content_type,
            size: document.size,
            data_url: document.data_url,
            document_type: document.document_type || 'supporting_document',
            document_label: document.document_label,
          })),
        })
        toast.success('Исправления отправлены на повторную проверку')
        navigate('/company/approvals')
        return
      }
      await createOrgMutation.mutateAsync({
        name: companyName.trim(),
        registration_kind: registrationKind,
        description: companyDesc.trim() || undefined,
        industry: (selectedProfile?.industry_label || industry) || undefined,
        industry_group: selectedProfile?.industry_group || industryGroup || undefined,
        niche_code: selectedProfile?.niche_code || nicheCode || undefined,
        organization_form: registrationKind === 'company' ? organizationForm : 'startup',
        legal_name_kz: legalNameKz.trim() || undefined,
        legal_name_ru: legalNameRu.trim() || undefined,
        bin: binDigits || undefined,
        legal_address: legalAddress.trim() || undefined,
        company_phone: companyPhone.trim() || undefined,
        company_email: companyEmail.trim() || undefined,
        oked: oked.trim() || undefined,
        company_accounts_json: meaningfulAccounts,
        company_size: companySize || undefined,
        plan_id: selectedPlan,
        moderator_message: moderatorMessage.trim() || undefined,
        files: registrationKind === 'company' ? requiredCompanyDocuments.flatMap((item) => (
          moderationFiles[item.type]
            ? [{ file: moderationFiles[item.type] as File, document_type: item.type }]
            : []
        )) : startupFile ? [{ file: startupFile, document_type: 'startup_document' }] : [],
      })
      toast.success(registrationKind === 'company' ? 'Компания создана и отправлена на модерацию.' : 'Стартап создан.')
      navigate('/company')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail
        toast.error(typeof detail === 'string' ? detail : (error.message || 'Не удалось создать компанию. Проверьте обязательные поля.'))
      } else {
        toast.error(error instanceof Error ? error.message : 'Не удалось создать компанию. Попробуйте ещё раз.')
      }
    } finally {
      setEditingSubmission(false)
    }
  }

  /* ── Submit join ── */
  async function handleJoin() {
    if (!joinCode.trim()) return
    try {
      await joinOrgMutation.mutateAsync(joinCode.trim())
      toast.success(t('onboarding.joinRequestSent'))
      setPath(null)
    } catch {
      toast.error(t('onboarding.joinRequestFailed'))
    }
  }

  const binDigits = normalizeDigits(bin, 12)
  const reviewWarnings = [
    !selectedProfile ? 'Company niche is not selected' : null,
    !companyName.trim() ? 'Не указано название компании' : null,
    registrationKind === 'company' && !legalNameRu.trim() ? 'Не указано юр. наименование (RU)' : null,
    registrationKind === 'company' && !legalNameKz.trim() ? 'Не указано юр. наименование (KZ)' : null,
    registrationKind === 'company' && !organizationForm.trim() ? 'Не указана форма организации' : null,
    registrationKind === 'company' && !binDigits ? 'Не указан БИН' : null,
    registrationKind === 'company' && !legalAddress.trim() ? 'Не указан юридический адрес' : null,
    registrationKind === 'company' && !companyEmail.trim() ? 'Не указана почта компании' : null,
    registrationKind === 'company' && !companyPhone.trim() ? 'Не указан телефон компании' : null,
    registrationKind === 'company' && companyPhone.trim() && !isCompleteKzPhone(companyPhone) ? 'Телефон компании заполнен некорректно' : null,
    registrationKind === 'company' && !oked.trim() ? 'Не указан ОКЭД' : null,
    registrationKind === 'company' && normalizeDigits(bin, 12).length !== 12 ? 'БИН заполнен некорректно' : null,
    registrationKind === 'company' && companyAccounts.filter((a) => (a.iban || '').trim()).length === 0 ? 'Не добавлен счёт компании' : null,
    registrationKind === 'startup' && companyAccounts.filter((a) => (a.iban || '').trim()).length === 0 ? 'Не добавлены банковские реквизиты стартапа' : null,
    registrationKind === 'startup' && companyAccounts.some((a) => (a.iban || '').trim() && !(a.bank_name || '').trim()) ? 'Не указан банк для счёта' : null,
    registrationKind === 'startup' && companyAccounts.some((a) => (a.iban || '').trim() && normalizeBic(a.bic || '').length < 6) ? 'Не указан БИК' : null,
    registrationKind === 'startup' && companyAccounts.some((a) => (a.iban || '').trim() && normalizeDigits(a.client_iin || '', 12).length !== 12) ? 'Не указан ИИН клиента (12 цифр)' : null,
    ...(registrationKind === 'company'
      ? requiredCompanyDocuments
        .filter((item) => !moderationFiles[item.type] && !existingModerationDocuments[item.type])
        .map((item) => `Не добавлен документ: ${item.label}`)
      : []),
  ].filter(Boolean)

  if (loadingEditSubmission) {
    return (
      <div className="mx-auto max-w-2xl py-16 px-4">
        <WizardCard>
          <div className="flex items-center justify-center gap-3 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            Загружаем заявку на доработку...
          </div>
        </WizardCard>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     Path Selection Screen
     ═══════════════════════════════════════════ */
  if (path === null) {
    return (
      <div className="mx-auto max-w-2xl py-8 sm:py-12 px-4 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 border border-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {t('onboarding.welcome', 'Добро пожаловать в M.I.S. Saphena')}
          </h1>
          <p className="mt-3 text-[14px] text-white/40 max-w-xl mx-auto leading-relaxed">
            {t('onboarding.welcomeDesc', 'Запустите клинику в едином контуре: сотрудники, пациенты, записи, расписание, базовая медкарта, документы, CRM, уведомления и аудит.')}
          </p>
        </div>

        {/* Path cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Startup */}
          <button
            onClick={() => { setRegistrationKind('startup'); setPath('create'); setAnimKey((k) => k + 1) }}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 text-left transition-all duration-300 hover:border-indigo-500/20 hover:bg-indigo-500/[0.03] hover:shadow-[0_0_30px_rgba(99,102,241,0.08)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 mb-4">
                <Rocket className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-[16px] font-semibold text-white mb-1.5">
                Частная практика
              </h3>
              <p className="text-[13px] text-white/35 leading-relaxed">
                Быстрый старт для врача или небольшого кабинета. Можно начать без полного пакета документов.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-[12px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Запустить контур <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </button>

          {/* Company */}
          <button
            onClick={() => { setRegistrationKind('company'); setPath('create'); setAnimKey((k) => k + 1) }}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 text-left transition-all duration-300 hover:border-primary/20 hover:bg-primary/[0.03] hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-[16px] font-semibold text-white mb-1.5">
                {t('onboarding.createOrg', 'Открыть клинику')}
              </h3>
              <p className="text-[13px] text-white/35 leading-relaxed">
                {t('onboarding.createOrgDesc', 'Вы станете основателем клиники и получите полный контроль над ролями, отделениями, расписанием, пациентами и документами.')}
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-[12px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Подать заявку <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </button>

          {/* Join */}
          <button
            onClick={() => { setPath('join'); setAnimKey((k) => k + 1) }}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 text-left transition-all duration-300 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 mb-4">
                <Users className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-[16px] font-semibold text-white mb-1.5">
                {t('onboarding.joinOrg', 'Войти в клинику')}
              </h3>
              <p className="text-[13px] text-white/35 leading-relaxed">
                {t('onboarding.joinOrgDesc', 'Введите код приглашения от администратора клиники, чтобы получить доступ в систему.')}
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-[12px] font-medium text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Подключиться <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-white/40">M.I.S. modules</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              'Пациенты и база записей',
              'Расписание врачей и слоты',
              'Базовая медицинская карта',
              'Документы и шаблоны',
              'Техподдержка и уведомления',
              'CRM и журнал аудита',
            ].map((item) => (
              <div key={item} className="rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2 text-[12px] text-white/70">
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[12px] text-white/20">
          <button onClick={() => navigate('/profile')} className="hover:text-white/50 transition-colors">
            Настроить профиль
          </button>
          <span>·</span>
          <button onClick={() => navigate('/company/clinical')} className="hover:text-white/50 transition-colors">
            Открыть клинический модуль
          </button>
          <span>·</span>
          <button onClick={() => navigate('/company/crm')} className="hover:text-white/50 transition-colors">
            Открыть CRM
          </button>
          {onDismiss && (
            <>
              <span>·</span>
              <button onClick={onDismiss} className="hover:text-white/50 transition-colors">
                Пропустить пока
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     Join Flow
     ═══════════════════════════════════════════ */
  if (path === 'join') {
    return (
      <div className="mx-auto max-w-md py-8 sm:py-12 px-4 animate-fade-in" key={animKey}>
        <button
          onClick={() => setPath(null)}
          className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Назад
        </button>

        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/10">
            <Users className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Присоединиться к клинике</h2>
          <p className="mt-2 text-[13px] text-white/35">
            Введите код приглашения, который выдал администратор клиники
          </p>
        </div>

        <WizardCard>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-white/40">Код клиники</label>
              <input
                placeholder="например, MIS-KZ-CLINIC-2026"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                autoFocus
                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] font-mono text-white placeholder:text-white/15 focus:border-emerald-500/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim() || joinOrgMutation.isPending}
              className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-[14px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {joinOrgMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Отправить запрос
                </>
              )}
            </button>
          </div>
        </WizardCard>

        <div className="mt-5 rounded-xl border border-white/[0.04] bg-white/[0.01] p-4">
          <p className="text-[12px] text-white/25 leading-relaxed">
            Код клиники вам выдаёт администратор или главный врач. После отправки запрос попадет на проверку и вы получите уведомление после одобрения.
          </p>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     Create Flow — Multi-step wizard
     ═══════════════════════════════════════════ */
  const currentStep = CREATE_STEPS[createStepIdx].key

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10 px-4 animate-fade-in" key={animKey}>
      {/* Back to path selection */}
      {createStepIdx === 0 && !isEditMode && (
        <button
          onClick={() => setPath(null)}
          className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Назад
        </button>
      )}

      {/* Step indicator */}
      <StepIndicator steps={CREATE_STEPS} currentIndex={createStepIdx} />

      {/* ── Step: Company Details ── */}
      {currentStep === 'details' && (
        <div className="animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {registrationKind === 'startup' ? 'Расскажите о своём стартапе' : 'Расскажите о своей компании'}
            </h2>
            <p className="mt-2 text-[13px] text-white/35">
              {registrationKind === 'startup'
                ? 'Для стартапа достаточно базовой информации о проекте и проектове'
                : 'Базовая информация для настройки вашего рабочего пространства'}
            </p>
          </div>

          <WizardCard>
            <div className="space-y-5">
              {isEditMode && (moderationCommentFromReview || moderationIssuesFromReview.length > 0) && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-[12px] font-semibold text-amber-200">Комментарий модератора</p>
                  {moderationCommentFromReview && (
                    <p className="mt-2 text-[12px] leading-relaxed text-amber-100/85">{moderationCommentFromReview}</p>
                  )}
                  {moderationIssuesFromReview.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {issuesWithKey.map(({ key, issue }) => (
                        <div key={key} className="rounded-lg border border-amber-400/20 bg-black/10 px-3 py-2">
                          <p className="text-[12px] text-amber-100/80">
                            • {issue.label || issue.target || 'Поле'}: {issue.message || 'Требуется проверка'}
                          </p>
                          <button
                            type="button"
                            onClick={() => scrollToIssueTarget(issue)}
                            className="mt-2 text-[11px] font-medium text-amber-300 transition-colors hover:text-amber-200"
                          >
                            Перейти к полю
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div id="onboard-field-name" className="scroll-mt-24">
                <label className="mb-1.5 block text-[12px] font-medium text-white/40">
                  {registrationKind === 'startup' ? 'Название стартапа' : 'Название компании'}<RequiredMark />
                </label>
                <input
                  placeholder={registrationKind === 'startup' ? 'AI Mobility Lab' : 'Acme Corporation'}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoFocus
                  disabled={!canEditFields}
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>

              <div id="onboard-field-description" className="scroll-mt-24">
                <label className="mb-1.5 block text-[12px] font-medium text-white/40">Описание</label>
                <textarea
                  placeholder="Кратко опишите, чем занимается ваша компания..."
                  value={companyDesc}
                  onChange={(e) => setCompanyDesc(e.target.value)}
                  rows={3}
                  disabled={!canEditFields}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                />
              </div>

              {registrationKind === 'company' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div id="onboard-field-legal_name_ru" className="scroll-mt-24">
                  <label className="mb-1.5 block text-[12px] font-medium text-white/40">Юр. наименование (RU)<RequiredMark /></label>
                  <input value={legalNameRu} onChange={(e) => setLegalNameRu(e.target.value)} disabled={!canEditFields} className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div id="onboard-field-legal_name_kz" className="scroll-mt-24">
                  <label className="mb-1.5 block text-[12px] font-medium text-white/40">Юр. наименование (KZ)<RequiredMark /></label>
                  <input value={legalNameKz} onChange={(e) => setLegalNameKz(e.target.value)} disabled={!canEditFields} className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div id="onboard-field-organization_form" className="scroll-mt-24">
                  <label className="mb-1.5 block text-[12px] font-medium text-white/40">Форма организации<RequiredMark /></label>
                  <select
                    value={organizationForm}
                    onChange={(e) => setOrganizationForm(e.target.value)}
                    disabled={!canEditFields}
                    className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                  >
                    {ORG_FORMS.map((item) => (
                      <option key={item.value} value={item.value} className="bg-neutral-900">
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div id="onboard-field-bin" className="scroll-mt-24">
                  <label className="mb-1.5 block text-[12px] font-medium text-white/40">БИН<RequiredMark /></label>
                  <input value={bin} onChange={(e) => setBin(normalizeDigits(e.target.value, 12))} disabled={!canEditFields} placeholder="12 цифр" inputMode="numeric" className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div id="onboard-field-oked" className="scroll-mt-24">
                  <label className="mb-1.5 block text-[12px] font-medium text-white/40">ОКЭД<RequiredMark /></label>
                  <input value={oked} onChange={(e) => setOked(e.target.value)} disabled={!canEditFields} className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div id="onboard-field-company_email" className="scroll-mt-24">
                  <label className="mb-1.5 block text-[12px] font-medium text-white/40">Почта компании<RequiredMark /></label>
                  <input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} disabled={!canEditFields} className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div id="onboard-field-company_phone" className="scroll-mt-24">
                  <label className="mb-1.5 block text-[12px] font-medium text-white/40">Телефон компании<RequiredMark /></label>
                  <input
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(formatKzPhone(e.target.value))}
                    onKeyDown={(e) => {
                      const nextValue = applyKzPhoneDelete(
                        companyPhone,
                        e.key,
                        e.currentTarget.selectionStart,
                        e.currentTarget.selectionEnd,
                      )
                      if (nextValue !== null) {
                        e.preventDefault()
                        setCompanyPhone(nextValue)
                      }
                    }}
                    disabled={!canEditFields}
                    placeholder="+7(***) ***-**-**"
                    inputMode="tel"
                    className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              )}
              {registrationKind === 'company' && (
              <div id="onboard-field-legal_address" className="scroll-mt-24">
                <label className="mb-1.5 block text-[12px] font-medium text-white/40">Юридический адрес<RequiredMark /></label>
                <input value={legalAddress} onChange={(e) => setLegalAddress(e.target.value)} disabled={!canEditFields} className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
              </div>
              )}

              {(registrationKind === 'company' || registrationKind === 'startup') && (
              <div id="onboard-field-company_accounts_json" className="scroll-mt-24">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-[12px] font-medium text-white/40">
                    {registrationKind === 'startup' ? 'Банковские реквизиты стартапа' : 'Реквизиты и счета компании'}<RequiredMark />
                  </label>
                  <button
                    type="button"
                    disabled={!canEditFields}
                    onClick={() => setCompanyAccounts((prev) => [...prev, { ...DEFAULT_COMPANY_ACCOUNT }])}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[12px] font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3.5 w-3.5" /> Добавить счёт
                  </button>
                </div>

                <div className="space-y-3">
                  {companyAccounts.map((acc, idx) => (
                    <div key={acc.id || idx} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-white/70">
                          <CreditCard className="h-4 w-4 text-primary" />
                          <span className="text-[13px] font-medium">Счёт #{idx + 1}</span>
                        </div>
                        {companyAccounts.length > 1 && (
                          <button
                            type="button"
                            disabled={!canEditFields}
                            onClick={() => setCompanyAccounts((prev) => prev.filter((_, i) => i !== idx))}
                            className="rounded-lg border border-white/[0.08] bg-white/[0.01] px-3 py-1.5 text-[12px] font-medium text-white/50 hover:text-white/70 hover:bg-white/[0.03] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Удалить
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-white/40">IBAN / Счёт<RequiredMark /></label>
                          <input
                            value={formatIban(acc.iban || '')}
                            onChange={(e) => setCompanyAccounts((prev) => prev.map((row, i) => i === idx ? ({ ...row, iban: normalizeIban(e.target.value) }) : row))}
                            disabled={!canEditFields}
                            placeholder="KZ******************"
                            className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-white/40">
                            Банк{registrationKind === 'startup' ? <RequiredMark /> : ''}
                          </label>
                          <input
                            value={acc.bank_name || ''}
                            onChange={(e) => setCompanyAccounts((prev) => prev.map((row, i) => i === idx ? ({ ...row, bank_name: e.target.value }) : row))}
                            disabled={!canEditFields}
                            className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-white/40">
                            БИК{registrationKind === 'startup' ? <RequiredMark /> : ''}
                          </label>
                          <input
                            value={acc.bic || ''}
                            onChange={(e) => setCompanyAccounts((prev) => prev.map((row, i) => i === idx ? ({ ...row, bic: normalizeBic(e.target.value) }) : row))}
                            disabled={!canEditFields}
                            placeholder="CASPKZKA"
                            className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div>
                          {registrationKind === 'startup' ? (
                            <>
                              <label className="mb-1.5 block text-[12px] font-medium text-white/40">ИИН клиента<RequiredMark /></label>
                              <input
                                value={acc.client_iin || ''}
                                onChange={(e) => setCompanyAccounts((prev) => prev.map((row, i) => i === idx ? ({ ...row, client_iin: normalizeDigits(e.target.value, 12) }) : row))}
                                disabled={!canEditFields}
                                placeholder="12 цифр"
                                inputMode="numeric"
                                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                              />
                            </>
                          ) : (
                            <>
                              <label className="mb-1.5 block text-[12px] font-medium text-white/40">КБе</label>
                              <input
                                value={acc.kbe || ''}
                                onChange={(e) => setCompanyAccounts((prev) => prev.map((row, i) => i === idx ? ({ ...row, kbe: normalizeDigits(e.target.value, 2) }) : row))}
                                disabled={!canEditFields}
                                placeholder="19"
                                inputMode="numeric"
                                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                              />
                            </>
                          )}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-white/40">Валюта</label>
                          <input
                            value={acc.currency || ''}
                            onChange={(e) => setCompanyAccounts((prev) => prev.map((row, i) => i === idx ? ({ ...row, currency: e.target.value }) : row))}
                            disabled={!canEditFields}
                            placeholder="KZT"
                            className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        {registrationKind === 'startup' && (
                          <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-[12px] font-medium text-white/40">КБе</label>
                            <input
                              value={acc.kbe || ''}
                              onChange={(e) => setCompanyAccounts((prev) => prev.map((row, i) => i === idx ? ({ ...row, kbe: normalizeDigits(e.target.value, 2) }) : row))}
                              disabled={!canEditFields}
                              placeholder="19"
                              inputMode="numeric"
                              className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                            />
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <label className="mb-1.5 block text-[12px] font-medium text-white/40">Комментарий</label>
                        <input
                          value={acc.comment || ''}
                          onChange={(e) => setCompanyAccounts((prev) => prev.map((row, i) => i === idx ? ({ ...row, comment: e.target.value }) : row))}
                          disabled={!canEditFields}
                          className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/25">
                  Можно добавить несколько счетов. Для каждого счёта обязателен IBAN.
                  {registrationKind === 'startup' ? ' Для стартапа также обязателен банк, БИК и ИИН клиента.' : ''}
                </p>
              </div>
              )}

              <div>
                <label className="mb-2 block text-[12px] font-medium text-white/40">Размер компании</label>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_SIZES.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setCompanySize(size.id)}
                      className={cn(
                        'rounded-lg px-4 py-2 text-[13px] font-medium transition-all border',
                        companySize === size.id
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'text-white/30 border-white/[0.06] hover:border-white/10 hover:text-white/50 bg-white/[0.01]',
                      )}
                    >
                      <span className="font-semibold">{size.label}</span>
                      <span className="text-[11px] ml-1 opacity-60">{size.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {registrationKind === 'company' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center gap-2 text-white/70">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-[13px] font-medium">Сообщение модератору</span>
                  </div>
                  <textarea
                    placeholder="Например: прикладываю скан регистрации, сайт в разработке, основной контакт для связи..."
                    value={moderatorMessage}
                    onChange={(e) => setModeratorMessage(e.target.value)}
                    rows={4}
                    disabled={!canEditFields}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-white/25">
                    Это сообщение увидит модератор при проверке компании.
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center gap-2 text-white/70">
                    <Paperclip className="h-4 w-4 text-primary" />
                    <span className="text-[13px] font-medium">Обязательные документы компании</span>
                  </div>
                  <div className="space-y-3">
                    {requiredCompanyDocuments.map((document) => {
                      const selectedFile = moderationFiles[document.type]
                      const existingDocument = existingModerationDocuments[document.type]
                      return (
                        <div id={`onboard-document-${document.type}`} key={document.type} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 scroll-mt-24">
                          <input
                            ref={(node) => {
                              fileInputRefs.current[document.type] = node
                            }}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            onChange={(e) => {
                              const nextFile = e.target.files?.[0]
                              if (!canEditFields) return
                              if (!nextFile) return
                              if (nextFile.size > MAX_MODERATION_FILE_SIZE_BYTES) {
                                toast.error(`Файл "${nextFile.name}" слишком большой (${formatFileSizeMb(nextFile.size)}). Максимум ${MAX_MODERATION_FILE_SIZE_MB} MB.`)
                                e.currentTarget.value = ''
                                return
                              }
                              setModerationFiles((prev) => ({ ...prev, [document.type]: nextFile }))
                              setExistingModerationDocuments((prev) => {
                                const next = { ...prev }
                                delete next[document.type]
                                return next
                              })
                              e.currentTarget.value = ''
                            }}
                          />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-white">{document.label}</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-white/25">{document.hint}</p>
                              {selectedFile ? (
                                <p className="mt-2 truncate text-[12px] text-emerald-300">
                                  {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              ) : existingDocument ? (
                                <p className="mt-2 truncate text-[12px] text-emerald-300">
                                  {existingDocument.file_name} · {(existingDocument.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              ) : (
                                <p className="mt-2 text-[11px] text-amber-300">Файл ещё не добавлен</p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[document.type]?.click()}
                                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.10] bg-white/[0.02] px-3 text-[12px] font-medium text-white/60 transition-all hover:border-primary/30 hover:text-white"
                              >
                                <FileImage className="h-4 w-4" />
                                {selectedFile || existingDocument ? 'Заменить' : 'Добавить'}
                              </button>
                              {(selectedFile || existingDocument) && (
                                <button
                                  type="button"
                                  disabled={!canEditFields}
                                  onClick={() => {
                                    setModerationFiles((prev) => {
                                      const next = { ...prev }
                                      delete next[document.type]
                                      return next
                                    })
                                    setExistingModerationDocuments((prev) => {
                                      const next = { ...prev }
                                      delete next[document.type]
                                      return next
                                    })
                                  }}
                                  className="text-[12px] font-medium text-red-300 transition-colors hover:text-red-200"
                                >
                                  Удалить
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-100/80">
                    Без полного комплекта документов компания не отправляется на модерацию. Форматы: PDF, PNG, JPG, JPEG, WEBP. До 25 МБ на файл.
                  </div>
                </div>
              </div>
              ) : (
              <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-indigo-200/90">
                  <Paperclip className="h-4 w-4 text-indigo-400" />
                  <span className="text-[13px] font-medium">Документы стартапа (необязательно)</span>
                </div>
                <p className="mb-3 text-[12px] leading-relaxed text-indigo-100/70">
                  Вы можете прикрепить любой документ, подтверждающий ваш стартап: презентацию, патент, свидетельство или другие материалы. Это упростит работу с проектовой и проектом.
                </p>
                <input
                  ref={startupFileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const nextFile = e.target.files?.[0]
                    if (!nextFile) return
                    if (nextFile.size > MAX_MODERATION_FILE_SIZE_BYTES) {
                      toast.error(`Файл "${nextFile.name}" слишком большой (${formatFileSizeMb(nextFile.size)}). Максимум ${MAX_MODERATION_FILE_SIZE_MB} MB.`)
                      e.currentTarget.value = ''
                      return
                    }
                    setStartupFile(nextFile)
                    e.currentTarget.value = ''
                  }}
                />
                <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-400/20 bg-black/10 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    {startupFile ? (
                      <div>
                        <p className="truncate text-[12px] font-medium text-emerald-300">
                          {startupFile.name}
                        </p>
                        <p className="mt-1 text-[11px] text-indigo-100/60">
                          {(startupFile.size / 1024 / 1024).toFixed(2)} MB · Файл готов к загрузке
                        </p>
                      </div>
                    ) : (
                      <p className="text-[12px] text-indigo-100/50">
                        Файл ещё не добавлен
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startupFileInputRef.current?.click()}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-400/30 bg-indigo-500/10 px-3 text-[12px] font-medium text-indigo-200 transition-all hover:border-indigo-400/50 hover:text-indigo-100 hover:bg-indigo-500/15"
                    >
                      <FileImage className="h-4 w-4" />
                      {startupFile ? 'Заменить' : 'Прикрепить файл'}
                    </button>
                    {startupFile && (
                      <button
                        type="button"
                        onClick={() => setStartupFile(null)}
                        className="text-[12px] font-medium text-red-300 transition-colors hover:text-red-200"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>
              )}

              {isEditMode && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-white/35">Validation</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-white/55">
                    {editLocked
                      ? 'Your informations have been sent to our team for audit. If you want to edit something, click EDIT.'
                      : 'Edit mode is enabled. Update required fields and submit your changes for re-validation.'}
                  </p>
                  {moderationCommentFromReview && (
                    <div className="mt-3 border-l border-white/[0.08] pl-3 text-[12px] text-white/60">
                      Message from the moderation team: {moderationCommentFromReview}
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditLocked(false)}
                      className="rounded-lg border border-white/40 px-4 py-2 text-[12px] font-semibold text-white/80 transition-colors hover:bg-white/5"
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitShortcut}
                      disabled={reviewWarnings.length > 0 || createOrgMutation.isPending || editingSubmission}
                      className="rounded-lg border border-white/10 bg-white/15 px-4 py-2 text-[12px] font-semibold text-white transition-colors disabled:opacity-50"
                    >
                      SUBMIT CHANGES
                    </button>
                  </div>
                </div>
              )}
            </div>
          </WizardCard>
        </div>
      )}

      {/* ── Step: Industry ── */}
      {currentStep === 'industry' && (
        <div className="animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Choose the company niche first</h2>
            <p className="mt-2 text-[13px] text-white/35">The rest of the registration flow adapts to the selected profile.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profileOptions
              .filter((profile) => profile.allowed_registration_kinds.includes(registrationKind))
              .map((profile) => {
                const Icon = profile.icon
                const selected = nicheCode === profile.niche_code
                return (
                  <button
                    key={profile.niche_code}
                    onClick={() => {
                      if (!canEditFields) return
                      setNicheCode(profile.niche_code)
                      setIndustryGroup(profile.industry_group)
                      setIndustry(profile.industry_label || profile.label)
                    }}
                    disabled={!canEditFields || profilesLoading}
                    className={cn(
                      'relative flex flex-col items-start gap-3 rounded-xl p-5 border text-left transition-all duration-200',
                      selected
                        ? 'border-primary/30 bg-primary/[0.05] shadow-[0_0_20px_rgba(59,130,246,0.08)]'
                        : 'border-white/[0.06] bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.03]',
                    )}
                  >
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', profile.color.split(' ')[1])}>
                      <Icon className={cn('h-5 w-5', profile.color.split(' ')[0])} />
                    </div>
                    <div>
                      <span className={cn('text-[13px] font-medium', selected ? 'text-white' : 'text-white/70')}>
                        {profile.label}
                      </span>
                      <p className="mt-1 text-[12px] leading-relaxed text-white/40">{profile.hint}</p>
                      {profile.description && <p className="mt-2 text-[11px] leading-relaxed text-white/30">{profile.description}</p>}
                    </div>
                    {selected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {currentStep === 'plan' && (
        <div className="animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Выберите тариф</h2>
            <p className="mt-2 text-[13px] text-white/35">Начните бесплатно и переходите на другой тариф в любое время. Банковская карта не требуется.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => {
              const Icon = plan.icon
              const selected = selectedPlan === plan.id
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  disabled={!canEditFields}
                  className={cn(
                    'relative rounded-2xl p-6 text-left border transition-all duration-200',
                    selected
                      ? cn(plan.borderColor, plan.bgColor, 'shadow-lg')
                      : 'border-white/[0.06] bg-white/[0.01] hover:border-white/10',
                    plan.highlighted && selected && 'ring-1 ring-primary/20',
                  )}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                      Популярный
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', plan.bgColor)}>
                      <Icon className={cn('h-4.5 w-4.5', plan.color)} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-white">{plan.name}</h3>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-[12px] text-white/30">{plan.period}</span>}
                  </div>

                  <div className="space-y-2">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-[12px] text-white/40">
                        <Check className={cn('h-3 w-3 shrink-0', selected ? plan.color : 'text-white/20')} />
                        {f}
                      </div>
                    ))}
                  </div>

                  {selected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className={cn('h-5 w-5', plan.color)} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Step: Invite Team ── */}
      {currentStep === 'invite' && (
        <div className="animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Пригласите проектову</h2>
            <p className="mt-2 text-[13px] text-white/35">Необязательно — вы всегда сможете пригласить людей позже</p>
          </div>

          <WizardCard>
            <div className="space-y-4">
              <label className="block text-[12px] font-medium text-white/40">Email участников команды</label>
              {inviteEmails.map((email, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 shrink-0">
                    <Mail className="h-3.5 w-3.5 text-white/20" />
                  </div>
                  <input
                    placeholder="colleague@company.com"
                    value={email}
                  onChange={(e) => {
                    if (!canEditFields) return
                    const next = [...inviteEmails]
                    next[i] = e.target.value
                    setInviteEmails(next)
                  }}
                  disabled={!canEditFields}
                  className="flex-1 h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[13px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {inviteEmails.length > 1 && (
                    <button
                      onClick={() => setInviteEmails(inviteEmails.filter((_, j) => j !== i))}
                      className="text-white/15 hover:text-red-400 transition-colors text-[18px] px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              {inviteEmails.length < 10 && (
                <button
                  onClick={() => setInviteEmails([...inviteEmails, ''])}
                  disabled={!canEditFields}
                  className="flex items-center gap-2 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Добавить ещё
                </button>
              )}
            </div>
          </WizardCard>

          <p className="mt-4 text-center text-[11px] text-white/15">
                      <div className="mt-6">
            <WizardCard>
              <details className="group">
                <summary className="cursor-pointer text-[12px] font-medium text-white/40 group-open:mb-4">
                  + Добавить второго фаундера (опционально)
                </summary>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-white/40">Email второго фаундера</label>
                    <input
                      type="email"
                      placeholder="co-founder@company.com"
                      value={coFounderEmail}
                      onChange={(e) => setCoFounderEmail(e.target.value)}
                      className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[13px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-white/40">Доля (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      placeholder="50"
                      value={coFounderShare}
                      onChange={(e) => setCoFounderShare(e.target.value)}
                      className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[13px] text-white placeholder:text-white/15 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                    <p className="mt-1 text-[10px] text-white/20">Укажите долю второго фаундера в компании</p>
                  </div>
                </div>
              </details>
            </WizardCard>
          </div>

          Приглашения будут отправлены после одобрения вашей компании
          </p>
        </div>
      )}

      {/* ── Step: Review & Launch ── */}
      {currentStep === 'review' && (
        <div className="animate-fade-in">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 border border-primary/10">
              <Rocket className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">{isEditMode ? 'Исправьте заявку и отправьте повторно' : 'Всё готово к запуску'}</h2>
            <p className="mt-2 text-[13px] text-white/35">{isEditMode ? 'Проверьте замечания модератора и обновите текущую заявку' : 'Проверьте настройки и создайте свою компанию'}</p>
          </div>

          <WizardCard className="space-y-5">
            {reviewWarnings.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-[12px] font-semibold text-amber-200">Перед отправкой нужно исправить:</p>
                <div className="mt-2 space-y-1">
                  {reviewWarnings.map((warning) => (
                    <p key={String(warning)} className="text-[12px] text-amber-100/80">{warning}</p>
                  ))}
                </div>
              </div>
            )}
            {/* Summary rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[12px] text-white/30">{registrationKind === 'startup' ? 'Стартап' : 'Компания'}</span>
                <span className="text-[13px] font-medium text-white">{companyName || '—'}</span>
              </div>
              {companyDesc && (
                <div className="flex items-start justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-[12px] text-white/30 shrink-0">Описание</span>
                  <span className="text-[13px] text-white/60 text-right ml-4">{companyDesc}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[12px] text-white/30">Отрасль</span>
                <span className="text-[13px] font-medium text-white">
                  {selectedProfile?.label || industry || '?'}
                </span>
              </div>
              {registrationKind === 'company' && (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-[12px] text-white/30">БИН</span>
                    <span className="text-[13px] font-medium text-white">{bin || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-[12px] text-white/30">ОКЭД</span>
                    <span className="text-[13px] font-medium text-white">{oked || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-[12px] text-white/30">Юр. адрес</span>
                    <span className="ml-4 max-w-[65%] text-right text-[13px] text-white/60">{legalAddress || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-[12px] text-white/30">Контакты</span>
                    <span className="ml-4 text-right text-[13px] text-white/60">{companyEmail || '—'} · {companyPhone || '—'}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[12px] text-white/30">Размер</span>
                <span className="text-[13px] font-medium text-white">
                  {COMPANY_SIZES.find((s) => s.id === companySize)?.label || '—'} сотрудников
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[12px] text-white/30">Тариф</span>
                <span className={cn(
                  'text-[13px] font-medium',
                  PLANS.find((p) => p.id === selectedPlan)?.color,
                )}>
                  {PLANS.find((p) => p.id === selectedPlan)?.name}
                </span>
              </div>
              {inviteEmails.filter(Boolean).length > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-[12px] text-white/30">Приглашения</span>
                  <span className="text-[13px] font-medium text-white">
                    {inviteEmails.filter(Boolean).length} участник{inviteEmails.filter(Boolean).length > 1 ? 'а' : ''}
                  </span>
                </div>
              )}
              {moderatorMessage.trim() && (
                <div className="flex items-start justify-between py-2 border-t border-white/[0.04]">
                  <span className="text-[12px] text-white/30 shrink-0">Сообщение модератору</span>
                  <span className="ml-4 max-w-[65%] text-right text-[13px] text-white/60">{moderatorMessage}</span>
                </div>
              )}
              {registrationKind === 'company' && (Object.keys(moderationFiles).length > 0 || Object.keys(existingModerationDocuments).length > 0) && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-[12px] text-white/30">Документы</span>
                  <span className="text-[13px] font-medium text-white">
                    {Object.keys(moderationFiles).length + Object.keys(existingModerationDocuments).length} / {requiredCompanyDocuments.length}
                  </span>
                </div>
              )}
              {registrationKind === 'startup' && startupFile && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-[12px] text-white/30">Прикреплённый файл</span>
                  <span className="text-[13px] font-medium text-white truncate ml-4 max-w-[200px]">
                    {startupFile.name}
                  </span>
                </div>
              )}
            </div>

            {/* What happens next */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-3">Что будет дальше</h4>
              {[
                { icon: CheckCircle2, text: registrationKind === 'startup' ? 'Стартап будет создан сразу' : 'Компания будет создана сразу', color: 'text-emerald-400' },
                { icon: Crown, text: 'Вы станете основателем компании и получите полный доступ', color: 'text-amber-400' },
                { icon: Shield, text: registrationKind === 'company' ? 'Модератор увидит ваше сообщение и приложенные документы' : 'Официальный статус юрлица можно будет добавить позже', color: 'text-blue-400' },
                { icon: UserPlus, text: 'Приглашения проектове будут отправлены после одобрения', color: 'text-violet-400' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <item.icon className={cn('h-4 w-4 shrink-0', item.color)} />
                  <span className="text-[12px] text-white/40">{item.text}</span>
                </div>
              ))}
            </div>
          </WizardCard>
        </div>
      )}

      {/* ── Navigation buttons ── */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => createStepIdx === 0 ? (isEditMode ? navigate('/dashboard') : setPath(null)) : goStep(-1)}
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-2.5 text-[13px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>

        {currentStep === 'review' ? (
          <button
            onClick={handleCreate}
            disabled={reviewWarnings.length > 0 || createOrgMutation.isPending || editingSubmission}
            className="flex items-center gap-2 rounded-xl bg-primary px-7 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
          >
            {(createOrgMutation.isPending || editingSubmission) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  {isEditMode ? 'Отправить исправленную заявку' : registrationKind === 'startup' ? 'Создать стартап' : 'Создать компанию'}
                </>
              )}
            </button>
        ) : (
          <button
            onClick={() => goStep(1)}
            disabled={(currentStep === 'industry' && !selectedProfile) || (currentStep === 'details' && (
              !companyName.trim() ||
              (registrationKind === 'company' && (
                !legalNameRu.trim() ||
                !organizationForm.trim() ||
                normalizeDigits(bin, 12).length !== 12 ||
                !legalAddress.trim() ||
                !companyEmail.trim() ||
                !companyPhone.trim() ||
                !isCompleteKzPhone(companyPhone) ||
                !oked.trim() ||
                companyAccounts.filter((a) => (a.iban || '').trim()).length === 0
              )) ||
              (registrationKind === 'startup' && (
                companyAccounts.filter((a) => (a.iban || '').trim()).length === 0 ||
                companyAccounts.some((a) => (a.iban || a.bank_name || a.bic || a.client_iin) && !normalizeIban(a.iban || '')) ||
                companyAccounts.some((a) => (a.iban || '').trim() && !normalizeBic(a.bic || '')) ||
                companyAccounts.some((a) => (a.iban || '').trim() && !normalizeDigits(a.client_iin || '', 12)) ||
                companyAccounts.some((a) => (a.iban || '').trim() && normalizeDigits(a.client_iin || '', 12).length !== 12) ||
                companyAccounts.some((a) => (a.iban || '').trim() && !(a.bank_name || '').trim())
              ))
            ))}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Продолжить
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
