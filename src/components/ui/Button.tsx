import { Slot } from '@radix-ui/react-slot'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  asChild?: boolean
}

// Touch target ≥ 44×44 px (constitución II) y tipografía base 16 px.
const base =
  'inline-flex items-center justify-center min-h-[44px] min-w-[44px] ' +
  'px-4 py-2 rounded-md text-base font-medium ' +
  'transition-colors focus:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary:
    'bg-neutral-200 text-neutral-900 hover:bg-neutral-300 focus-visible:ring-neutral-400',
  ghost:
    'bg-transparent text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-500',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', asChild = false, className, type, ...rest },
    ref,
  ) {
    const Comp = asChild ? Slot : 'button'
    const buttonType = asChild ? undefined : (type ?? 'button')
    return (
      <Comp
        ref={ref as never}
        type={buttonType}
        className={`${base} ${variants[variant]} ${className ?? ''}`}
        {...rest}
      />
    )
  },
)
