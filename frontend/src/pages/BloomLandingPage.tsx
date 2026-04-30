import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import {
  ChevronDown, Menu, X, ArrowRight, Check, Shield, Zap, Users,
  Building2, BarChart3, FileText, Lock, Globe, Star, ChevronRight,
  Play, Sparkles, Clock, TrendingUp, Award, Layers, GitBranch,
  UserCheck, Bell, Briefcase, PieChart, Bot, Cpu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { Hero3DOrb } from '@/components/shared/Hero3DOrb'
import { WorkflowSection, SecuritySection, BillingControlSection } from '@/components/shared/LandingSections'

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4'

const NAV_LINKS = [
  { label: 'Платформа', href: '#platform' },
  { label: 'Роли', href: '#roles' },
  { label: 'Возможности', href: '#features' },
  { label: 'Цены', href: '#pricing' },
]

const TRUST_LOGOS = [
  'Готово для бизнеса', 'SOC 2', 'GDPR', 'ISO 27001', 'SLA 99.9%',
]

const ROLES = [
  {
    icon: Award,
    title: 'Основатель',
    accent: 'from-amber-400 to-orange-500',
    accentBg: 'bg-amber-500/10',
    accentText: 'text-amber-400',
    description: 'Полный контроль над компанией со стратегическими панелями, финансовыми метриками и аналитикой роста.',
    features: ['Панели доходов', 'Эффективность проектовы', 'Стратегические KPI', 'Отчёты для инвесторов'],
  },
  {
    icon: Briefcase,
    title: 'Генеральный директор',
    accent: 'from-blue-400 to-blue-600',
    accentBg: 'bg-blue-500/10',
    accentText: 'text-blue-400',
    description: 'Центр управления руководителем с обзором всех отделов и цепочками согласований.',
    features: ['Аналитика всей организации', 'Цепочки согласований', 'Метрики отделов', 'Отслеживание OKR'],
  },
  {
    icon: Users,
    title: 'HR-менеджер',
    accent: 'from-pink-400 to-rose-500',
    accentBg: 'bg-pink-500/10',
    accentText: 'text-pink-400',
    description: 'Центр управления персоналом: найм, адаптация и управление проектовой.',
    features: ['Воронка найма', 'Адаптация сотрудников', 'Управление отпусками', 'Оценка эффективности'],
  },
  {
    icon: Shield,
    title: 'Администратор',
    accent: 'from-violet-400 to-purple-600',
    accentBg: 'bg-violet-500/10',
    accentText: 'text-violet-400',
    description: 'Администрирование системы: управление ролями, настройки безопасности и журналы аудита.',
    features: ['Роли и права', 'Журнал аудита', 'Политики безопасности', 'Конфигурация системы'],
  },
  {
    icon: BarChart3,
    title: 'Бухгалтерия',
    accent: 'from-emerald-400 to-green-600',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-400',
    description: 'Финансовые операции: выставление счетов, отслеживание расходов и отчёты.',
    features: ['Управление счетами', 'Отслеживание расходов', 'Финансовые отчёты', 'Планирование бюджета'],
  },
  {
    icon: Globe,
    title: 'Маркетинг',
    accent: 'from-orange-400 to-red-500',
    accentBg: 'bg-orange-500/10',
    accentText: 'text-orange-400',
    description: 'Управление кампаниями, панели аналитики и инструменты для работы с контентом.',
    features: ['Отслеживание кампаний', 'Панель аналитики', 'Контент-календарь', 'Оценка лидов'],
  },
]

const FEATURES = [
  {
    icon: Layers,
    title: 'Многоуровневая архитектура',
    description: 'Платформа, Компания и отделы — каждый уровень с собственным интерфейсом и правами.',
  },
  {
    icon: GitBranch,
    title: 'Цепочки согласований',
    description: 'Многошаговые согласования с маршрутизацией по ролям, сроками и правилами эскалации.',
  },
  {
    icon: UserCheck,
    title: 'Умная адаптация',
    description: 'Мастер настройки для новых компаний и сотрудников — автоматическая настройка ролей, проектов и доступа.',
  },
  {
    icon: Bell,
    title: 'Центр уведомлений',
    description: 'Уведомления в реальном времени с приоритетами, каналами и умной группировкой.',
  },
  {
    icon: PieChart,
    title: 'Корпоративная аналитика',
    description: 'Адаптивные панели с отслеживанием KPI, пользовательскими отчётами и экспортом данных.',
  },
  {
    icon: Lock,
    title: 'Корпоративная безопасность',
    description: 'RBAC, журналы аудита, управление сессиями, 2FA и белые списки IP.',
  },
]

const PRICING_PLANS = [
  {
    name: 'Стартовый',
    price: 'Бесплатно',
    period: '',
    description: 'Для небольших проектов',
    features: ['До 10 пользователей', 'Базовые панели', 'Поддержка по почте', 'Основные модули'],
    cta: 'Начать бесплатно',
    highlighted: false,
  },
  {
    name: 'Бизнес',
    price: '$29',
    period: '/пользователь/мес',
    description: 'Для растущих компаний',
    features: ['Неограниченные пользователи', 'Расширенная аналитика', 'Приоритетная поддержка', 'Все модули', 'Доступ к API', 'Пользовательские роли'],
    cta: 'Пробный период',
    highlighted: true,
  },
  {
    name: 'Корпоративный',
    price: 'Индивидуально',
    period: '',
    description: 'Для крупных организаций',
    features: ['Всё из Бизнес', 'Персональная поддержка', 'Гарантия SLA', 'Пользовательские интеграции', 'Локальное размещение', 'SSO и SAML'],
    cta: 'Связаться с отделом продаж',
    highlighted: false,
  },
]

/* ═══════════════════════════════════════════════════
   LOGO SVG
   ═══════════════════════════════════════════════════ */

function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="16" viewBox="0 0 28 16" fill="none">
      <path
        d="M1.04356 6.35771L13.6437 0.666504L13.2006 3.16498L3.01927 7.80327L13.2006 12.4416L13.6437 14.94L1.04356 9.24883L0.333374 7.80327L1.04356 6.35771ZM14.3994 3.16498L14.8425 0.666504L27.4426 6.35771L28.1528 7.80327L27.4426 9.24883L14.8425 14.94L14.3994 12.4416L24.5807 7.80327L14.3994 3.16498Z"
        fill="currentColor"
      />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════
   SECTION: Navbar
   ═══════════════════════════════════════════════════ */

function LandingNav() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'landing-nav py-3'
            : 'bg-transparent py-5',
        )}
      >
        <div className="landing-container flex items-center justify-between">
          {/* Logo */}
          <a href="/bloom" className="flex items-center gap-2.5">
            <LogoMark className="text-white h-4" />
            <span className="text-[15px] font-semibold text-white tracking-tight">Bloom OS</span>
          </a>

          {/* Center links — desktop */}
          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-[13px] font-medium text-white/70 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* CTA buttons — desktop */}
          <div className="hidden items-center gap-3 lg:flex">
            <button
              onClick={() => navigate('/login')}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-medium text-white/90 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20"
            >
              Войти
            </button>
            <button
              onClick={() => navigate('/register')}
              className="rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-primary/35"
            >
              Начать
            </button>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMenuOpen(true)} className="text-white lg:hidden" aria-label="Открыть меню">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#060C1A]/98 backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 py-5">
            <a href="/bloom" className="flex items-center gap-2.5">
              <LogoMark className="text-white h-4" />
              <span className="text-[15px] font-semibold text-white">Bloom OS</span>
            </a>
            <button onClick={() => setMenuOpen(false)} className="text-white" aria-label="Закрыть меню">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-7">
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-xl font-medium text-white/80 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-8 flex flex-col gap-3 w-56">
              <button
                onClick={() => { setMenuOpen(false); navigate('/login') }}
                className="rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-center text-[14px] font-medium text-white"
              >
                Войти
              </button>
              <button
                onClick={() => { setMenuOpen(false); navigate('/register') }}
                className="rounded-lg bg-primary px-6 py-3 text-center text-[14px] font-semibold text-white"
              >
                Начать
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════════
   SECTION: Hero (with 3D Orb)
   ═══════════════════════════════════════════════════ */

