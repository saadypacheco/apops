'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { solicitarMagicLink } from '@/lib/auth/actions-v2'
import type { FormState } from '@/types/auth'

const initial: FormState = {}

// Form para pedir magic link (F3). Cubre dos casos según prop `modo`:
//   - 'login' (default): usuario quiere ingresar sin clave
//   - 'reset':            usuario olvidó clave (D5 — F5 fuerza el cambio
//                         post-callback)
//
// Server action es la misma — la diferencia es solo de copy.

type Modo = 'login' | 'reset'

export function MagicLinkForm({ modo = 'login' }: { modo?: Modo }) {
  const [state, action] = useFormState(solicitarMagicLink, initial)

  const titulo = modo === 'reset' ? 'Recuperar mi clave' : 'Ingresar con magic link'
  const subtitulo =
    modo === 'reset'
      ? 'Te mandamos un email para entrar y crear una clave nueva.'
      : 'Te mandamos un email con un link para entrar.'
  const cta = modo === 'reset' ? 'Enviar link de recuperación' : 'Enviar magic link'
  const ctaLoading = modo === 'reset' ? 'Enviando…' : 'Enviando…'

  return (
    <form
      action={action}
      className="flex w-full flex-col gap-4 rounded-2xl bg-white p-5 shadow-card"
      noValidate
    >
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white"
        >
          <EnvelopeIcon className="h-6 w-6" />
        </span>
        <div className="flex flex-col leading-tight">
          <h2 className="text-lg font-bold text-brand-ink">{titulo}</h2>
          <p className="text-xs text-brand-muted">{subtitulo}</p>
        </div>
      </header>

      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
        >
          {state.error}
        </div>
      )}

      <FieldRow
        id="identifier"
        name="identifier"
        label="DNI / Legajo"
        placeholder="Sin puntos ni espacios"
        autoComplete="username"
        required
        error={state.fieldErrors?.['identifier']}
      />

      <SubmitButton cta={cta} ctaLoading={ctaLoading} />

      <Separator />

      <div className="flex flex-col items-center gap-2 text-center">
        <Link
          href="/"
          className="text-sm font-semibold text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
        >
          Ingresar con clave
        </Link>
        <p className="text-sm text-brand-muted">
          ¿Primera vez?{' '}
          <Link
            href="/registrarse"
            className="font-semibold text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
          >
            Registrate
          </Link>
        </p>
      </div>
    </form>
  )
}

function SubmitButton({
  cta,
  ctaLoading,
}: {
  cta: string
  ctaLoading: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={
        'inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-lg bg-btn-primary px-6 text-sm font-bold uppercase tracking-wider text-white shadow-card transition ' +
        'hover:shadow-cardHover hover:-translate-y-0.5 ' +
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30 ' +
        'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0'
      }
    >
      {pending ? ctaLoading : cta}
    </button>
  )
}

function Separator() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-brand-deep/15" />
      <span className="text-xs text-brand-muted">o</span>
      <span className="h-px flex-1 bg-brand-deep/15" />
    </div>
  )
}

type FieldRowProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | undefined
}

function FieldRow({ id, label, error, ...inputProps }: FieldRowProps) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted"
      >
        {label}
      </label>
      <div
        className={
          'flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 ring-1 transition focus-within:ring-2 ' +
          (error
            ? 'ring-red-300 focus-within:ring-red-400'
            : 'ring-brand-deep/15 focus-within:ring-brand-blue')
        }
      >
        <span className="text-brand-muted/70" aria-hidden>
          <PersonIcon />
        </span>
        <input
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className="w-full bg-transparent text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none"
          {...inputProps}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 8l9 6 9-6" strokeLinecap="round" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  )
}
