import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface AccButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'icon'
  icon?: ReactNode
  children?: ReactNode
}

export function AccButton({ variant = 'default', icon, children, className = '', ...rest }: AccButtonProps) {
  const cls = [
    'acc-btn',
    variant === 'primary' && 'acc-btn--primary',
    variant === 'icon' && 'acc-btn--icon',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button className={cls} {...rest}>
      {icon}
      {children}
    </button>
  )
}
