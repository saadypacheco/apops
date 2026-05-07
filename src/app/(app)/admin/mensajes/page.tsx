import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { MarcarLeidoButton } from '@/components/admin/MarcarLeidoButton'

export const metadata: Metadata = {
  title: 'Mensajes de delegados',
}

type MensajeRow = {
  id: string
  delegado_id: string
  asunto: string
  mensaje: string
  leido: boolean
  leido_at: string | null
  created_at: string
}

type DelegadoRow = {
  id: string
  nombre: string
  dni: string
  legajo: string | null
  email: string
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function MensajesAdminPage() {
  const session = await requireRole('admin')

  const admin = createAdminClient()

  // Mensajes (no leídos primero, después leídos por fecha)
  const { data: mensajes } = await admin
    .from('mensajes_delegado')
    .select('id, delegado_id, asunto, mensaje, leido, leido_at, created_at')
    .order('leido', { ascending: true })
    .order('created_at', { ascending: false })

  const filas = (mensajes ?? []) as MensajeRow[]
  const noLeidos = filas.filter((m) => !m.leido).length

  // Batch de afiliados (delegados emisores) — una sola query
  const delegadoIds = Array.from(new Set(filas.map((m) => m.delegado_id)))
  const { data: delegados } =
    delegadoIds.length > 0
      ? await admin
          .from('afiliados')
          .select('id, nombre, dni, legajo, email')
          .in('id', delegadoIds)
      : { data: [] as DelegadoRow[] }
  const delegadoById = new Map(
    ((delegados ?? []) as DelegadoRow[]).map((d) => [d.id, d]),
  )

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-brand-ink">
                Mensajes de delegados
              </h1>
              <p className="mt-1 text-sm text-brand-muted">
                {filas.length === 0
                  ? 'Todavía no hay mensajes.'
                  : noLeidos > 0
                    ? `${noLeidos} mensaje${noLeidos > 1 ? 's' : ''} sin leer.`
                    : 'Todos los mensajes están leídos.'}
              </p>
            </div>
            <Link
              href="/admin"
              className="text-sm font-medium text-brand-blue hover:underline"
            >
              ← Volver al panel
            </Link>
          </div>
          <p className="text-xs text-brand-muted">
            Las respuestas se contestan por fuera de la app (WhatsApp / email
            del delegado).
          </p>
        </header>

        {filas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
            No hay mensajes pendientes.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filas.map((m) => {
              const d = delegadoById.get(m.delegado_id)
              return (
                <li
                  key={m.id}
                  className={
                    'flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card ' +
                    (m.leido ? 'opacity-70' : 'ring-2 ring-amber-200')
                  }
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-brand-ink">
                        {m.asunto}
                      </h3>
                      <p className="mt-0.5 text-sm text-brand-muted">
                        De{' '}
                        <span className="font-medium text-brand-ink">
                          {d?.nombre ?? 'Delegado desconocido'}
                        </span>
                        {d?.legajo && ` · L-${d.legajo.replace(/^L-?/, '')}`}
                        {d?.dni && ` · DNI ${d.dni}`}
                      </p>
                      <p className="text-xs text-brand-muted">
                        Enviado {formatDateTime(m.created_at)}
                      </p>
                    </div>
                    {!m.leido && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                        Nuevo
                      </span>
                    )}
                    {m.leido && m.leido_at && (
                      <span
                        className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800"
                        title={`Leído ${formatDateTime(m.leido_at)}`}
                      >
                        ✓ Leído
                      </span>
                    )}
                  </header>

                  <div className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-sm text-brand-ink">
                    {m.mensaje}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {d?.email && (
                      <a
                        href={`mailto:${d.email}?subject=${encodeURIComponent(`Re: ${m.asunto}`)}`}
                        className="text-sm font-semibold text-brand-blue hover:underline"
                      >
                        Responder por email →
                      </a>
                    )}
                    {!m.leido && <MarcarLeidoButton mensajeId={m.id} />}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
