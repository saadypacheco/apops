import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type NoticiaRow = {
  id: string
  titulo: string
  resumen: string
  contenido: string | null
  publicada_at: string
  autor: string | null
  destacada: boolean
  publicada: boolean
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const supabase = createClient()
  const { data } = (await supabase
    .from('noticias')
    .select('titulo, resumen')
    .eq('id', params.id)
    .eq('publicada', true)
    .maybeSingle()) as { data: { titulo: string; resumen: string } | null }
  if (!data) return { title: 'Noticia — APOPS Siempre' }
  return {
    title: `${data.titulo} — APOPS Siempre`,
    description: data.resumen,
  }
}

export default async function NoticiaPublicaPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: noticia } = (await supabase
    .from('noticias')
    .select(
      'id, titulo, resumen, contenido, publicada_at, autor, destacada, publicada',
    )
    .eq('id', params.id)
    .eq('publicada', true)
    .maybeSingle()) as { data: NoticiaRow | null }

  if (!noticia) notFound()

  return (
    <main className="relative min-h-[100dvh] w-full bg-brand-gradient">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_18%,rgba(255,255,255,0.18),transparent_55%)]"
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/noticias"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ← Volver a novedades
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-white/85 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Inicio
          </Link>
        </header>

        <article className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-cardHover">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
                (noticia.destacada
                  ? 'bg-brand-blue text-white'
                  : 'bg-brand-blue/10 text-brand-blue')
              }
            >
              {noticia.destacada ? '★ Destacada' : 'Novedad'}
            </span>
            <time
              dateTime={noticia.publicada_at}
              className="text-xs text-brand-muted"
            >
              {formatLongDate(noticia.publicada_at)}
            </time>
          </div>

          <h1 className="text-2xl font-bold leading-tight text-brand-ink">
            {noticia.titulo}
          </h1>

          <p className="text-base leading-relaxed text-brand-deep">
            {noticia.resumen}
          </p>

          {noticia.contenido && (
            <div className="whitespace-pre-wrap border-t border-neutral-100 pt-4 text-sm leading-relaxed text-brand-ink">
              {noticia.contenido}
            </div>
          )}

          <footer className="mt-2 border-t border-neutral-100 pt-3 text-xs text-brand-muted">
            Publicado por{' '}
            <span className="font-semibold text-brand-blue">
              {noticia.autor ?? 'APOPS'}
            </span>
          </footer>
        </article>
      </div>
    </main>
  )
}
