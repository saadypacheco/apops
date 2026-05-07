'use client'

import { useFormState, useFormStatus } from 'react-dom'
import {
  togglePublicada,
  toggleDestacada,
} from '@/lib/admin/actions-noticias'

type Props = {
  noticiaId: string
  publicada: boolean
  destacada: boolean
}

const initial: { error?: string; success?: string } = {}

// Botones rápidos para alternar publicada / destacada desde el listado de
// /admin/novedades, sin tener que abrir el form de edición.
export function NoticiaToggleActions({
  noticiaId,
  publicada,
  destacada,
}: Props) {
  const [pubState, pubAction] = useFormState(togglePublicada, initial)
  const [destState, destAction] = useFormState(toggleDestacada, initial)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <form action={pubAction}>
          <input type="hidden" name="id" value={noticiaId} />
          <ToggleBtn
            on={publicada}
            labelOn="Publicada"
            labelOff="Borrador"
            actionOn="Despublicar"
            actionOff="Publicar"
          />
        </form>
        <form action={destAction}>
          <input type="hidden" name="id" value={noticiaId} />
          <ToggleBtn
            on={destacada}
            labelOn="⭐ Destacada"
            labelOff="No destacada"
            actionOn="Quitar destacada"
            actionOff="Destacar"
          />
        </form>
      </div>
      {(pubState.error || destState.error) && (
        <p role="alert" className="text-xs text-red-600">
          {pubState.error ?? destState.error}
        </p>
      )}
      {(pubState.success || destState.success) && (
        <p role="status" className="text-xs text-emerald-600">
          ✓ {pubState.success ?? destState.success}
        </p>
      )}
    </div>
  )
}

function ToggleBtn({
  on,
  labelOn,
  labelOff,
  actionOn,
  actionOff,
}: {
  on: boolean
  labelOn: string
  labelOff: string
  actionOn: string
  actionOff: string
}) {
  const { pending } = useFormStatus()
  // Mostrar el label del estado actual + en hover sugerir la acción.
  // Title attr para que en desktop se vea la acción al pasar el mouse.
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      title={on ? actionOn : actionOff}
      className={
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ' +
        (on
          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
          : 'bg-neutral-200 text-brand-muted hover:bg-neutral-300')
      }
    >
      {pending ? '…' : on ? labelOn : labelOff}
    </button>
  )
}
