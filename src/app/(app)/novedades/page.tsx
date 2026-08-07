import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'

export const metadata: Metadata = {
  title: 'Novedades',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function NovedadesPage() {
  const session = await requireRole('afiliado')

  const supabase = createClient()
  type NoticiaRow = {
    id: string
    titulo: string
    resumen: string
    publicada_at: string
    autor: string | null
    destacada: boolean
  }
  const { data: noticias } = (await supabase
    .from('noticias')
    .select('id, titulo, resumen, publicada_at, autor, destacada')
    .eq('publicada', true)
    .eq('categoria', 'novedad')
    .order('publicada_at', { ascending: false })
    .limit(50)) as { data: NoticiaRow[] | null }

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="novedades">
      <div className="flex flex-col gap-4">
        <header className="flex items-end justify-between">
          <h1 className="text-2xl font-semibold text-brand-ink">Novedades</h1>
          <span className="text-xs text-brand-muted">
            {noticias?.length ?? 0} publicadas
          </span>
        </header>

        {(!noticias || noticias.length === 0) && (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
            Todavía no hay novedades publicadas.
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {noticias?.map((n) => (
            <li
              key={n.id}
              className={
                'flex flex-col gap-2 rounded-xl bg-white p-4 shadow-card ' +
                (n.destacada ? 'ring-2 ring-brand-lime' : '')
              }
            >
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-brand-ink">
                  {n.titulo}
                </h2>
                {n.destacada && (
                  <span className="shrink-0 rounded-full bg-brand-lime/15 px-2 py-0.5 text-xs font-semibold text-brand-deep">
                    ⭐ Destacada
                  </span>
                )}
              </header>
              <p className="text-sm text-brand-muted">{n.resumen}</p>
              <footer className="mt-1 flex items-center justify-between text-xs text-brand-muted">
                <span>{n.autor ?? 'APOPS'}</span>
                <time dateTime={n.publicada_at}>
                  {formatDate(n.publicada_at)}
                </time>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  )
}
