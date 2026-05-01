import { Label } from '@radix-ui/react-label'
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode
  error?: string | undefined
  hint?: ReactNode
}

// Touch target ≥ 44px (constitución II) y font-size 16px (evita zoom en iOS).
const baseInput =
  'w-full min-h-[44px] rounded-md border bg-white px-3 py-2 text-base ' +
  'placeholder:text-neutral-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-1 ' +
  'disabled:cursor-not-allowed disabled:bg-neutral-100'

const variantOk = 'border-neutral-300 focus:ring-blue-500'
const variantError = 'border-red-500 focus:ring-red-500'

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, error, hint, className, ...rest },
  ref,
) {
  const inputId = id ?? `input-${rest.name ?? ''}`
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId} className="text-sm font-medium text-neutral-800">
        {label}
      </Label>

      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`${baseInput} ${error ? variantError : variantOk} ${className ?? ''}`}
        {...rest}
      />

      {hint && !error && (
        <p id={hintId} className="text-sm text-neutral-600">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
})
