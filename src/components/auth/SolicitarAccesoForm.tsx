'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { solicitarAcceso } from '@/lib/auth/actions-v2'
import type { FormState } from '@/types/auth'

const initial: FormState = {}

// Form de "Solicitar acceso a la app" (F4). Crea una entrada en
// solicitudes_pendientes que el admin revisa después en /admin/solicitudes.
//
// Si el usuario llegó desde /registrarse y tipeó un identifier, lo recibimos
// como prop para prefillear DNI o Legajo según corresponda.

export function SolicitarAccesoForm({
  prefillDni,
  prefillLegajo,
}: {
  prefillDni?: string
  prefillLegajo?: string
}) {
  const [state, action] = useFormState(solicitarAcceso, initial)

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
          <DocumentIcon />
        </span>
        <div className="flex flex-col leading-tight">
          <h2 className="text-lg font-bold text-brand-ink">Solicitar acceso</h2>
          <p className="text-xs text-brand-muted">
            Un administrador va a revisar tu pedido.
          </p>
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
        id="dni"
        name="dni"
        label="DNI"
        placeholder="Sin puntos ni espacios"
        autoComplete="off"
        inputMode="numeric"
        defaultValue={prefillDni ?? ''}
        required
        error={state.fieldErrors?.['dni']}
      />

      <FieldRow
        id="legajo"
        name="legajo"
        label="Legajo (opcional)"
        placeholder="Si tenés legajo, ingresalo"
        autoComplete="off"
        defaultValue={prefillLegajo ?? ''}
        error={state.fieldErrors?.['legajo']}
      />

      <FieldRow
        id="nombre"
        name="nombre"
        label="Nombre completo"
        placeholder="Apellido, Nombres"
        autoComplete="name"
        required
        error={state.fieldErrors?.['nombre']}
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
        placeholder="Volvé a escribirlo"
        autoComplete="email"
        required
        error={state.fieldErrors?.['emailConfirm']}
      />

      <TextAreaRow
        id="motivo"
        name="motivo"
        label="Motivo (opcional)"
        placeholder="Contanos brevemente por qué querés acceder"
        error={state.fieldErrors?.['motivo']}
      />

      <SubmitButton />
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
        'inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-lg bg-btn-primary px-6 text-sm font-bold uppercase tracking-wider text-white shadow-card transition ' +
        'hover:shadow-cardHover hover:-translate-y-0.5 ' +
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30 ' +
        'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0'
      }
    >
      {pending ? 'Enviando…' : 'Enviar solicitud'}
    </button>
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

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string | undefined
}

function TextAreaRow({ id, label, error, ...inputProps }: TextAreaProps) {
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
          'rounded-xl bg-white px-3 py-2.5 ring-1 transition focus-within:ring-2 ' +
          (error
            ? 'ring-red-300 focus-within:ring-red-400'
            : 'ring-brand-deep/15 focus-within:ring-brand-blue')
        }
      >
        <textarea
          id={id}
          rows={3}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className="w-full resize-none bg-transparent text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none"
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

function DocumentIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-6 w-6"
    >
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h6" strokeLinecap="round" />
    </svg>
  )
}
