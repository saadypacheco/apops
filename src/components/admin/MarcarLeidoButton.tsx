'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { marcarLeido } from '@/lib/mensajes/actions'
import { Button } from '@/components/ui/Button'

const initial: { error?: string; success?: string } = {}

// Botón "Marcar como leído" para un mensaje pendiente. Tras éxito, la
// página se revalida y la card se re-renderiza con el badge "Leído".

export function MarcarLeidoButton({ mensajeId }: { mensajeId: string }) {
  const [state, action] = useFormState(marcarLeido, initial)

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="mensaje_id" value={mensajeId} />
      <SubmitBtn />
      {state.error && (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  )
}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Marcando…' : 'Marcar como leído'}
    </Button>
  )
}
