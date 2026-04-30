import { useRef, useEffect, useState } from 'react'
import {
  ArrowRight, CheckCircle2, Shield, Lock, Eye, FileCheck,
  GitBranch, UserCheck, Clock, Bell, CreditCard, BarChart3,
  TrendingUp, AlertTriangle, Percent, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollReveal } from '@/hooks/useScrollReveal'

/* ═══════════════════════════════════════════════════
   WorkflowSection — Shows real approval chains
   ═══════════════════════════════════════════════════ */

const WORKFLOWS = [
  {
    title: 'Company Registration',
    steps: [
      { label: 'Founder submits', icon: Building2, status: 'completed' as const },
      { label: 'Moderation review', icon: Eye, status: 'completed' as const },
      { label: 'Approval', icon: CheckCircle2, status: 'active' as const },
      { label: 'Company launched', icon: ArrowRight, status: 'pending' as const },
    ],
  },
  {
    title: 'Employee Hiring',
    steps: [
      { label: 'HR request', icon: UserCheck, status: 'completed' as const },
      { label: 'CEO approval', icon: FileCheck, status: 'completed' as const },
      { label: 'Onboarding', icon: Clock, status: 'active' as const },
      { label: 'Active employee', icon: CheckCircle2, status: 'pending' as const },
    ],
  },
  {
    title: 'Payment Processing',
    steps: [
      { label: 'Invoice created', icon: CreditCard, status: 'completed' as const },
      { label: 'Notification sent', icon: Bell, status: 'completed' as const },
      { label: 'Payment received', icon: CheckCircle2, status: 'completed' as const },
      { label: 'Reconciled', icon: BarChart3, status: 'active' as const },
    ],
  },
]

