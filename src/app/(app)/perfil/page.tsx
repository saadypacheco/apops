import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LogoutButton } from '@/components/auth/LogoutButton'

export const metadata: Metadata = {
  title: 'Mi perfil',
  description: 'Información de tu cuenta y sesión.',
}

// FR-014: el botón de logout es accesible en máximo 2 taps desde cualquier
// pantalla autenticada. Al tocarlo, el componente pide confirmación.
//
// Esta página lee la fila del afiliado con service_role para mostrar nombre,
// DNI y tipo. RLS de la tabla afiliados también permitiría que el propio user
// la lea (afiliados_self_select), pero usar service_role acá es más simple y
// consistente con el resto de operaciones server-side.

function maskEmail(email: string | undefined | null): string {
  if (!email) return ''
  const at = email.indexOf('@')
  if (at <= 0) return email
  const name = email.slice(0, at)
  const domain = email.slice(at + 1)
  const head = name.slice(0, 1)
  const masked = '*'.repeat(Math.max(name.length - 1, 1))
  return `${head}${masked}@${domain}`
}

export default async function PerfilPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: afiliado } = await admin
    .from('afiliados')
    .select('dni, legajo, nombre, tipo, last_login_at')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 pt-6">
        <h1 className="text-2xl font-semibold text-[#042C53]">Mi perfil</h1>
      </header>

      <section className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-white p-4">
        <dl className="flex flex-col gap-2 text-base">
          {afiliado?.nombre && (
            <div className="flex flex-col">
              <dt className="text-sm text-[#5F5E5A]">Nombre</dt>
              <dd className="text-[#042C53]">{afiliado.nombre}</dd>
            </div>
          )}
          {afiliado?.dni && (
            <div className="flex flex-col">
              <dt className="text-sm text-[#5F5E5A]">DNI</dt>
              <dd className="text-[#042C53]">{afiliado.dni}</dd>
            </div>
          )}
          {afiliado?.legajo && (
            <div className="flex flex-col">
              <dt className="text-sm text-[#5F5E5A]">Legajo</dt>
              <dd className="text-[#042C53]">{afiliado.legajo}</dd>
            </div>
          )}
          {afiliado?.tipo && (
            <div className="flex flex-col">
              <dt className="text-sm text-[#5F5E5A]">Tipo</dt>
              <dd className="text-[#042C53] capitalize">{afiliado.tipo}</dd>
            </div>
          )}
          <div className="flex flex-col">
            <dt className="text-sm text-[#5F5E5A]">Email</dt>
            <dd className="text-[#042C53]">{maskEmail(user.email)}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-2 pt-4">
        <LogoutButton />
      </section>
    </main>
  )
}
