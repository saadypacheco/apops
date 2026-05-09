import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'

export const metadata: Metadata = {
  title: 'Notificaciones',
}

// Placeholder de la tanda 2. La tanda 3 reemplaza esto por el inbox real
// con listado de hilos (con preview, no leídos, etc.).
export default async function NotificacionesPage() {
  const session = await requireRole('afiliado')

  return (
    <AppShell
      nombre={session.nombre}
      rol={session.rol}
      current={
        session.rol === 'admin'
          ? 'admin'
          : session.rol === 'delegado'
            ? 'delegados'
            : 'home'
      }
    >
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold text-brand-ink">Notificaciones</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Inbox de hilos enviados y recibidos.
          </p>
        </header>

        <Link
          href="/notificaciones/nueva"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-btn-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover"
        >
          + Nueva notificación
        </Link>

        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
          El inbox completo (hilos recibidos / enviados con preview) viene
          en la próxima iteración.
        </div>
      </div>
    </AppShell>
  )
}
