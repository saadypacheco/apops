import { redirect } from 'next/navigation'
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
import { InstallPWAButton } from '@/components/landing/InstallPWAButton'

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
      {/* Decoración lateral DESKTOP — solo visible en pantallas md+ (≥768px).
          En mobile el container ocupa toda la pantalla y estas no aportan,
          así que las ocultamos con hidden md:block. */}
      <DesktopDecorations />

      {/* Container mobile-first centrado en cualquier viewport. El fondo
          azul ocupa toda la pantalla; el contenido vive en una columna
          fija de ancho mobile (~480px) centrada — fiel al mockup. */}
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col">
        {/* Decoración: círculo translúcido grande arriba derecha */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-[260px] w-[260px] rounded-full bg-white/10 blur-md"
        />

        {/* Header: logo a la izquierda + botón Instalar a la derecha */}
        <header className="relative z-10 flex w-full items-center justify-between gap-3 px-5 pb-0 pt-1.5">
          <Logo as="onBlue" priority />
          <InstallPWAButton variant="header" label="Instalar" />
        </header>

        {/* Carousel de noticias */}
        {noticias.length > 0 && (
          <div className="relative z-10 pb-0.5">
            <NoticiasCarousel noticias={noticias} />
          </div>
        )}

        {/* Form ACCESO */}
        <section aria-label="Ingreso" className="relative z-10 px-5">
          <LoginForm registrado={registrado} />
        </section>

        {/* Footer */}
        <footer className="relative z-10 mt-1 px-5 pb-1">
          <div className="rounded-2xl bg-white/85 px-3 py-1 text-center text-[10px] leading-tight text-brand-ink shadow-card backdrop-blur-sm">
            <p className="font-medium">
              Viamonte 1654, CABA · (011) 5544-8300 ·{' '}
              <a
                href="mailto:apops@apops.org.ar"
                className="font-medium text-brand-ink hover:underline"
              >
                apops@apops.org.ar
              </a>
            </p>
          </div>
        </footer>
      </div>

      <HelpButton />
    </main>
  )
}

// Decoración lateral solo para desktop (md ≥ 768px). Apunta a llenar el
// espacio azul vacío a los costados del container 480px sin alterar el
// layout mobile. Compuesta por:
//   - 2 "soles APOPS" muy difuminados en esquinas opuestas (top-left y
//     bottom-right). Funcionan como marca de agua sutil.
//   - Un patrón de ondas SVG en el fondo, anclado al borde inferior.
//   - Card flotante a la izquierda con tagline (visible solo en lg+).
function DesktopDecorations() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
    >
      {/* Sol APOPS gigante difuminado, esquina top-left */}
      <SolMark className="absolute -left-32 -top-32 h-[420px] w-[420px] text-white/[0.06]" />

      {/* Sol APOPS gigante difuminado, esquina bottom-right */}
      <SolMark className="absolute -bottom-40 -right-40 h-[520px] w-[520px] text-white/[0.05]" />

      {/* Ondas decorativas en el fondo */}
      <svg
        className="absolute inset-x-0 bottom-0 h-40 w-full text-white/[0.06]"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,256L60,234.7C120,213,240,171,360,170.7C480,171,600,213,720,224C840,235,960,213,1080,186.7C1200,160,1320,128,1380,112L1440,96L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
      </svg>

      {/* Tagline a la izquierda — solo en pantallas grandes (lg ≥ 1024px) */}
      <div className="absolute left-12 top-1/2 hidden -translate-y-1/2 lg:block">
        <div className="max-w-xs">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">
            APOPS Siempre
          </p>
          <p className="mt-2 text-3xl font-bold leading-tight text-white/90">
            Tu gremio,<br />
            en tu bolsillo.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Credencial digital, novedades, consultas y trámites — todo en un
            solo lugar, accesible desde cualquier dispositivo.
          </p>
        </div>
      </div>

      {/* Tagline a la derecha — datos de contacto, solo en lg+ */}
      <div className="absolute right-12 top-1/2 hidden -translate-y-1/2 text-right lg:block">
        <div className="max-w-xs">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">
            Sede central
          </p>
          <p className="mt-2 text-base text-white/90">
            Viamonte 1654, CABA
          </p>
          <p className="text-sm text-white/70">(011) 5544-8300</p>
          <p className="mt-2 text-sm text-white/70">apops@apops.org.ar</p>
        </div>
      </div>
    </div>
  )
}

// Mini-marca: el sol APOPS de 12 rayos, en color currentColor.
function SolMark({ className }: { className?: string }) {
  const rays = Array.from({ length: 12 })
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      {rays.map((_, i) => (
        <rect
          key={i}
          x="46.5"
          y="6"
          width="7"
          height="22"
          rx="1.5"
          transform={`rotate(${(i * 360) / 12} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="9" />
    </svg>
  )
}
