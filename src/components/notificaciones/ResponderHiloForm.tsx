'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect, useRef } from 'react'
import { responderHilo } from '@/lib/notificaciones/actions'

const initial: { error?: string; success?: string } = {}

export function ResponderHiloForm({ hiloId }: { hiloId: string }) {
  const [state, action] = useFormState(responderHilo, initial)
  const formRef = useRef<HTMLFormElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Tras éxito, limpiamos el textarea para que el usuario pueda mandar otra
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      textareaRef.current?.focus()
    }
  }, [state.success])

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-card"
    >
      <input type="hidden" name="hilo_id" value={hiloId} />

      {state.error && (
        <p role="alert" className="text-xs text-red-700">
          {state.error}
        </p>
      )}

      <textarea
        ref={textareaRef}
        name="mensaje"
        required
        minLength={1}
        maxLength={5000}
        rows={3}
        placeholder="Escribí tu respuesta..."
        className="resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-blue"
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-brand-muted">
          La respuesta queda en este hilo, en privado.
        </p>
        <SubmitBtn />
      </div>
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
      className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg bg-btn-primary px-4 text-sm font-bold text-white shadow-card transition hover:shadow-cardHover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Enviando…' : 'Enviar →'}
    </button>
  )
}
