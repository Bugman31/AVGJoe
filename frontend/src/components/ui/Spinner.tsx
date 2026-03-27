import { cn } from '@/lib/utils'

type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-[#2a2a2a] border-t-accent',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}
