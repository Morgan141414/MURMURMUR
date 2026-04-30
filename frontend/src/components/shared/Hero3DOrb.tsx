import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Hero3DOrb — Premium 3D visualization for the landing hero.
 * Represents the "platform nucleus" — a luminous orb with
 * floating data panels orbiting around it.
 */

interface FloatPanelData {
  label: string
  value: string
  position: string
  delay: string
}

const PANELS: FloatPanelData[] = [
  { label: 'Companies', value: '2,847', position: 'top-[5%] right-[-10%]', delay: '0s' },
  { label: 'Employees', value: '48.2K', position: 'bottom-[15%] left-[-15%]', delay: '-1.5s' },
  { label: 'Approvals', value: '99.4%', position: 'top-[60%] right-[-20%]', delay: '-3s' },
  { label: 'Uptime', value: '99.99%', position: 'top-[-5%] left-[10%]', delay: '-4.5s' },
]

export function Hero3DOrb({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleMouse = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5

      el.style.setProperty('--rx', `${y * 8}deg`)
      el.style.setProperty('--ry', `${x * -8}deg`)
    }

    const handleLeave = () => {
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }

    el.addEventListener('mousemove', handleMouse)
    el.addEventListener('mouseleave', handleLeave)
    return () => {
      el.removeEventListener('mousemove', handleMouse)
      el.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('hero-3d-container relative flex items-center justify-center', className)}
      style={{ '--rx': '0deg', '--ry': '0deg' } as React.CSSProperties}
    >
      {/* Ambient glow */}
      <div className="hero-3d-glow" />

      {/* Main orb */}
      <div
        className="hero-3d-orb"
        style={{ transform: 'rotateX(var(--rx)) rotateY(var(--ry))' }}
      >
        {/* Inner ring */}
        <div className="hero-3d-ring" />

        {/* Core light */}
        <div className="absolute inset-[35%] rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent blur-sm" />
      </div>

      {/* Floating data panels */}
      {PANELS.map((panel) => (
        <div
          key={panel.label}
          className={cn('hero-float-panel', panel.position)}
          style={{ animationDelay: panel.delay }}
        >
          <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
            {panel.label}
          </div>
          <div className="text-lg font-bold text-text-primary mt-0.5 tabular-nums">
            {panel.value}
          </div>
        </div>
      ))}

      {/* Orbit particles */}
      <div className="absolute inset-[-30px] rounded-full border border-white/[0.03] animate-[orb-rotate_25s_linear_infinite]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400/60 blur-[1px]" />
      </div>
      <div className="absolute inset-[-50px] rounded-full border border-white/[0.02] animate-[orb-rotate_35s_linear_infinite_reverse]">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400/50 blur-[1px]" />
      </div>
    </div>
  )
}
