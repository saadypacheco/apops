import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { NoticiaForm } from '@/components/admin/NoticiaForm'

export const metadata: Metadata = {
  title: 'Editar noticia',
}

export default async function EditarNoticiaPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await requireRole('admin')

  const admin = createAdminClient()
  const { data: noticia } = (await admin
    .from('noticias')
    .select('id, titulo, resumen, contenido, autor, destacada, publicada')
    .eq('id', params.id)
    .maybeSingle()) as {
    data: {
      id: string
      titulo: string
      resumen: string
      contenido: string | null
      autor: string | null
      destacada: boolean
      publicada: boolean
    } | null
  }

  if (!noticia) notFound()

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/novedades"
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          ← Volver a novedades
        </Link>

        <NoticiaForm noticia={noticia} defaultAutor={session.nombre} />
      </div>
    </AppShell>
  )
}
