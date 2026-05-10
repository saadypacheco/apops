// Server component async: badge para el item "Notificaciones" del bottom
// nav. Renderiza un círculo rojo con el conteo de no leídas si > 0.

import { getCurrentAfiliado } from '@/lib/auth/role'
import { contarNoLeidos } from '@/lib/notificaciones/queries'

export async function NavBadgeNotif() {
  const session = await getCurrentAfiliado()
  if (!session) return null
  const count = await contarNoLeidos(session.afiliadoId)
  if (count === 0) return null
  return (
    <span
      aria-hidden
      className="absolute -right-1 -top-0.5 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
