import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#a3a3a3]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'bg-[#1f1f1f] border border-[#2a2a2a] text-[#f5f5f5] placeholder:text-[#a3a3a3]',
            'focus:border-accent focus:outline-none rounded-lg px-3 py-2 text-sm',
            'transition-colors w-full',
            error && 'border-danger focus:border-danger',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
