import { useOrgStore } from '@/stores/orgStore'
import { cn } from '@/lib/utils'

interface DataMaskProps {
  /** The actual data to display */
  children: React.ReactNode
  /** Fallback masked value (default: "••••••••") */
  maskedValue?: string
  /** If true, this field is always visible (override masking) */
  alwaysVisible?: boolean
  /** CSS class for the mask container */
  className?: string
}

/**
 * Data display component. Previously handled emergency-based masking,
 * now simplified — data is always visible to the user's role level.
 */
export function DataMask({
  children,
  className,
}: DataMaskProps) {
  return <span className={cn(className)}>{children}</span>
}

/**
 * Section wrapper. Simplified — shows content directly.
 */
export function MaskedSection({
  children,
  className,
}: {
  children: React.ReactNode
  title?: string
  className?: string
}) {
  return <div className={cn(className)}>{children}</div>
}
