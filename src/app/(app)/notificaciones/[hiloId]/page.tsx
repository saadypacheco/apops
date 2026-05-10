import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole, type Rol } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { ResponderHiloForm } from '@/components/notificaciones/ResponderHiloForm'
import { getHiloConMensajes } from '@/lib/notificaciones/queries'
import { marcarHiloLeido } from '@/lib/notificaciones/actions'

export const metadata: Metadata = {
  title: 'Conversación',
}

const ROL_BADGE: Record<Rol, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-800' },
  delegado: { label: 'Delegado', className: 'bg-amber-100 text-amber-800' },
  afiliado: { label: 'Afiliado', className: 'bg-cyan-100 text-cyan-800' },
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  const horaMin = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  if (sameDay) return `Hoy ${horaMin}`
  return `${d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })} · ${horaMin}`
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

export default async function HiloPage({
  params,
}: {
  params: { hiloId: string }
}) {
  const session = await requireRole('afiliado')

  const data = await getHiloConMensajes(params.hiloId, session.afiliadoId)
  if (!data) notFound()

  // Marcar leído al entrar (idempotente). Se ejecuta server-side antes del render.
  await marcarHiloLeido(params.hiloId)

  const { hilo, mensajes } = data
  const rolBadge = ROL_BADGE[hilo.contraparteRol]

  return (
    <AppShell
      nombre={session.nombre}
      rol={session.rol}
      current="notificaciones"
    >
      <div className="flex flex-col gap-4">
        <Link
          href="/notificaciones"
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          ← Volver al inbox
        </Link>

        {/* Header del hilo */}
        <header className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-card">
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-base font-bold text-brand-blue"
          >
            {initials(hilo.contraparteNombre)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold text-brand-ink">
                {hilo.contraparteNombre}
              </h1>
              <span
                className={
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                  rolBadge.className
                }
              >
                {rolBadge.label}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-brand-muted">{hilo.asunto}</p>
          </div>
        </header>

        {/* Mensajes */}
        <ul className="flex flex-col gap-2.5">
          {mensajes.map((m) => {
            const mio = m.autorEsYo
            return (
              <li
                key={m.id}
                className={'flex ' + (mio ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={
                    'flex max-w-[85%] flex-col gap-1 rounded-2xl px-3 py-2 text-sm shadow-card ' +
                    (mio
                      ? 'bg-brand-blue text-white'
                      : 'bg-white text-brand-ink ring-1 ring-neutral-100')
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {m.mensaje}
                  </p>
                  <span
                    className={
                      'text-right text-[10px] ' +
                      (mio ? 'text-white/70' : 'text-brand-muted')
                    }
                  >
                    {formatDateTime(m.createdAt)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Form respuesta */}
        <ResponderHiloForm hiloId={hilo.id} />
      </div>
    </AppShell>
  )
}
