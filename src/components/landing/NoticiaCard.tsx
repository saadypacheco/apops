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
  if (diffD < 7) return `Hace ${diffD} d`
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

// Card glassmorphism: translúcida sobre el gradient. backdrop-blur reduce
// el ruido de fondo y hace legible el texto sin necesidad de un cuadro
// blanco opaco.

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
        'flex shrink-0 snap-center flex-col gap-2 rounded-2xl bg-white/15 px-5 py-4 text-white backdrop-blur-md ' +
        'w-[78vw] max-w-[300px] sm:w-[300px] ring-1 ring-white/25 ' +
        (destacada ? 'ring-2 ring-white/60' : '')
      }
    >
      <header className="flex items-center gap-2">
        {destacada && (
          <span
            aria-label="Destacada"
            className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-deep"
          >
            ★ Destacada
          </span>
        )}
        <time
          dateTime={publicada_at}
          className="ml-auto text-xs font-medium text-white/80"
        >
          {formatRelative(publicada_at)}
        </time>
      </header>
      <h3 className="text-base font-semibold leading-snug text-white line-clamp-2">
        {titulo}
      </h3>
      <p className="text-sm text-white/85 line-clamp-3">{resumen}</p>
      <footer className="mt-1 text-xs text-white/75">
        {autor ?? 'APOPS'}
      </footer>
    </article>
  )
}
