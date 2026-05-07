import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { homeForRol } from '@/lib/auth/role'
import { Logo } from '@/components/landing/Logo'
import {
  NoticiasCarousel,
  type Noticia,
} from '@/components/landing/NoticiasCarousel'
import { LoginForm } from '@/components/auth/LoginForm'
import { HelpButton } from '@/components/landing/HelpButton'

export const metadata = {
  title: 'APOPS Siempre — Bienvenida',
  description:
    'Plataforma del gremio APOPS de ANSES. Ingresá para acceder a comunicados, consultas y servicios.',
}

async function getRoleHomeFor(userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('afiliados')
    .select('rol')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return homeForRol(data?.rol ?? 'afiliado')
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: { registrado?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect(await getRoleHomeFor(user.id))
  }

  const registrado = searchParams?.registrado === '1'

  const { data: noticiasRaw } = (await supabase
    .from('noticias')
    .select('id, titulo, resumen, publicada_at, autor, destacada')
    .eq('publicada', true)
    .order('publicada_at', { ascending: false })
    .limit(8)) as { data: Noticia[] | null }

  const noticias: Noticia[] = noticiasRaw ?? []

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-brand-gradient">
      {/* Container mobile-first centrado en cualquier viewport. El fondo
          azul ocupa toda la pantalla; el contenido vive en una columna
          fija de ancho mobile (~480px) centrada — fiel al mockup. */}
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col">
        {/* Decoración: círculo translúcido grande arriba derecha */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-[260px] w-[260px] rounded-full bg-white/10 blur-md"
        />

        {/* Header: logo a la izquierda + campana a la derecha */}
        <header className="relative z-10 flex w-full items-center justify-between gap-3 px-5 pb-1 pt-3">
          <Logo as="onBlue" priority />
          <BellButton />
        </header>

        {/* Hero saludo */}
        <section className="relative z-10 px-5 pb-2 pt-1">
          <h1 className="text-2xl font-bold leading-tight text-white">¡Hola! 👋</h1>
          <p className="text-sm text-white/90">Bienvenido a tu portal</p>
        </section>

        {/* Carousel de noticias */}
        {noticias.length > 0 && (
          <div className="relative z-10 pb-3">
            <NoticiasCarousel noticias={noticias} />
          </div>
        )}

        {/* Form ACCESO */}
        <section aria-label="Ingreso" className="relative z-10 px-5">
          <LoginForm registrado={registrado} />
        </section>

        {/* CTA: afiliarse */}
        <div className="relative z-10 px-5 pt-2">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-card">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
            >
              <PeopleIcon />
            </span>
            <p className="flex-1 text-sm text-brand-muted">
              ¿Todavía no sos afiliado/a?
            </p>
            <Link
              href="/afiliarse"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-brand-blue px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-blue transition hover:bg-brand-blue hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
            >
              Afiliate
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 mt-3 px-5 pb-3">
          <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-white/85 px-4 py-2 text-center text-[11px] text-brand-ink shadow-card backdrop-blur-sm">
            <p className="font-medium">
              Viamonte 1654, CABA · (011) 5544-8300
            </p>
            <a
              href="mailto:apops@apops.org.ar"
              className="text-brand-blue hover:underline"
            >
              apops@apops.org.ar
            </a>
          </div>
        </footer>
      </div>

      <HelpButton />
    </main>
  )
}

function BellButton() {
  return (
    <button
      type="button"
      aria-label="Notificaciones"
      className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="h-6 w-6"
      >
        <path
          d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2zM10 21a2 2 0 004 0"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        aria-hidden
        className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white ring-2 ring-brand-blue"
      />
    </button>
  )
}

function PeopleIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3 3-5 7-5s7 2 7 5" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14 14c2 0 8 1 8 5" strokeLinecap="round" />
    </svg>
  )
}
