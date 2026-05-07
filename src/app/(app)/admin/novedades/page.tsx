import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { NoticiaToggleActions } from '@/components/admin/NoticiaToggleActions'

export const metadata: Metadata = {
  title: 'Gestionar novedades',
}

type NoticiaRow = {
  id: string
  titulo: string
  resumen: string
  destacada: boolean
  publicada: boolean
  publicada_at: string
  autor: string | null
  updated_at: string
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function GestionarNovedadesPage({
  searchParams,
}: {
  searchParams?: { creada?: string; editada?: string }
}) {
  const session = await requireRole('admin')

  const admin = createAdminClient()
  // Listamos TODAS las noticias (publicadas y borradores) — el admin debe ver
  // todo. La policy de RLS permite SELECT solo a service_role, así que el
  // admin client (service_role) ve todas.
  const { data: noticias } = (await admin
    .from('noticias')
    .select(
      'id, titulo, resumen, destacada, publicada, publicada_at, autor, updated_at',
    )
    .order('publicada_at', { ascending: false })) as {
    data: NoticiaRow[] | null
  }

  const total = noticias?.length ?? 0
  const flash =
    searchParams?.creada === '1'
      ? 'Noticia creada y publicada.'
      : searchParams?.editada === '1'
        ? 'Cambios guardados.'
        : null

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-brand-ink">
                Novedades
              </h1>
              <p className="mt-1 text-sm text-brand-muted">
                {total === 0
                  ? 'Todavía no creaste ninguna noticia.'
                  : `${total} ${total === 1 ? 'noticia cargada' : 'noticias cargadas'}.`}
              </p>
            </div>
            <Link
              href="/admin"
              className="text-sm font-medium text-brand-blue hover:underline"
            >
              ← Volver al panel
            </Link>
          </div>
          <Link
            href="/admin/novedades/nueva"
            className="inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-btn-primary px-5 text-sm font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover"
          >
            + Nueva noticia
          </Link>
        </header>

        {flash && (
          <div
            role="status"
            className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200"
          >
            ✓ {flash}
          </div>
        )}

        {total === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
            Cuando publiques una noticia va a aparecer acá.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {noticias!.map((n) => (
              <li
                key={n.id}
                className={
                  'flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card ' +
                  (!n.publicada ? 'opacity-70 ring-1 ring-amber-200' : '')
                }
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <h3 className="truncate text-base font-semibold text-brand-ink">
                      {n.titulo}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-brand-muted">
                      {n.resumen}
                    </p>
                  </div>
                </header>

                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
                  <div>
                    <dt className="inline">Publicada: </dt>
                    <dd className="inline text-brand-ink">
                      {formatDateTime(n.publicada_at)}
                    </dd>
                  </div>
                  {n.autor && (
                    <div>
                      <dt className="inline">Autor: </dt>
                      <dd className="inline text-brand-ink">{n.autor}</dd>
                    </div>
                  )}
                </dl>

                <NoticiaToggleActions
                  noticiaId={n.id}
                  publicada={n.publicada}
                  destacada={n.destacada}
                />

                <div className="flex justify-end">
                  <Link
                    href={`/admin/novedades/${n.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline"
                  >
                    Editar →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
