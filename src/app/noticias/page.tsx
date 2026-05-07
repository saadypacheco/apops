import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Novedades — APOPS Siempre',
  description: 'Comunicados y novedades del gremio APOPS.',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function NoticiasPublicasPage() {
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
    .order('publicada_at', { ascending: false })) as {
    data: NoticiaRow[] | null
  }

  return (
    <main className="relative min-h-[100dvh] w-full bg-brand-gradient">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_18%,rgba(255,255,255,0.18),transparent_55%)]"
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ← Volver
          </Link>
          <h1 className="text-base font-bold uppercase tracking-widest text-white">
            Novedades
          </h1>
          <span className="w-[88px]" aria-hidden />
        </header>

        {(!noticias || noticias.length === 0) && (
          <div className="rounded-xl border border-dashed border-white/30 bg-white/10 p-8 text-center text-sm text-white/80 backdrop-blur-md">
            Todavía no hay novedades publicadas.
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {noticias?.map((n) => (
            <li
              key={n.id}
              className={
                'flex flex-col gap-2 rounded-2xl bg-white/15 p-5 text-white shadow-card ring-1 ring-white/25 backdrop-blur-md ' +
                (n.destacada ? 'ring-2 ring-white/60' : '')
              }
            >
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold leading-snug text-white">
                  {n.titulo}
                </h2>
                {n.destacada && (
                  <span className="shrink-0 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-deep">
                    ★ Destacada
                  </span>
                )}
              </header>
              <p className="text-sm leading-relaxed text-white/90">
                {n.resumen}
              </p>
              <footer className="mt-1 flex items-center justify-between text-xs text-white/70">
                <span>{n.autor ?? 'APOPS'}</span>
                <time dateTime={n.publicada_at}>
                  {formatDate(n.publicada_at)}
                </time>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
