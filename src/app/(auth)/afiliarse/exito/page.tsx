import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Solicitud enviada',
}

// Force dynamic: la página lee searchParams.id y consulta DB con el
// admin client. Sin esto, next build intenta pre-renderizar como
// estática y revienta porque no hay request context.
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams?: { id?: string }
}

type Row = {
  email: string
  email_aspirante_enviado_at: string | null
  email_apops_enviado_at: string | null
  email_delegado_enviado_at: string | null
  email_delegado_destinos: string[] | null
}

export default async function AfiliarseExitoPage({ searchParams }: PageProps) {
  const id = searchParams?.id ?? ''
  const refCorta = id ? id.slice(0, 8).toUpperCase() : null

  let row: Row | null = null
  if (id) {
    const admin = createAdminClient()
    const res = (await admin
      .from('solicitudes_afiliacion')
      .select(
        'email, email_aspirante_enviado_at, email_apops_enviado_at, email_delegado_enviado_at, email_delegado_destinos',
      )
      .eq('id', id)
      .maybeSingle()) as { data: Row | null }
    row = res.data
  }

  const aspiranteOk = !!row?.email_aspirante_enviado_at
  const apopsOk = !!row?.email_apops_enviado_at
  const delegadoOk = !!row?.email_delegado_enviado_at
  const algunEnvio = aspiranteOk || apopsOk || delegadoOk

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
            revisar y te vamos a contactar cuando esté procesada.
          </p>
        </div>

        {algunEnvio && row && (
          <section className="w-full rounded-xl bg-white/10 backdrop-blur-md p-4 ring-1 ring-white/20 text-left">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3">
              Mandamos copia del PDF firmado a:
            </h2>
            <ul className="flex flex-col gap-2 text-sm">
              {aspiranteOk && (
                <li className="flex items-start gap-2">
                  <span aria-hidden>📬</span>
                  <span>
                    Tu correo (<strong className="break-all">{row.email}</strong>) — comprobante para tus registros
                  </span>
                </li>
              )}
              {apopsOk && (
                <li className="flex items-start gap-2">
                  <span aria-hidden>🏛️</span>
                  <span>
                    <strong>APOPS</strong> (apops@apops.org.ar) — para que la Comisión Directiva la procese
                  </span>
                </li>
              )}
              {delegadoOk && (
                <li className="flex items-start gap-2">
                  <span aria-hidden>👥</span>
                  <span>
                    Tu delegado/a del edificio
                    {row.email_delegado_destinos && row.email_delegado_destinos.length > 0
                      ? ` (${row.email_delegado_destinos.length === 1 ? '1 persona' : `${row.email_delegado_destinos.length} personas`})`
                      : ''}{' '}
                    — para que esté en conocimiento
                  </span>
                </li>
              )}
            </ul>
          </section>
        )}

        {!algunEnvio && (
          <section className="w-full rounded-xl bg-amber-500/15 backdrop-blur-md p-4 ring-1 ring-amber-200/40 text-left">
            <p className="text-sm">
              ⚠️ La solicitud quedó guardada, pero no pudimos mandar el mail
              de confirmación en este momento. Te contactaremos en breve.
            </p>
          </section>
        )}

        {refCorta && (
          <p className="text-sm text-white/75">
            Referencia: <code className="font-mono font-semibold">{refCorta}</code>
          </p>
        )}

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
