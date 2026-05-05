import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Logo } from '@/components/landing/Logo'
import {
  NoticiasCarousel,
  type Noticia,
} from '@/components/landing/NoticiasCarousel'
import { LandingForm } from '@/components/landing/LandingForm'
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
  const rol = data?.rol ?? 'afiliado'
  if (rol === 'admin') return '/admin'
  if (rol === 'delegado') return '/delegados'
  return '/feed'
}

export default async function LandingPage() {
  // 1. Si ya tiene sesión → home según rol
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect(await getRoleHomeFor(user.id))
  }

  // 2. Anon: fetch noticias publicadas (RLS permite anon SELECT)
  const { data: noticiasRaw } = (await supabase
    .from('noticias')
    .select('id, titulo, resumen, publicada_at, autor, destacada')
    .eq('publicada', true)
    .order('publicada_at', { ascending: false })
    .limit(8)) as { data: Noticia[] | null }

  const noticias: Noticia[] = noticiasRaw ?? []

  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-brand-gradient">
      {/* Capa de profundidad — radiales suaves para textura */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_18%,rgba(255,255,255,0.22),transparent_55%),radial-gradient(ellipse_at_85%_70%,rgba(0,0,0,0.18),transparent_60%)]"
      />
      {/* Patrón de siluetas (crowd) en oscuro al pie del gradient — el bottom
          ahora es azul medio, así que las siluetas oscuras dan textura "asamblea". */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-25"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 200'><g fill='%23031024'><path d='M30 200 L30 130 L40 110 L50 130 L50 200 Z'/><path d='M70 200 L70 145 L82 122 L94 145 L94 200 Z'/><path d='M110 200 L110 138 L122 118 L134 138 L134 200 Z'/><path d='M150 200 L150 152 L160 132 L170 152 L170 200 Z'/><path d='M188 200 L188 130 L200 110 L212 130 L212 200 Z'/><path d='M230 200 L230 142 L242 120 L254 142 L254 200 Z'/><path d='M270 200 L270 148 L280 128 L290 148 L290 200 Z'/><path d='M310 200 L310 134 L322 112 L334 134 L334 200 Z'/><path d='M350 200 L350 144 L360 124 L370 144 L370 200 Z'/><path d='M390 200 L390 138 L400 118 L410 138 L410 200 Z'/><path d='M430 200 L430 130 L440 108 L450 130 L450 200 Z'/><path d='M470 200 L470 146 L482 124 L494 146 L494 200 Z'/><path d='M510 200 L510 140 L522 120 L534 140 L534 200 Z'/><path d='M550 200 L550 134 L562 112 L572 134 L572 200 Z'/></g></svg>\")",
          backgroundRepeat: 'repeat-x',
          backgroundSize: '600px 200px',
          backgroundPosition: 'bottom',
        }}
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Hero con logo */}
        <section className="flex flex-col items-center gap-3 pt-10 pb-6">
          <Logo size={160} />
          <p className="mt-2 max-w-[280px] px-4 text-center text-sm font-medium leading-snug text-white/90">
            Asociación del Personal de los Organismos de Previsión Social
          </p>
        </section>

        {/* Carousel de noticias */}
        {noticias.length > 0 && (
          <div className="pb-5">
            <NoticiasCarousel noticias={noticias} />
          </div>
        )}

        {/* Form de login + link sin legajo */}
        <section
          aria-label="Ingreso"
          className="mt-auto flex flex-col gap-3 px-6 pt-2"
        >
          <LandingForm />
        </section>

        {/* CTA: afiliarse (para no-afiliados) */}
        <div className="mt-6 px-6">
          <div className="rounded-2xl border border-white/25 bg-white/10 p-4 text-center backdrop-blur-md">
            <p className="text-sm text-white/85">¿Todavía no sos afiliado/a?</p>
            <a
              href="/afiliarse"
              className="mt-2 inline-flex min-h-touch items-center justify-center rounded-full border-2 border-white/80 px-5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Afiliate ahora
            </a>
          </div>
        </div>

        {/* Footer minimalista con contacto */}
        <footer className="mt-6 flex flex-col items-center gap-1 px-6 pb-6 text-center text-[11px] text-white/60">
          <p>Viamonte 1654, CABA · (011) 5544-8300</p>
          <p>apops@apops.org.ar</p>
        </footer>
      </div>

      {/* Botón flotante de ayuda */}
      <HelpButton />
    </main>
  )
}
