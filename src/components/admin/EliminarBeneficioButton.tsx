'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { eliminarBeneficio } from '@/lib/admin/actions-beneficios'

const initial: { error?: string; success?: string } = {}

// Borrado con confirmación en dos pasos. Es destructivo y no hay papelera,
// así que pedimos confirmación explícita antes de mandar el submit.
export function EliminarBeneficioButton({
  beneficioId,
  titulo,
}: {
  beneficioId: string
  titulo: string
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [state, action] = useFormState(eliminarBeneficio, initial)

  if (!confirmando) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="self-start text-sm font-medium text-red-600 hover:underline"
        >
          Eliminar beneficio
        </button>
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-200"
    >
      <input type="hidden" name="id" value={beneficioId} />
      <p className="text-sm text-red-900">
        ¿Seguro que querés eliminar <strong>{titulo}</strong>? No se puede
        deshacer. Si solo querés ocultarlo, despublicalo en vez de borrarlo.
      </p>
      <div className="flex items-center gap-3">
        <SubmitBtn />
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="text-sm text-brand-muted hover:underline"
        >
          Cancelar
        </button>
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
      className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? 'Eliminando…' : 'Sí, eliminar'}
    </button>
  )
}
