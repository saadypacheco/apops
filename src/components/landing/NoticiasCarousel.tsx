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
  if (noticias.length === 0) return null

  return (
    <section
      aria-label="Últimas noticias del gremio"
      className="flex flex-col gap-2.5"
    >
      <header className="flex items-center justify-between px-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/85">
          Últimas novedades
        </h2>
        <span
          aria-hidden
          className="text-xs font-medium text-white/60"
        >
          ← Deslizá →
        </span>
      </header>

      <div
        className="snap-x-noscrollbar flex gap-3 overflow-x-auto scroll-smooth px-5 pb-1 snap-x snap-mandatory"
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
