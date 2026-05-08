// Server component wrapper. Lee la sesión actual y renderiza el RoleSwitcher
// solo si el usuario tiene permite_role_switch=true. Así AppShell incluye
// este slot sin tener que recibir el flag por prop desde cada page.

import { getCurrentAfiliado } from '@/lib/auth/role'
import { RoleSwitcher } from './RoleSwitcher'

export async function RoleSwitcherSlot() {
  const session = await getCurrentAfiliado()
  if (!session?.permiteRoleSwitch) return null
  return <RoleSwitcher rolActual={session.rol} />
}
