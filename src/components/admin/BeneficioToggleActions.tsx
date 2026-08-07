'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { togglePublicadoBeneficio } from '@/lib/admin/actions-beneficios'

const initial: { error?: string; success?: string } = {}

// Publicar / despublicar desde el listado de /admin/beneficios, sin abrir
// el form de edición. Mismo patrón que NoticiaToggleActions.
export function BeneficioToggleActions({
  beneficioId,
  publicado,
}: {
  beneficioId: string
  publicado: boolean
}) {
  const [state, action] = useFormState(togglePublicadoBeneficio, initial)

  return (
    <div className="flex flex-col gap-1">
      <form action={action}>
        <input type="hidden" name="id" value={beneficioId} />
        <ToggleBtn on={publicado} />
      </form>
      {state.error && (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-xs text-emerald-600">
          ✓ {state.success}
        </p>
      )}
    </div>
  )
}

function ToggleBtn({ on }: { on: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      title={on ? 'Despublicar' : 'Publicar'}
      className={
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ' +
        (on
          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
          : 'bg-neutral-200 text-brand-muted hover:bg-neutral-300')
      }
    >
      {pending ? '…' : on ? 'Publicado' : 'Oculto'}
    </button>
  )
}
