'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect, useRef } from 'react'
import { enviarMensaje } from '@/lib/mensajes/actions'
import type { MensajeFormState } from '@/types/mensajes'

const initial: MensajeFormState = {}

// Form para que el delegado le escriba a la CD. Buzón unidireccional —
// la respuesta vuelve por afuera (WhatsApp / email). Tras envío exitoso,
// limpia los campos para que el delegado pueda seguir escribiendo.

export function MensajeForm() {
  const [state, action] = useFormState(enviarMensaje, initial)
  const formRef = useRef<HTMLFormElement>(null)

  // Tras éxito, reseteamos el form para próximo mensaje.
  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <form
      ref={formRef}
      action={action}
      className="flex w-full flex-col gap-3 rounded-2xl bg-white p-4 shadow-card"
      noValidate
    >
      <header>
        <h2 className="text-base font-semibold text-brand-ink">
          Escribirle a la CD
        </h2>
        <p className="text-xs text-brand-muted">
          Tu mensaje llega al panel de la Comisión Directiva. La respuesta te
          va a llegar por fuera de la app (WhatsApp / email).
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
      {state.success && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200"
        >
          ✓ {state.success}
        </div>
      )}

      <Field
        id="asunto"
        name="asunto"
        label="Asunto"
        placeholder="Ej: Consulta sobre paritaria"
        required
        maxLength={200}
        error={state.fieldErrors?.asunto}
      />

      <Textarea
        id="mensaje"
        name="mensaje"
        label="Mensaje"
        rows={5}
        placeholder="Contanos qué pasa o qué necesitás."
        required
        maxLength={2000}
        error={state.fieldErrors?.mensaje}
      />

      <SubmitBtn />
    </form>
  )
}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={
        'inline-flex min-h-[2.75rem] items-center justify-center self-start rounded-lg bg-btn-primary px-5 text-sm font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover ' +
        'disabled:opacity-70 disabled:cursor-not-allowed'
      }
    >
      {pending ? 'Enviando…' : 'Enviar a la CD'}
    </button>
  )
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

function Field({ id, label, error, ...inputProps }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-brand-muted"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        className={
          'rounded-lg border px-3 py-2 text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 ' +
          (error
            ? 'border-red-300 focus:ring-red-300'
            : 'border-neutral-300 focus:ring-brand-blue')
        }
        {...inputProps}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
}

function Textarea({ id, label, error, ...inputProps }: TextareaProps) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-brand-muted"
      >
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        className={
          'resize-y rounded-lg border px-3 py-2 text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 ' +
          (error
            ? 'border-red-300 focus:ring-red-300'
            : 'border-neutral-300 focus:ring-brand-blue')
        }
        {...inputProps}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
