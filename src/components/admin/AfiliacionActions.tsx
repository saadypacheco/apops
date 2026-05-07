'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import {
  aprobarAfiliacion,
  rechazarAfiliacion,
} from '@/lib/auth/actions-admin'
import { Button } from '@/components/ui/Button'

// Acciones del admin sobre una solicitud de afiliación online (tabla
// solicitudes_afiliacion). Espejo de PendienteActions pero apunta a las
// server actions específicas de afiliación.

type Props = {
  solicitudId: string
  apellidoNombre: string
}

const initial: { error?: string; success?: string } = {}

export function AfiliacionActions({ solicitudId, apellidoNombre }: Props) {
  const [showRechazar, setShowRechazar] = useState(false)
  const [aproState, aproAction] = useFormState(aprobarAfiliacion, initial)
  const [rechState, rechAction] = useFormState(rechazarAfiliacion, initial)

  if (aproState.success) {
    return (
      <p role="status" className="text-sm font-medium text-emerald-700">
        ✓ {aproState.success}
      </p>
    )
  }
  if (rechState.success) {
    return (
      <p role="status" className="text-sm font-medium text-red-700">
        ✓ {rechState.success}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {(aproState.error || rechState.error) && (
        <p role="alert" className="text-sm text-red-700">
          {aproState.error ?? rechState.error}
        </p>
      )}

      {!showRechazar ? (
        <div className="flex flex-wrap gap-2">
          <form action={aproAction}>
            <input type="hidden" name="solicitud_id" value={solicitudId} />
            <ApproveBtn />
          </form>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowRechazar(true)}
          >
            Rechazar
          </Button>
        </div>
      ) : (
        <form action={rechAction} className="flex flex-col gap-2">
          <input type="hidden" name="solicitud_id" value={solicitudId} />
          <label
            htmlFor={`motivo-${solicitudId}`}
            className="text-sm font-medium text-brand-ink"
          >
            Motivo del rechazo (lo verá {apellidoNombre}):
          </label>
          <textarea
            id={`motivo-${solicitudId}`}
            name="motivo_rechazo"
            required
            minLength={5}
            rows={2}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
            placeholder="Ej: Datos no coinciden con el padrón."
          />
          <div className="flex gap-2">
            <RejectBtn />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowRechazar(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function ApproveBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Aprobando…' : 'Aprobar'}
    </Button>
  )
}

function RejectBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
      {pending ? 'Procesando…' : 'Confirmar rechazo'}
    </Button>
  )
}
