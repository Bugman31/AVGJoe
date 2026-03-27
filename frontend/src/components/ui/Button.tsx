import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'border border-[#2a2a2a] text-[#a3a3a3] hover:bg-[#1f1f1f] disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 disabled:opacity-50 disabled:cursor-not-allowed',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
