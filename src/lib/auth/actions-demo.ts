'use server'

// Server actions para modo demo. NO se usan en flujos reales de producción.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAfiliado, homeForRol, type Rol } from './role'

const ROLES_VALIDOS: Rol[] = ['afiliado', 'delegado', 'admin']

// Cambia el rol del usuario actual. Requiere que el afiliado tenga
// permite_role_switch = true. Pensado solo para presentaciones / demos.
export async function cambiarRolDemo(formData: FormData): Promise<void> {
  const session = await getCurrentAfiliado()
  if (!session) {
    redirect('/')
  }
  if (!session.permiteRoleSwitch) {
    // No bombardeo al usuario — simplemente redirijo a su home.
    redirect(homeForRol(session.rol))
  }

  const rolNuevo = formData.get('rol')?.toString() ?? ''
  if (!ROLES_VALIDOS.includes(rolNuevo as Rol)) {
    redirect(homeForRol(session.rol))
  }
  if (rolNuevo === session.rol) {
    redirect(homeForRol(session.rol))
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('afiliados')
    .update({ rol: rolNuevo as Rol })
    .eq('id', session.afiliadoId)
  if (error) {
    // Best-effort. Volvemos a la misma pantalla.
    redirect(homeForRol(session.rol))
  }

  // Audit
  await admin.from('audit_log').insert({
    evento: 'role_switch_demo',
    afiliado_id: session.afiliadoId,
    metadata: { de: session.rol, a: rolNuevo },
  })

  // Revalidamos paths que dependen del rol y vamos a la home del rol nuevo
  revalidatePath('/feed')
  revalidatePath('/admin')
  revalidatePath('/delegados')
  revalidatePath('/perfil')

  redirect(homeForRol(rolNuevo as Rol))
}
