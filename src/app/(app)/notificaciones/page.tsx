import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole, type Rol } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { getHilosDelUsuario } from '@/lib/notificaciones/queries'

export const metadata: Metadata = {
  title: 'Notificaciones',
}

const ROL_BADGE: Record<Rol, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-800' },
  delegado: { label: 'Delegado', className: 'bg-amber-100 text-amber-800' },
  afiliado: { label: 'Afiliado', className: 'bg-cyan-100 text-cyan-800' },
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD} d`
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function initials(nombre: string): string {
  const parts = nombre.split(',')
  if (parts.length === 2) {
    const ape = parts[0]?.trim()[0] ?? ''
    const nom = parts[1]?.trim()[0] ?? ''
    return (nom + ape).toUpperCase() || '··'
  }
  const tokens = nombre.split(/\s+/)
  return ((tokens[0]?.[0] ?? '') + (tokens[1]?.[0] ?? '')).toUpperCase() || '··'
}

type Tab = 'todos' | 'sin-leer'

export default async function NotificacionesInboxPage({
  searchParams,
}: {
  searchParams?: { tab?: string }
}) {
  const session = await requireRole('afiliado')
  const tab: Tab = searchParams?.tab === 'sin-leer' ? 'sin-leer' : 'todos'

  const hilos = await getHilosDelUsuario(session.afiliadoId)
  const hilosFiltrados =
    tab === 'sin-leer' ? hilos.filter((h) => !h.leidoPorMi) : hilos

  const sinLeerCount = hilos.filter((h) => !h.leidoPorMi).length

  return (
    <AppShell
      nombre={session.nombre}
      rol={session.rol}
      current="notificaciones"
    >
      <div className="flex flex-col gap-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-ink">
              Notificaciones
            </h1>
            <p className="mt-1 text-sm text-brand-muted">
              {hilos.length === 0
                ? 'No tenés conversaciones todavía.'
                : `${hilos.length} conversación${hilos.length === 1 ? '' : 'es'}${
                    sinLeerCount > 0 ? ` · ${sinLeerCount} sin leer` : ''
                  }`}
            </p>
          </div>
          <Link
            href="/notificaciones/nueva"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-btn-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover"
          >
            + Nueva
          </Link>
        </header>

        {/* Tabs */}
        <div className="flex gap-2">
          <Link
            href="/notificaciones?tab=todos"
            className={
              'rounded-full px-3 py-1 text-xs font-semibold transition ' +
              (tab === 'todos'
                ? 'bg-brand-blue text-white shadow-card'
                : 'bg-neutral-100 text-brand-muted hover:bg-neutral-200')
            }
          >
            Todas ({hilos.length})
          </Link>
          <Link
            href="/notificaciones?tab=sin-leer"
            className={
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ' +
              (tab === 'sin-leer'
                ? 'bg-brand-blue text-white shadow-card'
                : 'bg-neutral-100 text-brand-muted hover:bg-neutral-200')
            }
          >
            Sin leer
            {sinLeerCount > 0 && (
              <span
                className={
                  'rounded-full px-1.5 py-0 text-[10px] font-bold ' +
                  (tab === 'sin-leer'
                    ? 'bg-white text-brand-blue'
                    : 'bg-amber-100 text-amber-900')
                }
              >
                {sinLeerCount}
              </span>
            )}
          </Link>
        </div>

        {/* Listado */}
        {hilosFiltrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
            {tab === 'sin-leer'
              ? '🎉 No tenés notificaciones sin leer.'
              : 'Empezá una conversación con el botón "+ Nueva".'}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {hilosFiltrados.map((h) => {
              const rolBadge = ROL_BADGE[h.contraparteRol]
              return (
                <li key={h.id}>
                  <Link
                    href={`/notificaciones/${h.id}`}
                    className={
                      'flex items-start gap-3 rounded-xl bg-white p-3 shadow-card transition hover:shadow-cardHover ' +
                      (!h.leidoPorMi ? 'ring-2 ring-brand-blue/30' : '')
                    }
                  >
                    {/* Avatar */}
                    <div
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-sm font-bold text-brand-blue"
                    >
                      {initials(h.contraparteNombre)}
                    </div>

                    {/* Cuerpo */}
                    <div className="min-w-0 flex-1">
                      <header className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            aria-label={
                              h.yoSoyAutor ? 'Enviado por mí' : 'Recibido'
                            }
                            title={h.yoSoyAutor ? 'Enviado' : 'Recibido'}
                            className="text-[10px] text-brand-muted"
                          >
                            {h.yoSoyAutor ? '↑' : '↓'}
                          </span>
                          <span className="truncate text-sm font-semibold text-brand-ink">
                            {h.contraparteNombre}
                          </span>
                          <span
                            className={
                              'shrink-0 rounded-full px-1.5 py-0 text-[9px] font-bold ' +
                              rolBadge.className
                            }
                          >
                            {rolBadge.label}
                          </span>
                        </div>
                        <span className="shrink-0 text-[11px] text-brand-muted">
                          {formatRelative(h.ultimoMensajeAt)}
                        </span>
                      </header>

                      <p
                        className={
                          'mt-0.5 truncate text-sm ' +
                          (!h.leidoPorMi
                            ? 'font-semibold text-brand-ink'
                            : 'text-brand-muted')
                        }
                      >
                        <span className="text-brand-deep">{h.asunto}</span>
                        {h.ultimoMensajePreview && (
                          <>
                            {' · '}
                            <span className="text-brand-muted">
                              {h.ultimoMensajePreview}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Indicador no-leído */}
                    {!h.leidoPorMi && (
                      <span
                        aria-label="No leída"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-blue"
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
