// Server component async: muestra la campana del header con el contador
// real de notificaciones no leídas. Si no hay sesión, no renderiza.

import Link from 'next/link'
import { getCurrentAfiliado } from '@/lib/auth/role'
import { contarNoLeidos } from '@/lib/notificaciones/queries'

export async function CampanaSlot() {
  const session = await getCurrentAfiliado()
  if (!session) return null

  const count = await contarNoLeidos(session.afiliadoId)

  return (
    <Link
      href="/notificaciones"
      aria-label={
        count > 0
          ? `${count} notificacion${count === 1 ? '' : 'es'} sin leer`
          : 'Notificaciones'
      }
      title={count > 0 ? `${count} sin leer` : 'Notificaciones'}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="h-5 w-5"
        aria-hidden
      >
        <path
          d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 17a3 3 0 006 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-brand-blue"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
