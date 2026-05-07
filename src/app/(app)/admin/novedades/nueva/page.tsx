import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { NoticiaForm } from '@/components/admin/NoticiaForm'

export const metadata: Metadata = {
  title: 'Nueva noticia',
}

export default async function NuevaNoticiaPage() {
  const session = await requireRole('admin')

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/novedades"
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          ← Volver a novedades
        </Link>

        <NoticiaForm defaultAutor={session.nombre} />
      </div>
    </AppShell>
  )
}
