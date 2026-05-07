import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/landing/Logo'
import { SolicitarAccesoForm } from '@/components/auth/SolicitarAccesoForm'

export const metadata: Metadata = {
  title: 'Tus datos no están en el padrón',
  description:
    'No te encontramos en el padrón APOPS. Te ayudamos a continuar.',
}

const DNI_REGEX = /^[0-9]{7,8}$/

// F4: Pantalla bifurcada para personas que no están en el padrón.
//   Camino A — "Quiero afiliarme a APOPS" → /afiliarse
//   Camino B — "Soy afiliado pero no aparezco" → form solicitarAcceso
//
// Si la persona viene de /registrarse con un identifier, lo recibimos por
// query string y prefilleamos el DNI o el legajo según corresponda.

export default function NoEnPadronPage({
  searchParams,
}: {
  searchParams?: { identifier?: string }
}) {
  const identifier = searchParams?.identifier?.trim() ?? ''
  const isDni = identifier.length > 0 && DNI_REGEX.test(identifier)
  const prefillDni = isDni ? identifier : undefined
  const prefillLegajo = identifier && !isDni ? identifier.toUpperCase() : undefined

  return (
    <main className="relative min-h-[100dvh] w-full bg-brand-gradient">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_18%,rgba(255,255,255,0.18),transparent_55%)]"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-10">
        <header className="flex flex-col items-center gap-3 text-center text-white">
          <Logo width={200} />
          <h1 className="text-2xl font-bold leading-tight">
            No encontramos tus datos
          </h1>
          <p className="text-sm text-white/85">
            No estás registrado/a en el padrón APOPS. Elegí cómo querés seguir.
          </p>
        </header>

        {/* Card 1: Afiliación */}
        <article className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-card">
          <header className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-lime/15 text-brand-deep"
            >
              <UserPlusIcon />
            </span>
            <div className="flex flex-col leading-tight">
              <h2 className="text-base font-bold text-brand-ink">
                Quiero afiliarme a APOPS
              </h2>
              <p className="text-xs text-brand-muted">
                Si todavía no sos afiliado/a y querés serlo.
              </p>
            </div>
          </header>
          <Link
            href="/afiliarse"
            className="inline-flex min-h-touch items-center justify-center rounded-lg bg-btn-primary px-6 text-sm font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30"
          >
            Iniciar afiliación
          </Link>
        </article>

        {/* Card 2: Solicitud de acceso (collapsible) */}
        <details className="group rounded-2xl bg-white shadow-card open:pb-1">
          <summary className="flex cursor-pointer items-start gap-3 rounded-2xl p-5 marker:hidden [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
            >
              <DocumentIcon />
            </span>
            <div className="flex flex-1 flex-col leading-tight">
              <h2 className="text-base font-bold text-brand-ink">
                Ya soy afiliado/a pero no aparezco
              </h2>
              <p className="text-xs text-brand-muted">
                Solicitá acceso a la app. Un admin va a revisar tu caso.
              </p>
            </div>
            <span
              aria-hidden
              className="mt-1 text-brand-blue transition group-open:rotate-180"
            >
              <ChevronDownIcon />
            </span>
          </summary>
          <div className="px-2 pb-2">
            <SolicitarAccesoForm
              prefillDni={prefillDni}
              prefillLegajo={prefillLegajo}
            />
          </div>
        </details>

        <Link
          href="/"
          className="self-center text-sm font-medium text-white/85 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  )
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3-6 7-6s7 2 7 6" strokeLinecap="round" />
      <path d="M19 8v6M22 11h-6" strokeLinecap="round" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h6" strokeLinecap="round" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5" aria-hidden>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
