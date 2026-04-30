import { NavLink, useLocation } from 'react-router'
import { Home, MessageSquare, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { to: '/dashboard', icon: Home, label: 'Главная' },
  { to: '/messenger', icon: MessageSquare, label: 'Чат' },
  { to: '/profile', icon: User, label: 'Профиль' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
]

export function MobileBottomNav() {
  const location = useLocation()
  
  // Don't show on messenger page
  if (location.pathname.startsWith('/messenger')) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card px-1 py-2 md:hidden">
      {mobileNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] transition-colors min-w-[60px]',
              isActive
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground'
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[10px]">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}