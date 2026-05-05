'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { submitDniLegajo } from '@/lib/auth/actions'
import type { FormState } from '@/types/auth'

const initial: FormState = {}

// Form de la landing. Mismo Server Action que DniLegajoForm pero con
// estilo borderless sobre el gradient (inputs con underline, texto blanco).

export function LandingForm() {
  const [state, action] = useFormState(submitDniLegajo, initial)

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg bg-red-500/15 px-4 py-2.5 text-sm text-white backdrop-blur-sm ring-1 ring-white/30"
        >
          {state.error}
        </div>
      )}

      <FieldRow
        id="dni"
        name="dni"
        label="DNI"
        placeholder="Sin puntos ni espacios"
        inputMode="numeric"
        autoComplete="off"
        required
        error={state.fieldErrors?.['dni']}
        icon={
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="11" r="2.5" />
            <path d="M14 10h5M14 13h4M6 17h12" strokeLinecap="round" />
          </svg>
        }
      />

      <FieldRow
        id="legajo"
        name="legajo"
        label="Legajo"
        placeholder="Tu legajo de ANSES"
        autoComplete="off"
        required
        error={state.fieldErrors?.['legajo']}
        icon={
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6"
          >
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" />
          </svg>
        }
      />

      <SubmitButton />

      <Link
        href="/login-sin-legajo"
        className="text-center text-sm font-medium uppercase tracking-wider text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        ¿No tenés legajo? Ingresá con tu DNI
      </Link>
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={
        'mt-2 inline-flex min-h-[3.5rem] w-full items-center justify-center rounded-full bg-white px-6 text-base font-bold uppercase tracking-wider text-brand-deep shadow-card transition-all ' +
        'hover:shadow-cardHover hover:-translate-y-0.5 ' +
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 ' +
        'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0'
      }
    >
      {pending ? 'Validando…' : 'Ingresar'}
    </button>
  )
}

type FieldRowProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | undefined
  icon: React.ReactNode
}

function FieldRow({ id, label, error, icon, ...inputProps }: FieldRowProps) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-3 border-b border-white/40 pb-2 focus-within:border-white">
        <span className="pb-0.5 text-white/85" aria-hidden>
          {icon}
        </span>
        <div className="flex flex-1 flex-col">
          <label
            htmlFor={id}
            className="text-xs font-semibold uppercase tracking-wider text-white/85"
          >
            {label}
          </label>
          <input
            id={id}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId}
            className="bg-transparent text-base text-white placeholder:text-white/50 focus:outline-none"
            {...inputProps}
          />
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-100">
          {error}
        </p>
      )}
    </div>
  )
}
