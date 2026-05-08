import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/landing/Logo'

// Página /software — landing demostrativa pública (sin auth) que explica
// qué ofrece APOPS Siempre. Pensada para que la CD del gremio o afiliados
// curiosos vean en formato web navegable todo lo que la app provee.
//
// Estructura inspirada en solucionodont.shop:
// hero → stats/value props → funcionalidades → cómo funciona →
// capturas → testimonios → CTA → FAQ → footer.

export const metadata: Metadata = {
  title: 'Conocé APOPS Siempre — la app del gremio',
  description:
    'Tu credencial digital, las novedades de APOPS, consultas y trámites — todo en un solo lugar, accesible desde cualquier dispositivo.',
}

export default function SoftwarePage() {
  return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-white">
      <NavTop />
      <Hero />
      <StatsBar />
      <Funcionalidades />
      <ComoFunciona />
      <Capturas />
      <Testimonios />
      <CTAFinal />
      <Faq />
      <FooterSec />
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Top nav (sticky)
// ─────────────────────────────────────────────────────────────────────────
function NavTop() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md ring-1 ring-black/5">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
        <Link href="/software" className="flex items-center gap-2">
          <Logo as="onWhite" width={120} />
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-brand-ink md:flex">
          <a href="#funcionalidades" className="hover:text-brand-blue">
            Funcionalidades
          </a>
          <a href="#como-funciona" className="hover:text-brand-blue">
            Cómo funciona
          </a>
          <a href="#testimonios" className="hover:text-brand-blue">
            Testimonios
          </a>
          <a href="#faq" className="hover:text-brand-blue">
            Preguntas
          </a>
        </div>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-full bg-btn-primary px-4 text-xs font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover"
        >
          Entrar a la app →
        </Link>
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-gradient px-5 py-20 text-white md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_18%,rgba(255,255,255,0.18),transparent_55%)]"
      />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <span className="rounded-full bg-white/15 px-4 py-1 text-xs font-bold uppercase tracking-widest text-white/90 ring-1 ring-white/25 backdrop-blur-sm">
          APOPS Siempre · PWA
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
          Tu gremio en el bolsillo de cada afiliado.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 md:text-lg">
          Credencial digital, novedades, consultas y trámites — todo en un solo
          lugar, accesible desde cualquier celular o computadora, sin instalar
          nada.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold uppercase tracking-wider text-brand-deep shadow-cardHover transition hover:-translate-y-0.5 hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            Probá la demo en vivo →
          </Link>
          <a
            href="#funcionalidades"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-white/10 px-6 text-sm font-bold uppercase tracking-wider text-white ring-2 ring-white/30 backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            Ver qué hace
          </a>
        </div>
        <p className="mt-6 text-xs text-white/70">
          Sin descargas. Sin Play Store ni App Store. Funciona en cualquier
          navegador moderno.
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Stats bar
// ─────────────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: '100%', label: 'Web — sin instalación' },
    { value: '< 3s', label: 'Tiempo de respuesta' },
    { value: 'RLS', label: 'Datos protegidos por rol' },
    { value: 'PWA', label: 'Pantalla de inicio en celulares' },
  ]
  return (
    <section className="border-y border-neutral-100 bg-white">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 px-5 py-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center text-center">
            <p className="text-2xl font-bold text-brand-blue md:text-3xl">
              {s.value}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-brand-muted">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Funcionalidades (4 cards)
// ─────────────────────────────────────────────────────────────────────────
function Funcionalidades() {
  const items = [
    {
      icon: <CredencialIcon />,
      title: 'Credencial digital',
      desc:
        'El afiliado tiene su credencial siempre a mano en el celular. Y las de su grupo familiar (cónyuge, hijos), todas en un solo lugar.',
      bullets: [
        'Compartir por WhatsApp en un toque',
        'Vista pública sin registro para que el flia la presente',
        'Sin foto, sin trámite presencial',
      ],
    },
    {
      icon: <BellIcon />,
      title: 'Novedades del gremio',
      desc:
        'Comunicación oficial directa al celular. La CD publica una vez, todos los afiliados se enteran al instante.',
      bullets: [
        'Asambleas, paritarias, comunicados',
        'Resaltado especial para temas urgentes',
        'Sin filtros de redes sociales',
      ],
    },
    {
      icon: <ChatIcon />,
      title: 'Canal de consultas',
      desc:
        'Botón único de contacto al gremio. WhatsApp directo con el saludo pre-cargado para que la administración sepa de inmediato quién consulta.',
      bullets: [
        'WhatsApp prioritario (verde)',
        'Email + teléfono como alternativas',
        'Datos del afiliado pre-cargados',
      ],
    },
    {
      icon: <PanelIcon />,
      title: 'Panel para CD y delegados',
      desc:
        'Gestión profesional: solicitudes de afiliación con firma digital, novedades publicables, cotizantes por sector, mensajería interna.',
      bullets: [
        'Aprobación de afiliaciones online con auditoría',
        'Delegados ven sus cotizantes y mandan mensajes a CD',
        'Toda acción crítica queda registrada',
      ],
    },
  ]
  return (
    <section id="funcionalidades" className="bg-neutral-50 px-5 py-20">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
            Funcionalidades
          </span>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-brand-ink md:text-4xl">
            Todo lo que tu gremio necesita.
          </h2>
          <p className="mt-3 text-base text-brand-muted">
            Construido junto a APOPS pensando en lo que un afiliado, un
            delegado y la Comisión Directiva realmente usan.
          </p>
        </header>
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.title}
              className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-card transition hover:shadow-cardHover"
            >
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue"
              >
                {item.icon}
              </span>
              <h3 className="text-xl font-bold text-brand-ink">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-brand-muted">
                {item.desc}
              </p>
              <ul className="flex flex-col gap-1.5 pt-1 text-sm text-brand-ink">
                {item.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <CheckIcon />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Cómo funciona — 3 pasos
// ─────────────────────────────────────────────────────────────────────────
function ComoFunciona() {
  const pasos = [
    {
      num: '01',
      title: 'Te registrás',
      desc:
        'Con tu DNI o legajo, email y una clave (opcional). Sin papeles, sin trámite presencial.',
    },
    {
      num: '02',
      title: 'Validamos contra padrón',
      desc:
        'En segundos, el sistema confirma que estás afiliado/a. Si no aparecés, te ofrecemos solicitar acceso o iniciar afiliación online.',
    },
    {
      num: '03',
      title: 'Usás la app',
      desc:
        'Ves tu credencial, las del grupo familiar, las novedades del gremio y tenés un canal directo de consulta. Todo desde cualquier dispositivo.',
    },
  ]
  return (
    <section
      id="como-funciona"
      className="bg-white px-5 py-20"
    >
      <div className="mx-auto w-full max-w-5xl">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
            Cómo funciona
          </span>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-brand-ink md:text-4xl">
            Tres pasos. Cinco minutos.
          </h2>
        </header>
        <div className="grid gap-5 md:grid-cols-3">
          {pasos.map((p) => (
            <div
              key={p.num}
              className="flex flex-col gap-3 rounded-2xl bg-neutral-50 p-6 ring-1 ring-neutral-100"
            >
              <span className="text-4xl font-bold text-brand-blue/30">
                {p.num}
              </span>
              <h3 className="text-xl font-bold text-brand-ink">{p.title}</h3>
              <p className="text-sm leading-relaxed text-brand-muted">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Capturas (placeholders por ahora)
// ─────────────────────────────────────────────────────────────────────────
function Capturas() {
  const items = [
    {
      label: 'Pantalla principal',
      desc: 'El afiliado ve su credencial digital al instante.',
      mockHeader: '🪪 Mi credencial',
    },
    {
      label: 'Compartir credencial',
      desc: 'Un toque y se manda por WhatsApp con saludo pre-cargado.',
      mockHeader: '💬 Compartir',
    },
    {
      label: 'Panel administración',
      desc: 'Solicitudes de afiliación con firma digital, todo en un lugar.',
      mockHeader: '🛡️ Admin',
    },
    {
      label: 'Panel delegados',
      desc: 'Cotizantes a tu cargo + mensajería con CD.',
      mockHeader: '🤝 Delegado',
    },
  ]
  return (
    <section className="bg-brand-gradient px-5 py-20 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">
            Pantallas
          </span>
          <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
            Mirá cómo se ve.
          </h2>
          <p className="mt-3 text-base text-white/85">
            Diseño mobile-first, optimizado para el celular del afiliado.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.label}
              className="flex flex-col gap-2 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm"
            >
              {/* Mock visual placeholder con aspect ratio mobile */}
              <div className="flex aspect-[9/16] items-start justify-center rounded-xl bg-white/95 p-3 text-brand-ink">
                <div className="flex w-full flex-col gap-2">
                  <div className="rounded-lg bg-brand-gradient px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                    {it.mockHeader}
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 w-3/4 rounded bg-neutral-200" />
                    <div className="h-2 w-full rounded bg-neutral-200" />
                    <div className="h-2 w-1/2 rounded bg-neutral-200" />
                  </div>
                  <div className="mt-2 h-20 rounded-lg bg-brand-blue/10" />
                  <div className="mt-1 h-7 rounded-lg bg-brand-blue" />
                </div>
              </div>
              <h4 className="text-sm font-semibold">{it.label}</h4>
              <p className="text-xs text-white/80">{it.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-white/80">
          ¿Querés ver las pantallas reales con datos vivos?{' '}
          <Link
            href="/"
            className="font-semibold text-white underline-offset-4 hover:underline"
          >
            Entrá a la demo →
          </Link>
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Testimonios (placeholders)
// ─────────────────────────────────────────────────────────────────────────
function Testimonios() {
  const items = [
    {
      role: 'Afiliada activa',
      name: 'María P.',
      quote:
        '«Antes tenía que ir a la sede a buscar la credencial. Ahora la tengo en el celular y puedo mandársela a mis hijos en un toque.»',
    },
    {
      role: 'Delegado regional',
      name: 'Roberto S.',
      quote:
        '«Veo a todos los compañeros que represento, mando mensajes a la CD desde la app. Todo queda registrado.»',
    },
    {
      role: 'Comisión Directiva',
      name: 'Lucía G.',
      quote:
        '«Pasamos de mandar comunicados por WhatsApp a publicar una vez en la app y que llegue a todos. Y las solicitudes de afiliación las gestionamos sin papeles.»',
    },
  ]
  return (
    <section id="testimonios" className="bg-white px-5 py-20">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
            Testimonios
          </span>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-brand-ink md:text-4xl">
            Lo que dicen los que ya la usan.
          </h2>
        </header>
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((t) => (
            <article
              key={t.name}
              className="flex flex-col gap-3 rounded-2xl bg-neutral-50 p-6 ring-1 ring-neutral-100"
            >
              <p className="text-sm leading-relaxed text-brand-ink">
                {t.quote}
              </p>
              <footer className="mt-auto border-t border-neutral-200 pt-3">
                <p className="text-sm font-semibold text-brand-ink">
                  {t.name}
                </p>
                <p className="text-xs text-brand-muted">{t.role}</p>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// CTA final
// ─────────────────────────────────────────────────────────────────────────
function CTAFinal() {
  return (
    <section className="bg-neutral-50 px-5 py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl bg-brand-gradient p-10 text-center text-white shadow-cardHover md:p-14">
        <h2 className="text-3xl font-bold leading-tight md:text-4xl">
          Empezá ahora.
        </h2>
        <p className="max-w-xl text-base text-white/90">
          Si sos afiliado/a a APOPS y todavía no tenés cuenta, registrate en 2
          minutos. Si no estás afiliado/a, te guiamos en el proceso.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/registrarse"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-white px-6 text-sm font-bold uppercase tracking-wider text-brand-deep shadow-card transition hover:-translate-y-0.5 hover:shadow-cardHover"
          >
            Registrarme →
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-white/10 px-6 text-sm font-bold uppercase tracking-wider text-white ring-2 ring-white/30 backdrop-blur-sm transition hover:bg-white/20"
          >
            Probar la demo
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────
function Faq() {
  const items = [
    {
      q: '¿Tengo que descargar algo?',
      a: 'No. Es una PWA — funciona en cualquier navegador (Chrome, Safari, Firefox). Si querés, podés "agregarla a la pantalla de inicio" desde tu celular y queda como un ícono de app, pero no pasa por Play Store ni App Store.',
    },
    {
      q: '¿Y si me olvido la clave?',
      a: 'Con un click pedís un magic link a tu email y entrás sin clave. Después podés crear una nueva desde Mi perfil.',
    },
    {
      q: '¿Cómo se actualiza?',
      a: 'Sola. Cada vez que abrís la app, automáticamente carga la última versión. No hay que esperar updates ni hacer nada.',
    },
    {
      q: '¿Mis datos están seguros?',
      a: 'Sí. Las claves se guardan con hash bcrypt estándar de industria, las consultas a la base están protegidas por reglas de acceso por rol (RLS), y todo viaja por HTTPS. Cada afiliado solo ve sus propios datos y los de su grupo familiar — nunca los de otros.',
    },
    {
      q: '¿Qué pasa si no estoy en el padrón?',
      a: 'La app te ofrece dos caminos claros: solicitar acceso (si sos afiliado/a pero hubo un desfasaje administrativo) o iniciar la afiliación online completa, con firma digital incluida.',
    },
  ]
  return (
    <section id="faq" className="bg-white px-5 py-20">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
            Preguntas frecuentes
          </span>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-brand-ink md:text-4xl">
            Lo que más nos preguntan.
          </h2>
        </header>
        <div className="flex flex-col gap-2">
          {items.map((it, i) => (
            <details
              key={it.q}
              className="group rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-100 transition hover:ring-brand-blue/20"
              open={i === 0}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-semibold text-brand-ink marker:hidden [&::-webkit-details-marker]:hidden">
                {it.q}
                <span
                  aria-hidden
                  className="text-brand-blue transition group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-brand-muted">
                {it.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────
function FooterSec() {
  return (
    <footer className="bg-brand-deep px-5 py-12 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Logo as="onBlue" width={140} />
            <p className="mt-4 max-w-xs text-sm text-white/80">
              La plataforma digital del gremio APOPS — Asociación del Personal
              de los Organismos de Previsión Social.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/70">
              Sede central
            </h3>
            <p className="mt-3 text-sm text-white/90">
              Viamonte 1654, CABA<br />
              (011) 5544-8300
            </p>
            <a
              href="mailto:apops@apops.org.ar"
              className="mt-2 inline-block text-sm text-white/90 underline-offset-4 hover:underline"
            >
              apops@apops.org.ar
            </a>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/70">
              Acceso rápido
            </h3>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-white/90">
              <li>
                <Link href="/" className="hover:underline">
                  Entrar a la app
                </Link>
              </li>
              <li>
                <Link href="/registrarse" className="hover:underline">
                  Crear cuenta
                </Link>
              </li>
              <li>
                <Link href="/afiliarse" className="hover:underline">
                  Afiliarme a APOPS
                </Link>
              </li>
              <li>
                <Link href="/noticias" className="hover:underline">
                  Novedades
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/60">
          © {new Date().getFullYear()} APOPS — Asociación del Personal de los
          Organismos de Previsión Social. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Iconos
// ─────────────────────────────────────────────────────────────────────────
function CredencialIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h4M7 14h6" strokeLinecap="round" />
      <circle cx="16" cy="11" r="1.5" fill="currentColor" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2zM10 21a2 2 0 004 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" aria-hidden>
      <path d="M5 12l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
