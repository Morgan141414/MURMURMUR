import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { Building2, ChevronDown, Plus, User, Check } from 'lucide-react'
import { useOrgStore } from '@/stores/orgStore'
import { useAuthStore } from '@/stores/authStore'
import { useContextStore } from '@/stores/contextStore'
import { useMyOrgs } from '@/hooks/useOrg'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import { resolveMediaUrl } from '@/lib/media'

function CompanyLogo({ logoUrl, name, className }: { logoUrl?: string; name?: string; className?: string }) {
  const src = resolveMediaUrl(logoUrl)

  if (!src) {
    return <div className={cn('rounded-xl border border-border/80 bg-transparent', className)} aria-label={name || 'Company'} />
  }

  return (
    <img
      src={src}
      alt={name || 'Company'}
      className={cn('rounded-xl border border-border/80 object-cover', className)}
    />
  )
}

export function ContextSwitcher({ onCreateOrg }: { onCreateOrg?: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { orgs, activeOrgId, setActiveOrg, activeOrg } = useOrgStore()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const { shell, setShell } = useContextStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownRect, setDropdownRect] = useState<{ left: number; top: number; width: number } | null>(null)

  useMyOrgs()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        ref.current &&
        !ref.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setDropdownRect({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setDropdownRect(null)
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
    setDropdownRect(null)
  }, [location.pathname])

  const current = activeOrg()
  const currentRole = current?.role ?? null
  const currentShell = shell ?? 'company'

  const canCreateOrg = true

  function handleCreateOrganization() {
    setActiveOrg(null)
    setShell('company')
    setOpen(false)
    if (onCreateOrg) {
      onCreateOrg()
      return
    }
    navigate('/dashboard?createOrg=1')
  }

  function handleOrgSelect(orgId: string) {
    setActiveOrg(orgId)
    setShell('company')
    setOpen(false)
    navigate('/company')
  }

  function handlePersonalSwitch() {
    setActiveOrg(null)
    setShell('company')
    setOpen(false)
    navigate('/dashboard')
  }

  function handlePlatformSwitch() {
    setShell('platform')
    setOpen(false)
    navigate('/platform')
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className={cn(
          'soft-inset-ring flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm transition-colors hover:bg-accent/70',
          'border-border/80 bg-background/85',
        )}
      >
        {current ? (
          <CompanyLogo logoUrl={current.logoUrl} name={current.orgName} className="h-8 w-8 shrink-0" />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1 text-left">
          <p className="truncate font-medium text-foreground text-sm">
            {current ? current.orgName : t('orgSwitcher.personal')}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {currentRole ? ROLE_LABELS[currentRole] : (isSuperAdmin && currentShell === 'platform' ? t('shell.platform') : '')}
          </p>
        </div>

        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && dropdownRect && createPortal(
        <>
          <button
            type="button"
            aria-label="Close organization switcher"
            className="fixed inset-y-0 left-0 z-[var(--z-overlay)] w-[var(--sidebar-width)] bg-background/72 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dropdownRef}
            className="shell-panel fixed z-[var(--z-popover)] max-h-[420px] min-w-[280px] overflow-y-auto rounded-2xl border border-border/80 bg-background shadow-2xl"
            style={{
              left: `${dropdownRect.left}px`,
              top: `${dropdownRect.top}px`,
              width: `${dropdownRect.width}px`,
            }}
          >
            {isSuperAdmin && (
              <>
                <div className="px-1.5 py-1.5">
                  <button
                    onClick={handlePlatformSwitch}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent',
                      currentShell === 'platform' && !activeOrgId && 'bg-primary/5',
                    )}
                  >
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <span className="flex-1 text-left text-foreground">{t('shell.platform')}</span>
                    {currentShell === 'platform' && !activeOrgId && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                </div>
                <div className="mx-3 h-px bg-border" />
              </>
            )}

            <div className="px-3 pt-2.5 pb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {t('contextSwitcher.organizations')}
              </span>
            </div>

            <button
              onClick={handlePersonalSwitch}
              className={cn(
                'mx-1.5 flex w-[calc(100%-0.75rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent',
                !activeOrgId && currentShell !== 'platform' && 'bg-primary/5',
              )}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="flex-1 text-left text-foreground">{t('orgSwitcher.personal')}</span>
              {!activeOrgId && currentShell !== 'platform' && <Check className="h-4 w-4 text-primary" />}
            </button>

            {orgs.map((org) => {
              const isActive = activeOrgId === org.orgId
              return (
                <button
                  key={org.orgId}
                  onClick={() => handleOrgSelect(org.orgId)}
                  className={cn(
                    'mx-1.5 mt-1 flex w-[calc(100%-0.75rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent',
                    isActive && 'bg-primary/5',
                  )}
                >
                  <CompanyLogo logoUrl={org.logoUrl} name={org.orgName} className="h-7 w-7 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-foreground">{org.orgName}</p>
                    <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[org.role]}</p>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </button>
              )
            })}

            {canCreateOrg && (
              <>
                <div className="mx-3 mt-2 h-px bg-border" />
                <button
                  onClick={handleCreateOrganization}
                  className="mx-1.5 mb-1.5 flex w-[calc(100%-0.75rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-border">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span>{t('orgSwitcher.createOrg')}</span>
                </button>
              </>
            )}
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}