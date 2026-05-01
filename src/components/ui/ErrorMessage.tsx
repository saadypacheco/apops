import type { ReactNode } from 'react'

type ErrorMessageProps = {
  // Mensaje legible para el usuario (no códigos técnicos).
  // Constitución II — simplicidad para no técnicos.
  children: ReactNode
  className?: string
}

// Banner de error a nivel pantalla. Para errores de campo individual usar
// la prop `error` de <Input>.
export function ErrorMessage({ children, className }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={
        'rounded-md border border-red-200 bg-red-50 px-4 py-3 ' +
        'text-base text-red-800 ' +
        (className ?? '')
      }
    >
      {children}
    </div>
  )
}
