import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Layout del grupo (app): rutas protegidas que requieren sesión.
// Defense in depth: el middleware ya redirige a /login si no hay sesión,
// pero acá lo verificamos también server-side al renderizar — si por
// cualquier razón el middleware no corrió (edge cases de matcher, hot
// reload en dev, etc.), este layout impide ver contenido autenticado.

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <>{children}</>
}
