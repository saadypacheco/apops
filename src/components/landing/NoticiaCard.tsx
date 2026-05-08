import Link from 'next/link'

type NoticiaCardProps = {
  id: string
  titulo: string
  resumen: string
  publicada_at: string
  autor: string | null
  destacada: boolean
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffH < 1) return 'Ahora'
  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `Hace ${diffD} día${diffD > 1 ? 's' : ''}`
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

// Card blanca con shadow. Estilo mockup: badge prominente arriba ("DESTACADA"
// o "NUEVA NOTICIA"), título, resumen, footer con autor + tiempo + CTA.
export function NoticiaCard({
  id,
  titulo,
  resumen,
  publicada_at,
  autor,
  destacada,
}: NoticiaCardProps) {
  return (
    <article
      className={
        'flex shrink-0 snap-center flex-col gap-3 rounded-2xl bg-white p-4 shadow-card ' +
        // Mismo ancho que el form ACCESO: viewport - 40px (px-5*2 del
        // contenedor padre), limitado al max del container (480 - 40 = 440).
        'w-[calc(100vw-2.5rem)] max-w-[440px] ' +
        (destacada ? 'ring-2 ring-brand-blue/40' : '')
      }
    >
      <span
        className={
          'inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
          (destacada
            ? 'bg-brand-blue text-white'
            : 'bg-brand-blue/10 text-brand-blue')
        }
      >
        {destacada ? '★ Destacada' : 'Nueva noticia'}
      </span>

      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white"
        >
          <MegaphoneIcon />
        </span>
        <h3 className="flex-1 text-base font-bold leading-snug text-brand-ink line-clamp-2">
          {titulo}
        </h3>
      </header>

      <p className="text-sm text-brand-muted line-clamp-3">{resumen}</p>

      <footer className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-2.5 text-xs">
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-brand-blue">{autor ?? 'APOPS'}</span>
          <time dateTime={publicada_at} className="text-brand-muted">
            {formatRelative(publicada_at)}
          </time>
        </div>
        <Link
          href={`/noticias/${id}`}
          className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-3 py-1.5 text-xs font-bold text-brand-blue transition hover:bg-brand-blue hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
        >
          Ver noticia
          <span aria-hidden>→</span>
        </Link>
      </footer>
    </article>
  )
}

function MegaphoneIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <path
        d="M3 11v2a2 2 0 002 2h2l5 4V5L7 9H5a2 2 0 00-2 2zM16 8a5 5 0 010 8M19 5a9 9 0 010 14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
