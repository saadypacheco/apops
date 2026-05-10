import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { NuevaNotificacionForm } from '@/components/notificaciones/NuevaNotificacionForm'
import { getDestinatariosDisponibles } from '@/lib/notificaciones/queries'

export const metadata: Metadata = {
  title: 'Nueva notificación',
}

export default async function NuevaNotificacionPage() {
  const session = await requireRole('afiliado') // mínimo afiliado — todos los roles pueden mandar
  const destinatarios = await getDestinatariosDisponibles(session)

  return (
    <AppShell
      nombre={session.nombre}
      rol={session.rol}
      current="notificaciones"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/notificaciones"
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            ← Volver al inbox
          </Link>
          <span className="text-xs text-brand-muted">
            {destinatarios.length} contacto{destinatarios.length === 1 ? '' : 's'} disponible
            {destinatarios.length === 1 ? '' : 's'}
          </span>
        </div>

        <header>
          <h1 className="text-2xl font-bold text-brand-ink">Nueva notificación</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Buscá y seleccioná uno o más contactos. La notificación se envía
            como hilo privado con cada destinatario.
          </p>
        </header>

        {destinatarios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
            No tenés contactos disponibles para enviar notificaciones.
          </div>
        ) : (
          <NuevaNotificacionForm
            destinatarios={destinatarios}
            miRol={session.rol}
          />
        )}
      </div>
    </AppShell>
  )
}
