import { NavLink, useNavigate } from 'react-router'
import {
  LayoutDashboard,
  UserPlus,
  Handshake,
  Building2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  GitBranch,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

export function CRMSidebar() {
  const fullName = useAuthStore((s) => s.fullName)
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { to: '/company/crm', label: 'Дашборд', icon: LayoutDashboard, exact: true },
    { to: '/company/crm/leads', label: 'Лиды', icon: UserPlus },
    { to: '/company/crm/deals', label: 'Сделки', icon: Handshake },
    { to: '/company/crm/pipelines', label: 'Воронки', icon: GitBranch },
    { to: '/company/crm/automation', label: 'Автоматизация', icon: Zap },
    { to: '/company/crm/organizations', label: 'Организации', icon: Building2 },
    { to: '/company/crm/tasks', label: 'Задачи', icon: CheckSquare },
  ]

  const handleBackToProject = () => {
    navigate('/company')
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-gradient-to-b from-background to-muted/20 transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[220px]',
      )}
    >
      {/* Back to Project Button */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-border">
          <button
            onClick={handleBackToProject}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Назад в проект</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <Handshake className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">CRM</div>
              <div className="text-xs text-muted-foreground truncate">{fullName || 'User'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Collapse/Expand Button */}
      <div className="border-t border-border px-3 py-3">
        {!collapsed ? (
          <button
            onClick={() => setCollapsed(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            <ChevronLeft className="h-3 w-3" />
            <span>Свернуть</span>
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent"
            title="Развернуть"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
