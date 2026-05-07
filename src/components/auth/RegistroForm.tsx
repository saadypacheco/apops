'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { registrar } from '@/lib/auth/actions-v2'
import type { FormState } from '@/types/auth'

const initial: FormState = {}

// Form de registro (F3): identifier + email + confirmar email + clave opcional.
// Decisión D10: doble input de email valida contra typos. No mandamos link
// de confirmación.
export function RegistroForm() {
  const [state, action] = useFormState(registrar, initial)

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
        id="identifier"
        name="identifier"
        label="DNI o Legajo"
        placeholder="Sin puntos ni espacios"
        autoComplete="username"
        required
        error={state.fieldErrors?.['identifier']}
      />

      <FieldRow
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="tu@email.com"
        autoComplete="email"
        required
        error={state.fieldErrors?.['email']}
      />

      <FieldRow
        id="emailConfirm"
        name="emailConfirm"
        type="email"
        label="Confirmá tu email"
        placeholder="repetí tu email"
        autoComplete="off"
        required
        error={state.fieldErrors?.['emailConfirm']}
      />

      <FieldRow
        id="password"
        name="password"
        type="password"
        label="Clave (opcional)"
        placeholder="8 caracteres mínimo"
        autoComplete="new-password"
        error={state.fieldErrors?.['password']}
        helper="Si no la ponés, te enviamos un link al email para entrar."
      />

      <SubmitButton />

      <div className="flex flex-col items-center gap-2 pt-1 text-center">
        <Link
          href="/"
          className="text-sm font-medium text-white/85 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Ya tengo cuenta. Iniciar sesión
        </Link>
      </div>
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
      {pending ? 'Creando cuenta…' : 'Crear cuenta'}
    </button>
  )
}

type FieldRowProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | undefined
  helper?: string
}

function FieldRow({ id, label, error, helper, ...inputProps }: FieldRowProps) {
  const errorId = error ? `${id}-error` : undefined
  const helperId = helper ? `${id}-helper` : undefined
  return (
    <div className="flex flex-col gap-1">
      <div
        className={
          'rounded-2xl bg-white/95 px-4 py-2.5 shadow-card transition focus-within:shadow-cardHover focus-within:ring-2 ' +
          (error
            ? 'ring-2 ring-red-400'
            : 'ring-1 ring-brand-deep/10 focus-within:ring-brand-blue')
        }
      >
        <label
          htmlFor={id}
          className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted"
        >
          {label}
        </label>
        <input
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId ?? helperId}
          className="w-full bg-transparent text-base text-brand-ink placeholder:text-brand-muted/60 focus:outline-none"
          {...inputProps}
        />
      </div>
      {helper && !error && (
        <p id={helperId} className="text-xs text-white/85">
          {helper}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-100">
          {error}
        </p>
      )}
    </div>
  )
}
