'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { eliminarNoticia } from '@/lib/admin/actions-noticias'
import { Button } from '@/components/ui/Button'

const initial: { error?: string; success?: string } = {}

// Botón de eliminar con confirmación inline. Primer click muestra
// "¿Eliminar definitivamente?". Segundo click confirma. Cancelar vuelve
// al estado inicial. DELETE real, no soft-delete.

export function EliminarNoticiaButton({
  noticiaId,
  titulo,
}: {
  noticiaId: string
  titulo: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [state, action] = useFormState(eliminarNoticia, initial)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg border-2 border-red-300 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
      >
        Eliminar noticia
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
      <p className="text-sm text-red-900">
        ¿Eliminar definitivamente <strong>{titulo}</strong>? Esta acción no
        se puede deshacer.
      </p>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <form action={action}>
          <input type="hidden" name="id" value={noticiaId} />
          <ConfirmBtn />
        </form>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirming(false)}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}

function ConfirmBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-70"
    >
      {pending ? 'Eliminando…' : 'Sí, eliminar'}
    </button>
  )
}
