'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { useState } from 'react'
import { loginConClave } from '@/lib/auth/actions-v2'
import type { FormState } from '@/types/auth'

const initial: FormState = {}

// Form de login v2 — diseño "card blanca" sobre fondo azul medio.
// Header con ícono circular + título "ACCESO". Inputs con icono a la izq.
// Botón gradiente azul. Links de magic link y registro abajo.
export function LoginForm({ registrado = false }: { registrado?: boolean }) {
  const [state, action] = useFormState(loginConClave, initial)

  return (
    <form
      action={action}
      className="flex w-full flex-col gap-3 rounded-2xl bg-white p-4 shadow-card"
      noValidate
    >
      <header className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white"
        >
          <LockIcon />
        </span>
        <h2 className="text-base font-bold tracking-wide text-brand-ink">
          ACCESO
        </h2>
      </header>

      {registrado && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200"
        >
          ✓ Cuenta creada. Ingresá con tu clave.
        </div>
      )}

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
        label="DNI o legajo"
        placeholder="DNI o legajo"
        autoComplete="username"
        required
        error={state.fieldErrors?.['identifier']}
        icon={<PersonIcon />}
      />

      <PasswordField
        id="password"
        name="password"
        label="Clave"
        placeholder="Clave"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.['password']}
      />

      <SubmitButton />

      <div className="flex flex-col items-center gap-1.5 text-center">
        <Link
          href="/login-magic-link"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
        >
          <EnvelopeIcon className="h-4 w-4" />
          Ingresar con magic link
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/recuperar-clave"
            className="text-brand-muted hover:text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
          >
            ¿Olvidaste tu clave?
          </Link>
          <span aria-hidden className="text-brand-muted/40">·</span>
          <Link
            href="/registrarse"
            className="font-semibold text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
          >
            Registrate
          </Link>
        </div>
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
        'inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-lg bg-btn-primary px-6 text-sm font-bold uppercase tracking-wider text-white shadow-card transition ' +
        'hover:shadow-cardHover hover:-translate-y-0.5 ' +
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30 ' +
        'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0'
      }
    >
      {pending ? 'Ingresando…' : 'Ingresar'}
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
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={
          'flex items-center gap-2.5 rounded-xl bg-white px-3 py-1.5 ring-1 transition focus-within:ring-2 ' +
          (error
            ? 'ring-red-300 focus-within:ring-red-400'
            : 'ring-brand-deep/15 focus-within:ring-brand-blue')
        }
      >
        <span className="text-brand-muted/70" aria-hidden>
          {icon}
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

type PasswordFieldProps = Omit<FieldRowProps, 'icon' | 'type'>

function PasswordField({ id, label, error, ...inputProps }: PasswordFieldProps) {
  const [show, setShow] = useState(false)
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={
          'flex items-center gap-2.5 rounded-xl bg-white px-3 py-1.5 ring-1 transition focus-within:ring-2 ' +
          (error
            ? 'ring-red-300 focus-within:ring-red-400'
            : 'ring-brand-deep/15 focus-within:ring-brand-blue')
        }
      >
        <span className="text-brand-muted/70" aria-hidden>
          <LockIconSmall />
        </span>
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
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

// =====================================================================
// Iconos SVG inline (sin librería)
// =====================================================================

function LockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-6 w-6"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" />
    </svg>
  )
}

function LockIconSmall() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" />
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
