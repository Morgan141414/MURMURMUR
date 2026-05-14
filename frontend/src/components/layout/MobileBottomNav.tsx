import { Link, useLocation } from 'react-router'
import { CalendarDays, FileText, HeartPulse, LifeBuoy, User, UsersRound, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrgStore } from '@/stores/orgStore'

type MobileNavItem = {
  to: string
  icon: typeof HeartPulse
  label: string
  match: (path: string) => boolean
}

const clinicNavItems: MobileNavItem[] = [
  { to: '/clinic', icon: HeartPulse, label: '\u0414\u0435\u043d\u044c', match: (path) => path === '/clinic' },
  { to: '/clinic/calendar', icon: CalendarDays, label: '\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c', match: (path) => path.startsWith('/clinic/calendar') },
  { to: '/clinic/appointments', icon: FileText, label: '\u0417\u0430\u043f\u0438\u0441\u0438', match: (path) => path.startsWith('/clinic/appointments') },
  { to: '/clinic/patients', icon: UsersRound, label: '\u041f\u0430\u0446\u0438\u0435\u043d\u0442\u044b', match: (path) => path.startsWith('/clinic/patients') },
  { to: '/profile', icon: User, label: '\u041f\u0440\u043e\u0444\u0438\u043b\u044c', match: (path) => path.startsWith('/profile') },
]

const doctorNavItems: MobileNavItem[] = [
  { to: '/clinic/visits/visit-1042', icon: Stethoscope, label: '\u041f\u0440\u0438\u0435\u043c', match: (path) => path.startsWith('/clinic/visits') },
  { to: '/clinic/calendar', icon: CalendarDays, label: '\u0414\u0435\u043d\u044c', match: (path) => path.startsWith('/clinic/calendar') },
  { to: '/clinic/patients', icon: UsersRound, label: '\u041f\u0430\u0446\u0438\u0435\u043d\u0442\u044b', match: (path) => path.startsWith('/clinic/patients') },
  { to: '/clinic/documents', icon: FileText, label: '\u0414\u043e\u043a\u0438', match: (path) => path.startsWith('/clinic/documents') },
  { to: '/profile', icon: User, label: '\u041f\u0440\u043e\u0444\u0438\u043b\u044c', match: (path) => path.startsWith('/profile') },
]

const patientNavItems: MobileNavItem[] = [
  { to: '/patient', icon: CalendarDays, label: '\u0417\u0430\u043f\u0438\u0441\u0438', match: (path) => path === '/patient' },
  { to: '/patient/records', icon: HeartPulse, label: '\u041a\u0430\u0440\u0442\u0430', match: (path) => path.startsWith('/patient/records') },
  { to: '/patient/documents', icon: FileText, label: '\u0414\u043e\u043a\u0438', match: (path) => path.startsWith('/patient/documents') },
  { to: '/patient/support', icon: LifeBuoy, label: '\u041f\u043e\u043c\u043e\u0449\u044c', match: (path) => path.startsWith('/patient/support') },
  { to: '/profile', icon: User, label: '\u041f\u0440\u043e\u0444\u0438\u043b\u044c', match: (path) => path.startsWith('/profile') },
]

export function MobileBottomNav() {
  const location = useLocation()
  const role = useOrgStore((s) => s.activeOrgRole())

  if (location.pathname.startsWith('/messenger')) return null

  const items = location.pathname.startsWith('/patient') || role === 'patient'
    ? patientNavItems
    : role === 'doctor' || role === 'chief_doctor'
      ? doctorNavItems
      : clinicNavItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-border bg-card/95 px-1 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
      {items.map((item) => {
        const active = item.match(location.pathname)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex min-w-0 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] transition-colors',
              active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="max-w-full truncate text-[10px] leading-tight">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
