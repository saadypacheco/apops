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
  if (diffH < 1) return 'hace minutos'
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `hace ${diffD} d`
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

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
        'flex shrink-0 snap-start flex-col gap-2 rounded-xl bg-white p-4 shadow-card ' +
        'w-[80vw] max-w-[280px] sm:w-[280px] ' +
        (destacada ? 'ring-2 ring-brand-lime' : '')
      }
    >
      {destacada && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-lime/15 px-2 py-0.5 text-xs font-semibold text-brand-deep">
          ⭐ Destacada
        </span>
      )}
      <h3 className="text-base font-semibold leading-tight text-brand-ink line-clamp-2">
        {titulo}
      </h3>
      <p className="text-sm text-brand-muted line-clamp-3">{resumen}</p>
      <footer className="mt-auto flex items-center justify-between pt-2 text-xs text-brand-muted">
        <span>{autor ?? 'APOPS'}</span>
        <time dateTime={publicada_at}>{formatRelative(publicada_at)}</time>
      </footer>
    </article>
  )
}