function HeroSection() {
  const navigate = useNavigate()

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Video background */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay loop muted playsInline preload="auto"
        src={VIDEO_URL}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060C1A]/40 via-[#060C1A]/20 to-[#060C1A]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#060C1A]/30 via-transparent to-[#060C1A]/30" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center pt-20">
        {/* Badge */}
        <div className="animate-fade-in-up flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-1.5 pr-4 py-1 backdrop-blur-md">
          <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white uppercase tracking-wider">
            <Sparkles className="h-3 w-3" />
            Новинка
          </span>
          <span className="text-[13px] font-medium text-white/80">
            Операционная система для компаний v2.0
          </span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-in-up stagger-1 mt-8 max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Операционная система,{' '}
          <span className="text-gradient-brand">
            которую заслуживает
          </span>{' '}
          ваша компания
        </h1>

        {/* Sub-headline */}
        <p className="animate-fade-in-up stagger-2 mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
          Управляйте проектами, автоматизируйте рабочие процессы и масштабируйте операции — всё на одной интеллектуальной платформе для современных предприятий.
        </p>

        {/* CTA row */}
        <div className="animate-fade-in-up stagger-3 mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate('/register')}
            className="group flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-[15px] font-semibold text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-primary/40 hover:-translate-y-0.5"
          >
            Бесплатный пробный период
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('platform')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-[15px] font-medium text-white/90 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20"
          >
            <Play className="h-4 w-4" />
            Как это работает
          </button>
        </div>

        {/* 3D Orb — visible on large screens */}
        <div className="animate-fade-in-up stagger-4 mt-12 hidden lg:block">
          <Hero3DOrb className="h-[280px] w-[280px]" />
        </div>

        {/* Stats row — visible on smaller screens or below orb */}
        <div className="animate-fade-in-up stagger-4 mt-12 flex items-center gap-8 sm:gap-12 lg:mt-8">
          {[
            { value: '500+', label: 'Компаний' },
            { value: '50K+', label: 'Пользователей' },
            { value: '99.9%', label: 'Время работы' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</div>
              <div className="mt-1 text-[12px] text-white/40 uppercase tracking-wider font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-pulse-soft">
        <ChevronDown className="h-5 w-5 text-white/30" />
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   SECTION: Trust Strip
   ═══════════════════════════════════════════════════ */

function TrustStrip() {
  return (
    <section className="relative border-y border-white/5 bg-[#080E1A] py-6">
      <div className="landing-container flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {TRUST_LOGOS.map((name) => (
          <div
            key={name}
            className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-widest text-white/25"
          >
            <Shield className="h-3.5 w-3.5" />
            {name}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   SECTION: Platform Overview (with scroll-reveal)
   ═══════════════════════════════════════════════════ */

function PlatformSection() {
  const containerRef = useScrollReveal()

  return (
    <section id="platform" className="landing-section bg-[#060C1A]" ref={containerRef}>
      <div className="landing-container">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center scroll-reveal">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Cpu className="h-3 w-3" />
            Платформа
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Одна платформа — все отделы
          </h2>
          <p className="mt-4 text-base text-white/50 leading-relaxed">
            От панелей основателя до HR-процессов — Bloom OS адаптируется под каждую
            роль в вашей организации с помощью интеллектуальных интерфейсов на основе ролей.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={cn(
                'landing-glass-card group rounded-2xl p-6 scroll-reveal',
                `reveal-delay-${Math.min(i + 1, 6)}`,
              )}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-[15px] font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/45">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   SECTION: Role-Based Panels (with scroll-reveal)
   ═══════════════════════════════════════════════════ */

function RolesSection() {
  const containerRef = useScrollReveal()
  const [activeRole, setActiveRole] = useState(0)

  return (
    <section id="roles" className="landing-section bg-[#080E1A]" ref={containerRef}>
      <div className="landing-container">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center scroll-reveal">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Users className="h-3 w-3" />
            По ролям
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Индивидуально для каждой роли
          </h2>
          <p className="mt-4 text-base text-white/50 leading-relaxed">
            Каждая роль получает рабочее пространство с релевантными данными, инструментами и
            правами — ничего лишнего, только самое важное.
          </p>
        </div>

        {/* Role selector pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-2 scroll-reveal reveal-delay-1">
          {ROLES.map((role, i) => (
            <button
              key={role.title}
              onClick={() => setActiveRole(i)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all',
                activeRole === i
                  ? 'bg-white/10 text-white border border-white/15 shadow-lg'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent',
              )}
            >
              <role.icon className="h-4 w-4" />
              {role.title}
            </button>
          ))}
        </div>

        {/* Active role detail */}
        <div className="mt-10 mx-auto max-w-3xl scroll-reveal reveal-delay-2">
          <div
            key={activeRole}
            className="landing-glass-card rounded-2xl p-8 animate-fade-in"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              {/* Icon */}
              <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-xl', ROLES[activeRole].accentBg)}>
                {(() => { const Icon = ROLES[activeRole].icon; return <Icon className={cn('h-7 w-7', ROLES[activeRole].accentText)} /> })()}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{ROLES[activeRole].title} — Панель</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/50">
                  {ROLES[activeRole].description}
                </p>

                {/* Feature list */}
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {ROLES[activeRole].features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-[13px] text-white/70">
                      <div className={cn('flex h-5 w-5 items-center justify-center rounded-full', ROLES[activeRole].accentBg)}>
                        <Check className={cn('h-3 w-3', ROLES[activeRole].accentText)} />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   SECTION: AI / Automation (with scroll-reveal)
   ═══════════════════════════════════════════════════ */

function AISection() {
  const containerRef = useScrollReveal()

  return (
    <section className="landing-section bg-[#060C1A]" ref={containerRef}>
      <div className="landing-container">
        <div className="mx-auto max-w-4xl scroll-reveal">
          <div className="landing-glass-card overflow-hidden rounded-2xl">
            {/* Gradient accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary via-violet-500 to-emerald-500" />

            <div className="p-8 sm:p-12">
              <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                {/* Left — content */}
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-400">
                    <Bot className="h-3 w-3" />
                    На базе ИИ
                  </div>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Интеллект встроен в каждый процесс
                  </h2>
                  <p className="mt-4 text-[14px] leading-relaxed text-white/50">
                    Умные подсказки, автоматическая маршрутизация, предиктивная аналитика и
                    поиск на естественном языке — Bloom OS изучает, как работает ваша компания,
                    и автоматически делает её лучше.
                  </p>

                  <div className="mt-6 space-y-3">
                    {[
                      { icon: Zap, text: 'Автоматическая маршрутизация согласований по иерархии организации' },
                      { icon: TrendingUp, text: 'Предиктивная аналитика эффективности проектовы' },
                      { icon: Clock, text: 'Умное планирование и управление сроками' },
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-3 text-[13px] text-white/65">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
                          <item.icon className="h-3.5 w-3.5 text-violet-400" />
                        </div>
                        {item.text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — decorative */}
                <div className="hidden lg:flex flex-col items-center justify-center w-60">
                  <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-primary/20">
                    <div className="absolute inset-3 rounded-full bg-gradient-to-br from-violet-500/10 to-primary/10 animate-pulse-soft" />
                    <Bot className="relative h-12 w-12 text-violet-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   SECTION: Pricing (with scroll-reveal)
   ═══════════════════════════════════════════════════ */

function PricingSection() {
  const navigate = useNavigate()
  const containerRef = useScrollReveal()

  return (
    <section id="pricing" className="landing-section bg-[#080E1A]" ref={containerRef}>
      <div className="landing-container">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center scroll-reveal">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Star className="h-3 w-3" />
            Цены
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Простые и прозрачные цены
          </h2>
          <p className="mt-4 text-base text-white/50">
            Начните бесплатно. Масштабируйтесь по мере роста. Без скрытых платежей.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {PRICING_PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={cn(
                'relative rounded-2xl p-8 transition-all scroll-reveal',
                `reveal-delay-${i + 1}`,
                plan.highlighted
                  ? 'landing-glass-card border-primary/30 shadow-glow-md bg-primary/[0.03]'
                  : 'landing-glass-card',
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[11px] font-semibold text-white uppercase tracking-wider">
                  Популярный выбор
                </div>
              )}

              <h3 className="text-[15px] font-semibold text-white">{plan.name}</h3>
              <p className="mt-1 text-[13px] text-white/40">{plan.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                {plan.period && <span className="text-[13px] text-white/40">{plan.period}</span>}
              </div>

              <button
                onClick={() => navigate('/register')}
                className={cn(
                  'mt-6 w-full rounded-lg py-2.5 text-[13px] font-semibold transition-all',
                  plan.highlighted
                    ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20'
                    : 'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                )}
              >
                {plan.cta}
              </button>

              <div className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-[13px] text-white/55">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   SECTION: CTA Banner (with scroll-reveal)
   ═══════════════════════════════════════════════════ */

function CTASection() {
  const navigate = useNavigate()
  const containerRef = useScrollReveal()

  return (
    <section className="landing-section bg-[#060C1A]" ref={containerRef}>
      <div className="landing-container">
        <div className="mx-auto max-w-4xl text-center scroll-reveal">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Готовы трансформировать ваши{' '}
            <span className="text-gradient-primary">процессы</span>?
          </h2>
          <p className="mt-5 text-base text-white/50 leading-relaxed max-w-2xl mx-auto">
            Присоединяйтесь к 500+ компаниям, которые уже используют Bloom OS для оптимизации
            своих операций, расширения возможностей проектов и ускорения роста.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 scroll-reveal reveal-delay-1">
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-[15px] font-semibold text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-primary/40 hover:-translate-y-0.5"
            >
              Бесплатный пробный период
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button className="flex items-center gap-2 text-[14px] font-medium text-white/50 transition-colors hover:text-white/80">
              <FileText className="h-4 w-4" />
              Читать документацию
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════
   SECTION: Footer
   ═══════════════════════════════════════════════════ */

function Footer() {
  const footerLinks = {
    Продукт: ['Возможности', 'Цены', 'Изменения', 'Интеграции', 'API'],
    Компания: ['О нас', 'Блог', 'Вакансии', 'Пресса', 'Партнёры'],
    Ресурсы: ['Документация', 'Руководства', 'Справочный центр', 'Сообщество', 'Статус'],
    'Правовая информация': ['Конфиденциальность', 'Условия', 'Безопасность', 'Файлы cookie'],
  }

  return (
    <footer className="border-t border-white/5 bg-[#060C1A] pt-16 pb-8">
      <div className="landing-container">
        {/* Top row */}
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="/bloom" className="flex items-center gap-2">
              <LogoMark className="text-white h-4" />
              <span className="text-[14px] font-semibold text-white">Bloom OS</span>
            </a>
            <p className="mt-4 text-[13px] leading-relaxed text-white/35 max-w-xs">
              Операционная система для предприятий, которая адаптируется под то, как работает ваша компания.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-[13px] text-white/40 transition-colors hover:text-white/70"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-8">
          <p className="text-[12px] text-white/20">
            &copy; {new Date().getFullYear()} Bloom OS. Все права защищены.
          </p>
          <div className="flex items-center gap-5">
            {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
              <a
                key={social}
                href="#"
                className="text-[12px] text-white/20 transition-colors hover:text-white/40"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE — Full section order
   ═══════════════════════════════════════════════════ */

export default function BloomLandingPage() {
  return (
    <div className="min-h-screen bg-[#060C1A]">
      <LandingNav />
      <HeroSection />
      <TrustStrip />
      <PlatformSection />
      <WorkflowSection />
      <RolesSection />
      <SecuritySection />
      <AISection />
      <BillingControlSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  )
}
