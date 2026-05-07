type NoticiaCardProps = {
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

// Card blanca con shadow + ícono circular azul a la izquierda. Estilo mockup.
export function NoticiaCard({
  titulo,
  resumen,
  publicada_at,
  autor,
  destacada,
}: NoticiaCardProps) {
  return (
    <article
      className={
        'flex shrink-0 snap-center flex-col gap-2.5 rounded-2xl bg-white p-4 shadow-card ' +
        // Mismo ancho que el form ACCESO: viewport - 40px (px-5*2 del
        // contenedor padre), limitado al max del container (480 - 40 = 440).
        'w-[calc(100vw-2.5rem)] max-w-[440px] ' +
        (destacada ? 'ring-2 ring-brand-blue/40' : '')
      }
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white"
        >
          <MegaphoneIcon />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <time
              dateTime={publicada_at}
              className="rounded-md bg-brand-deep/5 px-2 py-0.5 text-[10px] font-medium text-brand-muted"
            >
              {formatRelative(publicada_at)}
            </time>
            {destacada && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">
                ★ Destacada
              </span>
            )}
          </div>
          <h3 className="text-base font-bold leading-snug text-brand-ink line-clamp-2">
            {titulo}
          </h3>
        </div>
      </header>
      <p className="text-sm text-brand-muted line-clamp-3">{resumen}</p>
      <footer className="text-sm font-semibold text-brand-blue">
        {autor ?? 'APOPS'}
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
