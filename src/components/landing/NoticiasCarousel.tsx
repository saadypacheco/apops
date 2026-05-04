import { NoticiaCard } from './NoticiaCard'

export type Noticia = {
  id: string
  titulo: string
  resumen: string
  publicada_at: string
  autor: string | null
  destacada: boolean
}

export function NoticiasCarousel({ noticias }: { noticias: Noticia[] }) {
  if (noticias.length === 0) {
    return null
  }

  return (
    <section
      aria-label="Últimas noticias del gremio"
      className="flex flex-col gap-3"
    >
      <header className="flex items-end justify-between px-5">
        <h2 className="text-lg font-semibold text-white">Últimas noticias</h2>
        <span className="text-xs text-white/75">
          {noticias.length} novedades
        </span>
      </header>

      <div
        className="snap-x-noscrollbar flex gap-3 overflow-x-auto scroll-smooth px-5 pb-2 snap-x snap-mandatory"
        style={{ scrollPadding: '1.25rem' }}
      >
        {noticias.map((n) => (
          <NoticiaCard
            key={n.id}
            titulo={n.titulo}
            resumen={n.resumen}
            publicada_at={n.publicada_at}
            autor={n.autor}
            destacada={n.destacada}
          />
        ))}
      </div>
    </section>
  )
}
