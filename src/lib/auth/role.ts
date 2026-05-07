// Este módulo solo debe importarse desde Server Components / Server Actions
// porque usa createAdminClient (service_role). Si Next.js permitiera importarlo
// en un Client Component, las claves no se filtran (son server-side env vars
// sin NEXT_PUBLIC_) pero el import falla en runtime — preferimos prevenirlo a
// nivel de convención y a través de createAdminClient que lanza error si las
// vars no están.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type Rol = 'afiliado' | 'delegado' | 'admin'

// Home según rol — usado tanto por el redirect post-login como por la
// landing cuando detecta sesión activa al entrar.
export function homeForRol(rol: string | Rol): string {
  if (rol === 'admin') return '/admin'
  if (rol === 'delegado') return '/delegados'
  return '/feed'
}

export interface AfiliadoSession {
  authUserId: string
  email: string | null
  afiliadoId: string
  dni: string
  legajo: string | null
  nombre: string
  tipo: 'activo' | 'jubilado'
  rol: Rol
}

// Resuelve la sesión + datos del afiliado vinculado.
// Devuelve null si no hay sesión o el afiliado no existe.
export async function getCurrentAfiliado(): Promise<AfiliadoSession | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('afiliados')
    .select('id, dni, legajo, nombre, tipo, rol')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!data) return null

  return {
    authUserId: user.id,
    email: user.email ?? null,
    afiliadoId: data.id,
    dni: data.dni,
    legajo: data.legajo,
    nombre: data.nombre,
    tipo: data.tipo as 'activo' | 'jubilado',
    rol: (data.rol as Rol) ?? 'afiliado',
  }
}

// Helper para páginas que requieren un rol mínimo. Si no cumple, redirige
// a la home del rol que sí tenga (o al landing si no hay sesión).
export async function requireRole(min: Rol): Promise<AfiliadoSession> {
  const session = await getCurrentAfiliado()
  if (!session) redirect('/')

  const rank: Record<Rol, number> = { afiliado: 0, delegado: 1, admin: 2 }
  if (rank[session.rol] < rank[min]) {
    // No tiene permiso. Redirige a la home de su rol real.
    if (session.rol === 'delegado') redirect('/delegados')
    redirect('/feed')
  }

  return session
}