export function WorkflowSection() {
  const containerRef = useScrollReveal()
  const [activeFlow, setActiveFlow] = useState(0)

  return (
    <section className="landing-section bg-[#080E1A]" ref={containerRef}>
      <div className="landing-container">
        <div className="mx-auto max-w-2xl text-center scroll-reveal">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            <GitBranch className="h-3 w-3" />
            Workflows
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Transparent approval chains
          </h2>
          <p className="mt-4 text-base text-white/50 leading-relaxed">
            Every critical action follows a structured workflow — from submission
            through review to final approval. Nothing happens without control.
          </p>
        </div>

        {/* Workflow selector */}
        <div className="mt-12 flex flex-wrap justify-center gap-3 scroll-reveal reveal-delay-1">
          {WORKFLOWS.map((flow, i) => (
            <button
              key={flow.title}
              onClick={() => setActiveFlow(i)}
              className={cn(
                'rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all border',
                activeFlow === i
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'text-white/40 hover:text-white/70 border-transparent hover:bg-white/5',
              )}
            >
              {flow.title}
            </button>
          ))}
        </div>

        {/* Active workflow visualization */}
        <div className="mt-10 mx-auto max-w-3xl scroll-reveal reveal-delay-2">
          <div key={activeFlow} className="landing-glass-card rounded-2xl p-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {WORKFLOWS[activeFlow].steps.map((step, i) => {
                const Icon = step.icon
                const isLast = i === WORKFLOWS[activeFlow].steps.length - 1
                return (
                  <div key={step.label} className="flex-1 flex flex-col items-center text-center">
                    {/* Node */}
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl border transition-all',
                        step.status === 'completed' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                        step.status === 'active' && 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_12px_rgba(59,130,246,0.2)] animate-pulse-soft',
                        step.status === 'pending' && 'bg-white/5 border-white/10 text-white/30',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className={cn(
                      'mt-3 text-[12px] font-medium',
                      step.status === 'completed' && 'text-emerald-400/80',
                      step.status === 'active' && 'text-white',
                      step.status === 'pending' && 'text-white/30',
                    )}>
                      {step.label}
                    </p>
                    {/* Connector line for desktop */}
                    {!isLast && (
                      <div className="hidden sm:block absolute" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Connector lines between nodes (desktop) */}
            <div className="hidden sm:flex items-center gap-0 mt-[-52px] mb-8 px-12 pointer-events-none">
              {WORKFLOWS[activeFlow].steps.slice(0, -1).map((step, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    step.status === 'completed' ? 'bg-emerald-500/40' : 'bg-white/10',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   SecuritySection — Trust & RBAC
   ═══════════════════════════════════════════════════ */

const SECURITY_FEATURES = [
  {
    icon: Shield,
    title: 'Role-Based Access Control',
    description: 'Granular permissions matrix with department-scoped access and custom role creation.',
  },
  {
    icon: Eye,
    title: 'Complete Audit Trail',
    description: 'Every action logged with timestamps, actors, and change diffs — fully traceable.',
  },
  {
    icon: Lock,
    title: 'Password-Protected Actions',
    description: 'Critical operations require password re-confirmation. Super Admin verifies every step.',
  },
  {
    icon: FileCheck,
    title: 'Approval Traceability',
    description: 'Every approval decision is recorded with reason, reviewer, and timestamp.',
  },
]

export function SecuritySection() {
  const containerRef = useScrollReveal()

  return (
    <section className="landing-section bg-[#060C1A]" ref={containerRef}>
      <div className="landing-container">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left — content */}
          <div className="scroll-reveal-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-400">
              <Lock className="h-3 w-3" />
              Security
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Enterprise-grade security by design
            </h2>
            <p className="mt-4 text-base text-white/50 leading-relaxed">
              Built for organizations that need complete control. Every access point,
              every action, every change — governed, logged, and protected.
            </p>

            <div className="mt-8 space-y-5">
              {SECURITY_FEATURES.map((item, i) => (
                <div
                  key={item.title}
                  className={cn('flex gap-4 scroll-reveal', `reveal-delay-${i + 1}`)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/8">
                    <item.icon className="h-5 w-5 text-white/60" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/40">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — visual */}
          <div className="scroll-reveal-right reveal-delay-2">
            <div className="landing-glass-card rounded-2xl p-6 space-y-3">
              {/* Simulated audit log */}
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-4">
                Live Audit Log
              </div>
              {[
                { action: 'Role changed', user: 'CEO', detail: 'HR → Admin', time: '2s ago', color: 'text-blue-400' },
                { action: 'Approval granted', user: 'Moderator', detail: 'Company #1847', time: '15s ago', color: 'text-emerald-400' },
                { action: 'Employee hired', user: 'HR Manager', detail: 'Engineering dept', time: '1m ago', color: 'text-pink-400' },
                { action: 'Payment verified', user: 'Accounting', detail: '$2,400/mo', time: '3m ago', color: 'text-amber-400' },
                { action: 'Access revoked', user: 'Super Admin', detail: 'Security review', time: '5m ago', color: 'text-red-400' },
              ].map((log, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-white/[0.02] border border-white/[0.04] px-4 py-3 animate-fade-in-left"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', log.color.replace('text-', 'bg-'))} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-medium text-white/80">{log.action}</span>
                    <span className="text-[12px] text-white/30 mx-1.5">·</span>
                    <span className={cn('text-[12px] font-medium', log.color)}>{log.user}</span>
                  </div>
                  <span className="text-[11px] text-white/20 flex-shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   BillingControlSection — Payments & Moderation
   ═══════════════════════════════════════════════════ */

export function BillingControlSection() {
  const containerRef = useScrollReveal()

  return (
    <section className="landing-section bg-[#080E1A]" ref={containerRef}>
      <div className="landing-container">
        <div className="mx-auto max-w-2xl text-center scroll-reveal">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            <CreditCard className="h-3 w-3" />
            Control
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Financial control at every level
          </h2>
          <p className="mt-4 text-base text-white/50 leading-relaxed">
            Monitor billing, manage subscriptions, track overdue payments,
            and maintain full financial transparency across all companies.
          </p>
        </div>

        {/* Bento grid of financial features */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: CreditCard,
              title: 'Subscription Management',
              desc: 'Automated billing cycles with plan upgrades, downgrades, and proration.',
              accent: 'blue',
              span: false,
            },
            {
              icon: AlertTriangle,
              title: 'Overdue Detection',
              desc: 'Auto-flag overdue payments with grace periods and suspension workflows.',
              accent: 'red',
              span: false,
            },
            {
              icon: Percent,
              title: 'Discount Engine',
              desc: 'Fixed, percentage, temporary, and promo discounts — all audited.',
              accent: 'green',
              span: false,
            },
            {
              icon: BarChart3,
              title: 'Revenue Analytics',
              desc: 'Real-time revenue tracking, MRR, churn metrics, and forecast dashboards.',
              accent: 'violet',
              span: true,
            },
            {
              icon: TrendingUp,
              title: 'Company Health Score',
              desc: 'Aggregate billing status, activity, and compliance into a single health metric.',
              accent: 'amber',
              span: false,
            },
          ].map((item, i) => {
            const Icon = item.icon
            const accentColors: Record<string, string> = {
              blue: 'bg-blue-500/10 text-blue-400',
              red: 'bg-red-500/10 text-red-400',
              green: 'bg-emerald-500/10 text-emerald-400',
              violet: 'bg-violet-500/10 text-violet-400',
              amber: 'bg-amber-500/10 text-amber-400',
            }
            return (
              <div
                key={item.title}
                className={cn(
                  'landing-glass-card rounded-2xl p-6 scroll-reveal',
                  `reveal-delay-${i + 1}`,
                  item.span && 'lg:col-span-2',
                )}
              >
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', accentColors[item.accent])}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/45">{item.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
