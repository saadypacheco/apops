import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import {
  agruparPorCategoria,
  getBeneficiosPublicados,
  type Beneficio,
} from '@/lib/beneficios/queries'

export const metadata: Metadata = {
  title: 'Beneficios',
}

// Hub de servicios del afiliado: subsidios, salud, recreación, educación,
// asesoramiento y capacitaciones. Los beneficios salen de la tabla
// `beneficios` (migration 0040) y los gestiona el admin desde
// /admin/beneficios.

export default async function BeneficiosPage() {
  const session = await requireRole('afiliado')

  const beneficios = await getBeneficiosPublicados()
  const grupos = agruparPorCategoria(beneficios)

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="beneficios">
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-brand-ink">Beneficios</h1>
          <p className="text-sm text-brand-muted">
            Todo lo que te corresponde por estar afiliado a APOPS.
          </p>
        </header>

        {grupos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
            Todavía no hay beneficios publicados.
          </div>
        ) : (
          grupos.map((g) => (
            <section key={g.categoria} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                {g.label}
              </h2>
              <ul className="flex flex-col gap-3">
                {g.items.map((b) => (
                  <li key={b.id}>
                    <BeneficioCard beneficio={b} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <p className="pb-2 text-center text-xs text-brand-muted">
          ¿Dudas sobre cómo tramitarlos? Escribinos desde{' '}
          <strong>Consultas</strong>.
        </p>
      </div>
    </AppShell>
  )
}

/** "https://apops.org.ar/turismo/" → "apops.org.ar" */
function hostDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'otro sitio'
  }
}

function ExternalIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4 shrink-0 text-brand-blue"
    >
      <path
        d="M14 5h5v5M19 5l-8 8M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BeneficioCard({ beneficio: b }: { beneficio: Beneficio }) {
  const contenido = (
    <>
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-2xl"
        >
          {b.icono ?? '🎁'}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-base font-semibold leading-snug text-brand-ink">
            {b.titulo}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {b.destaque && (
              <span className="rounded-full bg-brand-lime/20 px-2 py-0.5 text-xs font-bold text-brand-deep">
                {b.destaque}
              </span>
            )}
            {b.proximamente && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                Próximamente
              </span>
            )}
          </div>
        </div>
        {b.link_externo && !b.proximamente && (
          <ExternalIcon />
        )}
      </header>

      <p className="text-sm text-brand-muted">{b.resumen}</p>

      {b.detalle && (
        <p className="whitespace-pre-line text-sm text-brand-ink">
          {b.detalle}
        </p>
      )}

      {/* Avisar que sale de la app: se abre en pestaña nueva, así que
          volver es cerrar la pestaña, no el botón atrás. */}
      {b.link_externo && !b.proximamente && (
        <p className="text-xs text-brand-muted">
          Se abre en {hostDe(b.link_externo)}, en otra pestaña.
        </p>
      )}
    </>
  )

  const clases =
    'flex flex-col gap-2 rounded-xl bg-white p-4 shadow-card ' +
    (b.proximamente ? 'opacity-80' : '')

  // Los que tienen link abren el trámite en apops.org.ar. Los que no,
  // quedan como card informativa — la consulta se hace por Consultas.
  if (b.link_externo && !b.proximamente) {
    return (
      <a
        href={b.link_externo}
        target="_blank"
        rel="noopener noreferrer"
        className={clases + ' transition hover:shadow-cardHover'}
      >
        {contenido}
      </a>
    )
  }

  return <article className={clases}>{contenido}</article>
}
