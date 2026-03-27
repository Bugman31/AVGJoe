import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'accent' | 'success' | 'danger'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#2a2a2a] text-[#a3a3a3]',
  accent: 'bg-accent/20 text-accent',
  success: 'bg-success/20 text-success',
  danger: 'bg-danger/20 text-danger',
}

export default function Badge({
  variant = 'default',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
