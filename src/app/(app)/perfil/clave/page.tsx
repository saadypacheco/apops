import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { CambiarClaveForm } from '@/components/auth/CambiarClaveForm'

export const metadata: Metadata = {
  title: 'Cambiar mi clave',
}

export default async function CambiarClavePage() {
  const session = await requireRole('afiliado')

  const admin = createAdminClient()
  const { data } = await admin
    .from('afiliados')
    .select('tiene_password')
    .eq('id', session.afiliadoId)
    .maybeSingle()
  const yaTieneClave = data?.tiene_password ?? false

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="perfil">
      <div className="flex flex-col gap-4">
        <Link
          href="/perfil"
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          ← Volver a mi perfil
        </Link>

        <CambiarClaveForm yaTieneClave={yaTieneClave} />
      </div>
    </AppShell>
  )
}
