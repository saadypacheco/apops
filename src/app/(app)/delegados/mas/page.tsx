import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { MensajeForm } from '@/components/delegados/MensajeForm'
import { getHilosDelUsuario } from '@/lib/notificaciones/queries'
import { getComunicadosParaDelegado } from '@/lib/delegados/panel-queries'

export const metadata: Metadata = {
  title: 'Más',
}

type MensajeEnviado = {
  id: string
  asunto: string
  leido: boolean
  leido_at: string | null
  created_at: string
}

function formatRelative(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function MasDelegadoPage() {
  const session = await requireRole('delegado')
  const admin = createAdminClient()

  const [hilos, comunicados, { data: misMensajes }] = await Promise.all([
    getHilosDelUsuario(session.afiliadoId),
    getComunicadosParaDelegado(),
    admin
      .from('mensajes_delegado')
      .select('id, asunto, leido, leido_at, created_at')
      .eq('delegado_id', session.afiliadoId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const pendientes = hilos.filter((h) => !h.leidoPorMi)
  const alertas = comunicados
    .filter((c) => c.audiencia === 'delegados')
    .slice(0, 3)

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="mas">
      <div className="flex flex-col gap-6 pb-4">
        <header>
          <h1 className="text-2xl font-semibold text-brand-ink">Más</h1>
          <p className="text-sm text-brand-muted">
            Consultas, alertas del sindicato y tu cuenta.
          </p>
        </header>

        {/* Alertas del sindicato */}
        {alertas.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Alertas del sindicato
            </h2>
            <ul className="flex flex-col gap-2">
              {alertas.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/noticias/${a.id}`}
                    className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 shadow-card ring-1 ring-amber-200 transition hover:shadow-cardHover"
                  >
                    <span aria-hidden className="text-lg">⚠️</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-amber-900">
                        {a.titulo}
                      </p>
                      <p className="line-clamp-1 text-xs text-amber-800">
                        {a.resumen}
                      </p>
                    </div>
                    <span aria-hidden className="text-amber-700">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Consultas recibidas */}
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Consultas recibidas
            </h2>
            <Link
              href="/notificaciones"
              className="text-xs font-semibold text-brand-blue hover:underline"
            >
              Ver todas →
            </Link>
          </div>

          {pendientes.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-center text-sm text-brand-muted shadow-card">
              No tenés consultas pendientes.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendientes.slice(0, 5).map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/notificaciones/${h.id}`}
                    className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-card transition hover:shadow-cardHover"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-blue"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-ink">
                        {h.asunto}
                      </p>
                      <p className="truncate text-xs text-brand-muted">
                        {h.contraparteNombre} ·{' '}
                        {formatRelative(h.ultimoMensajeAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Mensajes a la Comisión Directiva */}
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Mensajes a la CD
          </h2>

          <MensajeForm />

          {(misMensajes as MensajeEnviado[] | null)?.length ? (
            <ul className="flex flex-col gap-2">
              {(misMensajes as MensajeEnviado[]).map((m) => (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-white p-3 shadow-card"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-ink">
                      {m.asunto}
                    </p>
                    <p className="text-xs text-brand-muted">
                      Enviado {formatRelative(m.created_at)}
                    </p>
                  </div>
                  {m.leido ? (
                    <span
                      className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800"
                      title={
                        m.leido_at ? `Leído ${formatRelative(m.leido_at)}` : 'Leído'
                      }
                    >
                      ✓ Leído
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                      Pendiente
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* Cuenta */}
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Mi cuenta
          </h2>
          <AccesoRapido
            href="/perfil"
            icono="👤"
            titulo="Mi perfil"
            detalle="Tus datos, grupo de WhatsApp del edificio y clave"
          />
          <AccesoRapido
            href="/novedades"
            icono="📰"
            titulo="Novedades"
            detalle="Las noticias que ven todos los afiliados"
          />
        </section>
      </div>
    </AppShell>
  )
}

function AccesoRapido({
  href,
  icono,
  titulo,
  detalle,
}: {
  href: string
  icono: string
  titulo: string
  detalle: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xl"
      >
        {icono}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-ink">{titulo}</p>
        <p className="text-xs text-brand-muted">{detalle}</p>
      </div>
      <span aria-hidden className="text-brand-blue">→</span>
    </Link>
  )
}
