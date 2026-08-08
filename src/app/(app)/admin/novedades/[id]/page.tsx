import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { NoticiaForm } from '@/components/admin/NoticiaForm'
import { EliminarNoticiaButton } from '@/components/admin/EliminarNoticiaButton'

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
    .select(
      'id, titulo, resumen, contenido, autor, destacada, publicada, audiencia, tema',
    )
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
      audiencia: string
      tema: string
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

        {/* Zona "peligrosa" — eliminar definitivamente */}
        <section className="mt-4 flex flex-col gap-3 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/30 p-5">
          <header>
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-700">
              Zona de riesgo
            </h3>
            <p className="mt-1 text-xs text-brand-muted">
              Si esta noticia ya no aplica, podés despublicarla (queda como
              borrador) o eliminarla definitivamente. Eliminar no se puede
              deshacer.
            </p>
          </header>
          <EliminarNoticiaButton
            noticiaId={noticia.id}
            titulo={noticia.titulo}
          />
        </section>
      </div>
    </AppShell>
  )
}
