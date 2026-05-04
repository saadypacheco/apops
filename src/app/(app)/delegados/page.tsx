import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'

export const metadata: Metadata = {
  title: 'Panel delegados',
}

export default async function DelegadosPage() {
  const session = await requireRole('delegado')

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="delegados">
      <div className="flex flex-col gap-6">
        <section className="rounded-xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-brand-ink">
            Panel de delegados
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            Estamos preparando las herramientas exclusivas para delegados:
            seguimiento de cotizantes en tu lugar de trabajo, comunicación con
            la Comisión Directiva, registro de novedades y más.
          </p>
          <p className="mt-3 text-sm text-brand-muted">
            Mientras tanto, tenés acceso a las novedades del gremio y tu
            perfil.
          </p>
        </section>

        <section className="rounded-xl border border-dashed border-neutral-300 bg-white/50 p-6 text-center text-sm text-brand-muted">
          Próximamente: lista de cotizantes de tu sector, mensajes internos,
          y panel de seguimiento de afiliaciones.
        </section>
      </div>
    </AppShell>
  )
}
