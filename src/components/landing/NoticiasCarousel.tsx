'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { NoticiaCard } from './NoticiaCard'

export type Noticia = {
  id: string
  titulo: string
  resumen: string
  publicada_at: string
  autor: string | null
  destacada: boolean
}

const AUTOPLAY_MS = 5000

export function NoticiasCarousel({ noticias }: { noticias: Noticia[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      const cards = Array.from(el.children) as HTMLElement[]
      if (cards.length === 0) return
      const scrollerCenter = el.scrollLeft + el.clientWidth / 2
      let closest = 0
      let closestDist = Infinity
      cards.forEach((card, i) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2
        const dist = Math.abs(cardCenter - scrollerCenter)
        if (dist < closestDist) {
          closestDist = dist
          closest = i
        }
      })
      setActive(closest)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [noticias.length])

  // Scroll horizontal del scroller a la card índice `i`. NO usa
  // scrollIntoView: ese método mueve también el scroll vertical de la
  // página (efecto: "se mueven los elementos de abajo" cuando autoplay
  // dispara). Acá manipulamos solo `scrollLeft` del scroller container.
  const goTo = (i: number) => {
    const el = scrollerRef.current
    if (!el) return
    const card = el.children[i] as HTMLElement | undefined
    if (!card) return
    const target =
      card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2
    el.scrollTo({ left: target, behavior: 'smooth' })
  }

  // Autoplay con pausa por interacción del usuario o reduced-motion.
  useEffect(() => {
    if (noticias.length <= 1 || paused) return
    if (typeof window !== 'undefined') {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (prefersReduced) return
    }
    const id = window.setInterval(() => {
      const el = scrollerRef.current
      if (!el) return
      setActive((current) => {
        const next = (current + 1) % noticias.length
        const card = el.children[next] as HTMLElement | undefined
        if (card) {
          const target =
            card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2
          el.scrollTo({ left: target, behavior: 'smooth' })
        }
        return next
      })
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [noticias.length, paused])

  if (noticias.length === 0) return null

  return (
    <section
      aria-label="Últimas noticias del gremio"
      className="flex flex-col gap-0.5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <header className="flex items-center justify-between gap-3 px-5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/75">
          Noticias del gremio · abiertas a toda ANSES
        </span>
        <Link
          href="/noticias"
          className="shrink-0 text-xs font-semibold text-white/90 underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Ver todas →
        </Link>
      </header>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="snap-x-noscrollbar flex gap-3 overflow-x-auto scroll-smooth px-5 pb-1 snap-x snap-mandatory"
        >
          {noticias.map((n) => (
            <NoticiaCard
              key={n.id}
              id={n.id}
              titulo={n.titulo}
              resumen={n.resumen}
              publicada_at={n.publicada_at}
              autor={n.autor}
              destacada={n.destacada}
            />
          ))}
        </div>

        {/* Flechas de navegación (solo si hay más de 1 noticia) */}
        {noticias.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo((active - 1 + noticias.length) % noticias.length)}
              aria-label="Noticia anterior"
              className="absolute left-1 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-blue shadow-card backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              type="button"
              onClick={() => goTo((active + 1) % noticias.length)}
              aria-label="Noticia siguiente"
              className="absolute right-1 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-blue shadow-card backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronIcon dir="right" />
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className="h-5 w-5"
      aria-hidden
    >
      {dir === 'left' ? (
        <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}
