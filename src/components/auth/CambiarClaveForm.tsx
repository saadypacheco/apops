'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import Link from 'next/link'
import { cambiarClave } from '@/lib/auth/actions-v2'
import type { FormState } from '@/types/auth'

const initial: FormState = {}

// Form de cambio de clave (F5). Usa la misma server action en dos casos:
//   - Cambio voluntario: pide clave actual + nueva + confirmar.
//   - Crear primera clave (post magic-link sin clave): omite el campo
//     "actual" porque la sesión por magic link ya autentica al usuario.

type Props = {
  yaTieneClave: boolean
}

export function CambiarClaveForm({ yaTieneClave }: Props) {
  const [state, action] = useFormState(cambiarClave, initial)

  return (
    <form
      action={action}
      className="flex w-full flex-col gap-4 rounded-2xl bg-white p-5 shadow-card"
      noValidate
    >
      <header>
        <h2 className="text-lg font-semibold text-brand-ink">
          {yaTieneClave ? 'Cambiar mi clave' : 'Crear una clave'}
        </h2>
        <p className="text-sm text-brand-muted">
          {yaTieneClave
            ? 'Por seguridad, te pedimos la clave actual antes de cambiarla.'
            : 'Crear una clave te permite ingresar sin pedir magic link cada vez.'}
        </p>
      </header>

      {state.error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
        >
          {state.error}
        </div>
      )}

      {yaTieneClave && (
        <PasswordField
          id="actual"
          name="actual"
          label="Clave actual"
          autoComplete="current-password"
          error={state.fieldErrors?.['actual']}
          hint="Si entraste por magic link y no la recordás, podés dejar este campo vacío."
        />
      )}
      {!yaTieneClave && <input type="hidden" name="actual" value="" />}

      <PasswordField
        id="nueva"
        name="nueva"
        label="Nueva clave"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.['nueva']}
        hint="Mínimo 8 caracteres."
      />

      <PasswordField
        id="confirmar"
        name="confirmar"
        label="Confirmá la nueva clave"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.['confirmar']}
      />

      <div className="flex items-center gap-3 pt-1">
        <SubmitBtn yaTieneClave={yaTieneClave} />
        <Link
          href="/perfil"
          className="text-sm text-brand-muted hover:text-brand-blue hover:underline"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}

function SubmitBtn({ yaTieneClave }: { yaTieneClave: boolean }) {
  const { pending } = useFormStatus()
  const label = yaTieneClave ? 'Guardar nueva clave' : 'Crear clave'
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={
        'inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-btn-primary px-5 text-sm font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover ' +
        'disabled:opacity-70 disabled:cursor-not-allowed'
      }
    >
      {pending ? 'Guardando…' : label}
    </button>
  )
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | undefined
  hint?: string
}

function PasswordField({ id, label, error, hint, ...inputProps }: FieldProps) {
  const [show, setShow] = useState(false)
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-brand-muted"
      >
        {label}
      </label>
      <div
        className={
          'flex items-center gap-2 rounded-lg border px-3 py-2 transition focus-within:ring-2 ' +
          (error
            ? 'border-red-300 focus-within:ring-red-300'
            : 'border-neutral-300 focus-within:ring-brand-blue')
        }
      >
        <input
          id={id}
          type={show ? 'text' : 'password'}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className="w-full bg-transparent text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none"
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ocultar clave' : 'Mostrar clave'}
          aria-pressed={show}
          className="shrink-0 rounded p-1 text-brand-muted/70 transition hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {hint && !error && (
        <p className="text-xs text-brand-muted">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

function EyeIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.4 5.5C10.3 5.2 11.1 5 12 5c6.5 0 10 7 10 7-1 1.7-2.3 3.2-3.7 4.3M5.4 7.6C3.4 9 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"
        strokeLinecap="round"
      />
    </svg>
  )
}
