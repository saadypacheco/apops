import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Solicitud enviada',
}

interface PageProps {
  searchParams?: { id?: string }
}

export default function AfiliarseExitoPage({ searchParams }: PageProps) {
  const id = searchParams?.id ?? ''
  const refCorta = id ? id.slice(0, 8).toUpperCase() : null

  return (
    <main className="min-h-screen bg-brand-gradient">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-12 text-center text-white">
        <div
          aria-hidden
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ring-2 ring-white/30"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={3}
            className="h-10 w-10"
          >
            <path
              d="M5 12l5 5 9-11"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">
            ¡Solicitud enviada!
          </h1>
          <p className="text-base text-white/90">
            Recibimos tu ficha de afiliación. Un administrador la va a
            revisar y te vamos a contactar por email cuando esté procesada.
          </p>
          {refCorta && (
            <p className="text-sm text-white/75">
              Referencia: <code className="font-mono font-semibold">{refCorta}</code>
            </p>
          )}
        </div>

        <Link
          href="/"
          className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-white px-6 text-sm font-bold uppercase tracking-wider text-brand-deep shadow-cardHover transition-transform hover:scale-105"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
