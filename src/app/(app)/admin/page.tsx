import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { PendienteActions } from '@/components/admin/PendienteActions'

export const metadata: Metadata = {
  title: 'Panel admin',
}

const motivoLabel: Record<string, string> = {
  dni_no_en_padron: 'DNI no en padrón',
  sin_flag_apops_y_sin_papel: 'En padrón sin afiliación APOPS',
  otros: 'Otros',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminPage() {
  const session = await requireRole('admin')

  const admin = createAdminClient()
  const { data: pendientes } = await admin
    .from('solicitudes_pendientes')
    .select(
      'id, dni, email, sub_flujo, legajo, nombre_completo, motivo_pendiente, created_at',
    )
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true })

  const count = pendientes?.length ?? 0

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-6">
        <section className="rounded-xl bg-white p-4 shadow-card">
          <h2 className="text-lg font-semibold text-brand-ink">
            Solicitudes pendientes
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            {count === 0
              ? 'No hay solicitudes esperando revisión.'
              : `${count} ${count === 1 ? 'solicitud' : 'solicitudes'} esperando tu decisión.`}
          </p>
        </section>

        {count === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
            Todo al día. 🎉
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendientes!.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wide text-brand-muted">
                      {s.sub_flujo === 'activo' ? 'Activo' : 'Sin legajo'}
                    </span>
                    <h3 className="text-base font-semibold text-brand-ink">
                      {s.nombre_completo ?? `DNI ${s.dni}`}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                    {motivoLabel[s.motivo_pendiente] ?? s.motivo_pendiente}
                  </span>
                </header>

                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-brand-muted">DNI</dt>
                    <dd className="text-brand-ink">{s.dni}</dd>
                  </div>
                  {s.legajo && (
                    <div>
                      <dt className="text-xs text-brand-muted">Legajo</dt>
                      <dd className="text-brand-ink">{s.legajo}</dd>
                    </div>
                  )}
                  <div className="col-span-2">
                    <dt className="text-xs text-brand-muted">Email</dt>
                    <dd className="break-all text-brand-ink">{s.email}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-brand-muted">Recibida</dt>
                    <dd className="text-brand-ink">
                      {formatDateTime(s.created_at)}
                    </dd>
                  </div>
                </dl>

                <PendienteActions solicitudId={s.id} dni={s.dni} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
