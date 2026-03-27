import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: boolean
}

export default function Card({
  children,
  className,
  padding = true,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-[#141414] border border-[#2a2a2a] rounded-xl',
        padding && 'p-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
