import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/landing/Logo'
import { InstallPWAButton } from '@/components/landing/InstallPWAButton'

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
      <Funcionalidades />
      <ComoFunciona />
      <Capturas />
      <DashboardCapturas />
      <ComoInstalar />
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
          <a href="#faq" className="hover:text-brand-blue">
            Preguntas
          </a>
          <a href="#instalar" className="hover:text-brand-blue">
            Instalar
          </a>
        </div>
        <div className="flex items-center gap-2">
          <InstallPWAButton variant="compact" label="📱 Instalar" />
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-full bg-btn-primary px-4 text-xs font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover"
          >
            Entrar →
          </Link>
        </div>
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
          APOPS Siempre
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
          Tu gremio en el bolsillo de cada afiliado.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 md:text-lg">
          Credencial digital, comunicación bidireccional, afiliación online con
          firma, dashboard de Comisión Directiva con el padrón ANSES vivo.
          Pensada para servir a dos públicos: los <strong>afiliados APOPS</strong> con
          login completo, y <strong>toda la comunidad ANSES</strong> con
          noticias del gremio y afiliación online — todo público, sin barrera.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <InstallPWAButton variant="onBlue" label="📱 Instalar la app" />
          <Link
            href="/"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full bg-white/10 px-6 text-sm font-bold uppercase tracking-wider text-white ring-2 ring-white/30 backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
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
          Sin descargas pesadas. Sin Play Store ni App Store. La app se
          instala directo desde el navegador.
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Cómo instalar (sección dedicada)
// ─────────────────────────────────────────────────────────────────────────
function ComoInstalar() {
  return (
    <section
      id="instalar"
      className="bg-gradient-to-b from-white to-neutral-50 px-5 py-16 md:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
            Instalación
          </span>
          <h2 className="mt-2 text-3xl font-bold text-brand-ink md:text-4xl">
            Una sola vez. Después, un toque.
          </h2>
          <p className="mt-3 text-base text-brand-muted">
            Instalá APOPS Siempre desde tu navegador. Queda con su propio
            ícono en la pantalla de inicio y se abre como cualquier otra
            aplicación.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <InstallStep
            num="1"
            titulo="Abrí la app desde el navegador"
            descripcion="Entrá a apops.vercel.app en Safari (iPhone), Chrome (Android) o cualquier navegador moderno (desktop)."
          />
          <InstallStep
            num="2"
            titulo="Tocá 'Instalar app'"
            descripcion="En esta misma página tenés un botón verde. En Android dispara la instalación directa, en iPhone te muestra los pasos para usar Compartir → Agregar a Inicio."
          />
          <InstallStep
            num="3"
            titulo="Listo, queda en tu home"
            descripcion="El ícono APOPS aparece como cualquier otra app. Click → se abre en pantalla completa, sin barra de URL."
          />
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <InstallPWAButton variant="primary" label="📱 Instalar APOPS Siempre" />
          <p className="text-xs text-brand-muted">
            ¿Ya la instalaste antes? El botón te avisa con un ✓.
          </p>
        </div>
      </div>
    </section>
  )
}

function InstallStep({
  num,
  titulo,
  descripcion,
}: {
  num: string
  titulo: string
  descripcion: string
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-base font-bold text-white"
      >
        {num}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-brand-ink">{titulo}</h3>
      <p className="mt-2 text-sm text-brand-muted">{descripcion}</p>
    </div>
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
        'Gestión profesional: solicitudes con firma digital, novedades publicables, cotizantes por sector, mensajería interna entre admin, delegados y afiliados.',
      bullets: [
        'Delegado: vista completa del edificio con buscador y filtros por gremio',
        'Identificación inmediata de no-afiliados para invitarlos',
        'Hilos de comunicación bidireccionales 1-a-1',
      ],
    },
    {
      icon: <SignatureIcon />,
      title: 'Afiliación online con PDF firmado',
      desc:
        'Aspirantes completan una ficha guiada en 3 pasos, firman digital con el dedo o el mouse, y reciben el PDF por mail. APOPS y el delegado del edificio reciben copia automática.',
      bullets: [
        'Wizard 3 pasos: obligatorios → opcionales → resumen + firma',
        'PDF generado server-side con los datos + firma embedida',
        'Notificación automática al delegado del edificio declarado',
      ],
    },
    {
      icon: <DashboardIcon />,
      title: 'Dashboard de Comisión Directiva',
      desc:
        'Métricas vivas del gremio: cotizantes por edificio, gremio, provincia, planta. Evolución mes a mes, altas y bajas accionables, eventos del mes (cumpleaños / aniversarios).',
      bullets: [
        'Carga mensual del padrón ANSES desde Excel, histórico preservado',
        'Mapa de Argentina con choropleth + heatmap edificios × dimensiones',
        'KPIs vs objetivos + delta mes anterior',
      ],
    },
    {
      icon: <MetricsIcon />,
      title: 'Termómetro del gremio (Tab Uso)',
      desc:
        'Tablero de adopción y comunicación en vivo. Saben quién usa la app, qué tasa de lectura tienen las notificaciones que mandan, qué delegados están comprometidos y cuántos no entran hace un mes. Decisiones con datos, no con intuición.',
      bullets: [
        'Embudo de adopción: padrón → cuenta → activo → activo + recibió notif',
        'Tasa de lectura de notificaciones (afiliados y delegados, por separado)',
        'Top delegados activos + lista accionable de inactivos a contactar',
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
// Capturas — mocks visuales detallados de cada pantalla. No son screenshots
// reales pero replican el contenido y estilo de la app para dar vida real
// a la sección sin tener que tomar fotos.
// ─────────────────────────────────────────────────────────────────────────
function Capturas() {
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

        <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2">
          <MockCard
            label="Credencial digital"
            desc="El afiliado ve su credencial al instante. Tabs por miembro de la familia."
          >
            <MockFeed />
          </MockCard>
          <MockCard
            label="Afiliación online con firma"
            desc="Wizard 3 pasos: obligatorios, opcionales colapsados, resumen + firma."
          >
            <MockAfiliacion />
          </MockCard>
          <MockCard
            label="Compartir por WhatsApp"
            desc="Un toque, mensaje pre-cargado, link público al destinatario."
          >
            <MockCompartir />
          </MockCard>
          <MockCard
            label="Panel de administración"
            desc="Solicitudes con firma digital. Aprobar / rechazar auditado."
          >
            <MockAdmin />
          </MockCard>
          <MockCard
            label="Dashboard CD — Resumen"
            desc="KPIs vs objetivos, delta mes anterior, donut de gremios."
          >
            <MockDashboard />
          </MockCard>
          <MockCard
            label="Evolución por gremio"
            desc="Línea por gremio en los últimos meses + tabla de altas/bajas APOPS."
          >
            <MockEvolucion />
          </MockCard>
          <MockCard
            label="Eventos del mes"
            desc="Cumpleaños y aniversarios APOPS con plantillas WhatsApp listas para enviar."
          >
            <MockEventos />
          </MockCard>
          <MockCard
            label="Carga del padrón ANSES"
            desc="Subís el Excel mensual, se procesa con dedup, auto-baja y notif a delegados."
          >
            <MockCargaPadron />
          </MockCard>
          <MockCard
            label="Panel de delegados"
            desc="Cotizantes a tu cargo y mensajería directa con la Comisión Directiva."
          >
            <MockDelegados />
          </MockCard>
        </div>

        <p className="mt-10 text-center text-sm text-white/80">
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

// Wrapper de cada card de mock
function MockCard({
  label,
  desc,
  children,
}: {
  label: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
      <div className="overflow-hidden rounded-xl bg-[#f8faf6] p-3 shadow-cardHover">
        <div className="aspect-[9/16] overflow-hidden">{children}</div>
      </div>
      <div>
        <h4 className="text-sm font-semibold">{label}</h4>
        <p className="mt-0.5 text-xs leading-snug text-white/80">{desc}</p>
      </div>
    </div>
  )
}

// Mock 1 — Pantalla principal con credencial digital
function MockFeed() {
  return (
    <div className="flex h-full flex-col gap-2 text-[10px] text-brand-ink">
      {/* Header */}
      <div className="-mx-3 -mt-3 bg-brand-gradient px-3 pb-3 pt-3 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-widest text-white/80">
              APOPS · Afiliado
            </p>
            <p className="text-sm font-bold leading-tight">¡Hola, María!</p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold">
            MP
          </div>
        </div>
      </div>

      {/* Tabs de credenciales */}
      <div className="flex gap-1.5 px-0.5">
        <span className="rounded-full bg-brand-blue px-2 py-0.5 text-[8px] font-bold text-white">
          Yo
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-medium text-brand-ink ring-1 ring-neutral-200">
          Carlos
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-medium text-brand-ink ring-1 ring-neutral-200">
          Juan
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-medium text-brand-ink ring-1 ring-neutral-200">
          Laura
        </span>
      </div>

      {/* Card credencial titular */}
      <div className="relative flex flex-col gap-1.5 rounded-xl bg-gradient-to-br from-brand-blue via-brand-deep to-brand-navy p-2.5 text-white shadow-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[7px] font-bold uppercase tracking-widest text-white/70">
              APOPS · Credencial
            </p>
            <p className="text-[8px] font-bold uppercase tracking-wider">
              Afiliado Titular
            </p>
          </div>
          <div className="h-5 w-5 rounded-full bg-[#7FCFE5]/30" />
        </div>
        <div className="mt-1">
          <p className="text-[7px] uppercase text-white/60">Nombre</p>
          <p className="text-sm font-bold leading-tight">Pérez, María</p>
        </div>
        <div>
          <p className="text-[7px] uppercase text-white/60">Nº afiliado</p>
          <p className="font-mono text-[10px] font-semibold">L-0001</p>
        </div>
        <div>
          <p className="text-[7px] uppercase text-white/60">DNI</p>
          <p className="font-mono text-[10px] font-semibold">30.000.001</p>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="mt-auto flex justify-around border-t border-neutral-200 pt-1.5">
        <div className="flex flex-col items-center text-brand-blue">
          <div className="h-3 w-3 rounded-sm bg-current" />
          <span className="text-[7px] font-bold">Inicio</span>
        </div>
        <div className="flex flex-col items-center text-brand-muted">
          <div className="h-3 w-3 rounded-full bg-current opacity-60" />
          <span className="text-[7px]">Novedades</span>
        </div>
        <div className="flex flex-col items-center text-brand-muted">
          <div className="h-3 w-3 rounded-full bg-current opacity-60" />
          <span className="text-[7px]">Perfil</span>
        </div>
      </div>
    </div>
  )
}

// Mock 2 — Compartir credencial
function MockCompartir() {
  return (
    <div className="flex h-full flex-col gap-2 text-[10px] text-brand-ink">
      <div className="-mx-3 -mt-3 bg-brand-gradient px-3 pb-3 pt-3 text-white">
        <p className="text-sm font-bold">Compartir credencial</p>
        <p className="text-[8px] text-white/80">Carlos · Cónyuge</p>
      </div>

      {/* Mini credencial preview */}
      <div className="flex flex-col gap-1 rounded-lg bg-gradient-to-br from-brand-blue to-brand-navy p-2 text-white">
        <p className="text-[7px] font-bold uppercase tracking-wider">
          Adherente
        </p>
        <p className="text-[10px] font-bold">Pérez, Carlos</p>
        <p className="font-mono text-[8px]">DNI 32.000.001</p>
      </div>

      {/* Mensaje pre-cargado */}
      <div className="rounded-lg bg-white p-2 ring-1 ring-neutral-200">
        <p className="text-[7px] uppercase text-brand-muted">Mensaje</p>
        <p className="mt-0.5 text-[9px] leading-relaxed text-brand-ink">
          Hola Carlos, te comparto tu credencial APOPS:
          apops.vercel.app/credencial-publica/...
        </p>
      </div>

      {/* Botones de compartir */}
      <button className="flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] py-2 text-[10px] font-bold text-white">
        <span aria-hidden>📱</span> WhatsApp
      </button>
      <div className="grid grid-cols-2 gap-1.5">
        <button className="flex items-center justify-center gap-1 rounded-lg border-2 border-brand-blue py-1.5 text-[9px] font-bold text-brand-blue">
          <span aria-hidden>✉</span> Email
        </button>
        <button className="flex items-center justify-center gap-1 rounded-lg border-2 border-brand-blue py-1.5 text-[9px] font-bold text-brand-blue">
          <span aria-hidden>📞</span> Llamar
        </button>
      </div>

      <p className="mt-1 text-center text-[8px] text-brand-muted">
        Vas a poder elegir el contacto en WhatsApp.
      </p>
    </div>
  )
}

// Mock 3 — Panel admin
function MockAdmin() {
  return (
    <div className="flex h-full flex-col gap-1.5 text-[10px] text-brand-ink">
      <div className="-mx-3 -mt-3 bg-brand-gradient px-3 pb-3 pt-3 text-white">
        <p className="text-[8px] uppercase tracking-widest text-white/80">
          APOPS · Admin
        </p>
        <p className="text-sm font-bold">¡Hola, Lucía!</p>
      </div>

      {/* Atajos */}
      <div className="flex items-center justify-between rounded-lg bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-brand-blue/20" />
          <span className="text-[9px] font-bold">Novedades</span>
        </div>
        <span className="text-brand-blue">→</span>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-brand-blue/20" />
          <span className="text-[9px] font-bold">Mensajes delegados</span>
        </div>
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-900">
          2
        </span>
      </div>

      {/* Listado solicitudes */}
      <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-brand-muted">
        Solicitudes de afiliación · 3
      </p>
      <div className="flex flex-col gap-1 rounded-lg bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold">Fernández, Mariana</span>
          <span className="rounded-full bg-brand-blue/10 px-1.5 py-0 text-[7px] font-bold text-brand-blue">
            Permanente
          </span>
        </div>
        <span className="text-[8px] text-brand-muted">DNI 32.500.100 · L-2025-001</span>
        <div className="mt-1 flex gap-1">
          <button className="flex-1 rounded bg-brand-blue py-1 text-[8px] font-bold text-white">
            Aprobar
          </button>
          <button className="rounded border border-brand-blue/30 px-2 py-1 text-[8px] font-bold text-brand-blue">
            Rechazar
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 rounded-lg bg-white p-1.5 ring-1 ring-neutral-200 opacity-70">
        <span className="text-[9px] font-bold">Rojas, Esteban</span>
        <span className="text-[8px] text-brand-muted">DNI 38.900.250 · L-2025-007</span>
      </div>
    </div>
  )
}

// Mock 4 — Panel delegados
function MockDelegados() {
  return (
    <div className="flex h-full flex-col gap-1.5 text-[10px] text-brand-ink">
      <div className="-mx-3 -mt-3 bg-brand-gradient px-3 pb-3 pt-3 text-white">
        <p className="text-[8px] uppercase tracking-widest text-white/80">
          APOPS · Delegado
        </p>
        <p className="text-sm font-bold">¡Hola, Lucía!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1">
        <div className="rounded-lg bg-white p-1.5 text-center ring-1 ring-neutral-200">
          <p className="text-base font-bold leading-none text-brand-ink">12</p>
          <p className="mt-0.5 text-[7px] font-medium uppercase tracking-wider text-brand-muted">
            Cotizantes
          </p>
        </div>
        <div className="rounded-lg bg-white p-1.5 text-center ring-1 ring-neutral-200">
          <p className="text-base font-bold leading-none text-emerald-700">9</p>
          <p className="mt-0.5 text-[7px] font-medium uppercase tracking-wider text-brand-muted">
            APOPS
          </p>
        </div>
        <div className="rounded-lg bg-white p-1.5 text-center ring-1 ring-neutral-200">
          <p className="text-base font-bold leading-none text-amber-700">3</p>
          <p className="mt-0.5 text-[7px] font-medium uppercase tracking-wider text-brand-muted">
            No afiliados
          </p>
        </div>
        <div className="rounded-lg bg-white p-1.5 text-center ring-1 ring-neutral-200">
          <p className="text-base font-bold leading-none text-cyan-700">2</p>
          <p className="mt-0.5 text-[7px] font-medium uppercase tracking-wider text-brand-muted">
            Papel
          </p>
        </div>
      </div>

      {/* Lista de cotizantes */}
      <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-brand-muted">
        Mis cotizantes
      </p>
      <div className="flex items-center justify-between rounded-lg bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold">Pérez, María</span>
          <span className="text-[8px] text-brand-muted">L-0001</span>
        </div>
        <span className="rounded-full bg-emerald-100 px-1.5 py-0 text-[7px] font-bold text-emerald-800">
          APOPS
        </span>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold">Rodríguez, Ana</span>
          <span className="text-[8px] text-brand-muted">Jubilada</span>
        </div>
        <span className="rounded-full bg-cyan-100 px-1.5 py-0 text-[7px] font-bold text-cyan-800">
          Papel
        </span>
      </div>

      {/* Form mensaje a CD */}
      <div className="mt-1 rounded-lg bg-white p-1.5 ring-1 ring-neutral-200">
        <p className="text-[8px] font-bold">Escribirle a la CD</p>
        <div className="mt-1 h-3 rounded bg-neutral-100" />
        <button className="mt-1 w-full rounded bg-brand-blue py-1 text-[8px] font-bold text-white">
          Enviar
        </button>
      </div>
    </div>
  )
}

// Mock 5 — Wizard de afiliación online
function MockAfiliacion() {
  return (
    <div className="flex h-full flex-col gap-1.5 text-[10px] text-brand-ink">
      <div className="-mx-3 -mt-3 bg-brand-gradient px-3 pb-2 pt-3 text-white">
        <p className="text-[8px] uppercase tracking-widest text-white/80">
          APOPS · Afiliate
        </p>
        <p className="text-sm font-bold leading-tight">Ficha de afiliación</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 px-0.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-blue text-[8px] font-bold text-white">
          1
        </span>
        <span className="h-px flex-1 bg-brand-blue" />
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-blue text-[8px] font-bold text-white">
          2
        </span>
        <span className="h-px flex-1 bg-neutral-300" />
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-[8px] font-bold text-brand-muted">
          3
        </span>
      </div>
      <p className="text-center text-[8px] font-bold uppercase tracking-wider text-brand-muted">
        Paso 2 de 3 · Más datos
      </p>

      {/* Banner "todo opcional" */}
      <div className="rounded-md border border-dashed border-brand-blue/40 bg-brand-blue/5 p-1.5 text-[8px] leading-tight text-brand-ink">
        <strong>Todo lo de este paso es opcional.</strong> La CD lo completa
        desde el padrón si lo dejás vacío.
      </div>

      {/* Details colapsables */}
      <div className="rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-semibold">Datos personales adicionales</span>
          <span className="text-brand-muted">▾</span>
        </div>
      </div>
      <div className="rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-semibold">Domicilio</span>
          <span className="text-brand-muted">▾</span>
        </div>
      </div>
      <div className="rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-semibold">Datos familiares</span>
          <span className="rounded-full bg-neutral-100 px-1.5 text-[7px] uppercase tracking-wide text-brand-muted">
            Opcional
          </span>
        </div>
      </div>

      {/* Nav */}
      <div className="mt-auto flex items-center justify-between gap-1">
        <button className="rounded border border-brand-blue/40 px-2 py-1 text-[8px] font-bold text-brand-blue">
          ← Atrás
        </button>
        <button className="rounded bg-brand-blue px-2 py-1 text-[8px] font-bold text-white">
          Ir al resumen →
        </button>
      </div>
    </div>
  )
}

// Mock 6 — Dashboard CD
function MockDashboard() {
  return (
    <div className="flex h-full flex-col gap-1.5 text-[10px] text-brand-ink">
      <div className="-mx-3 -mt-3 bg-brand-gradient px-3 pb-2 pt-3 text-white">
        <p className="text-[8px] uppercase tracking-widest text-white/80">
          APOPS · CD
        </p>
        <p className="text-sm font-bold leading-tight">Dashboard</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-0.5">
        <span className="rounded bg-brand-blue px-1.5 py-0.5 text-[7px] font-bold text-white">
          Resumen
        </span>
        <span className="rounded bg-white px-1.5 py-0.5 text-[7px] font-medium text-brand-ink ring-1 ring-neutral-200">
          Padrón
        </span>
        <span className="rounded bg-white px-1.5 py-0.5 text-[7px] font-medium text-brand-ink ring-1 ring-neutral-200">
          Evolución
        </span>
      </div>

      {/* KPI cards 2x2 */}
      <div className="grid grid-cols-2 gap-1">
        <div className="rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
          <p className="text-[7px] text-brand-muted">Cotizantes</p>
          <p className="text-sm font-bold text-brand-ink">4 631</p>
          <p className="text-[7px] font-semibold text-emerald-700">
            ▲ 1.2% vs abr
          </p>
        </div>
        <div className="rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
          <p className="text-[7px] text-brand-muted">APOPS</p>
          <p className="text-sm font-bold text-brand-ink">2 184</p>
          <p className="text-[7px] font-semibold text-emerald-700">
            ▲ 0.8% vs abr
          </p>
        </div>
        <div className="rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
          <p className="text-[7px] text-brand-muted">Delegados</p>
          <p className="text-sm font-bold text-brand-ink">38</p>
          <p className="text-[7px] font-semibold text-amber-700">
            5 mandatos por vencer
          </p>
        </div>
        <div className="rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
          <p className="text-[7px] text-brand-muted">Adopción app</p>
          <p className="text-sm font-bold text-brand-ink">62%</p>
          <p className="text-[7px] font-semibold text-brand-blue">
            Objetivo 70%
          </p>
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="mt-auto rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
        <p className="text-[7px] font-bold uppercase tracking-wide text-brand-muted">
          Altas / Bajas (mes)
        </p>
        <div className="mt-1 flex items-end gap-0.5 h-6">
          {[3, 5, 4, 7, 6, 8, 5].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-brand-blue/70"
              style={{ height: `${h * 12}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Mock — Dashboard tab Evolución: line chart por gremio
function MockEvolucion() {
  return (
    <div className="flex h-full flex-col gap-1.5 text-[10px] text-brand-ink">
      <div className="-mx-3 -mt-3 bg-brand-gradient px-3 pb-2 pt-3 text-white">
        <p className="text-[8px] uppercase tracking-widest text-white/80">
          APOPS · CD · Evolución
        </p>
        <p className="text-sm font-bold leading-tight">Padrón mes a mes</p>
      </div>

      {/* Chart */}
      <div className="rounded-md bg-white p-2 ring-1 ring-neutral-200">
        <svg viewBox="0 0 100 50" className="h-16 w-full" aria-hidden>
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="35" x2="100" y2="35" stroke="#e5e7eb" strokeWidth="0.3" />
          <line x1="0" y1="20" x2="100" y2="20" stroke="#e5e7eb" strokeWidth="0.3" />
          {/* APOPS */}
          <polyline
            points="0,30 25,28 50,25 75,22 100,18"
            fill="none"
            stroke="#1f72b8"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* ATE */}
          <polyline
            points="0,38 25,36 50,37 75,35 100,34"
            fill="none"
            stroke="#10b981"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="2,1"
          />
          {/* UPCN */}
          <polyline
            points="0,42 25,42 50,41 75,42 100,43"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="1,1"
          />
        </svg>
        <div className="mt-1 flex flex-wrap gap-2 text-[7px]">
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-2 bg-brand-blue" /> APOPS
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-2 bg-emerald-500" /> ATE
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-2 bg-amber-500" /> UPCN
          </span>
        </div>
      </div>

      {/* Mini tabla altas/bajas */}
      <div className="mt-auto rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
        <p className="text-[7px] font-bold uppercase tracking-wide text-brand-muted">
          APOPS — últimos meses
        </p>
        <table className="mt-1 w-full text-[8px]">
          <thead>
            <tr className="text-brand-muted">
              <th className="text-left font-medium">Mes</th>
              <th className="text-right font-medium">▲</th>
              <th className="text-right font-medium">▼</th>
              <th className="text-right font-medium">Neto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mar</td>
              <td className="text-right text-emerald-700">+18</td>
              <td className="text-right text-red-600">−4</td>
              <td className="text-right font-bold">+14</td>
            </tr>
            <tr>
              <td>Abr</td>
              <td className="text-right text-emerald-700">+22</td>
              <td className="text-right text-red-600">−6</td>
              <td className="text-right font-bold">+16</td>
            </tr>
            <tr>
              <td>May</td>
              <td className="text-right text-emerald-700">+27</td>
              <td className="text-right text-red-600">−5</td>
              <td className="text-right font-bold">+22</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Mock 9 — Dashboard tab Eventos: cumpleaños del mes + plantilla WhatsApp
function MockEventos() {
  return (
    <div className="flex h-full flex-col gap-1.5 text-[10px] text-brand-ink">
      <div className="-mx-3 -mt-3 bg-brand-gradient px-3 pb-2 pt-3 text-white">
        <p className="text-[8px] uppercase tracking-widest text-white/80">
          APOPS · CD · Eventos
        </p>
        <p className="text-sm font-bold leading-tight">🎂 Mayo 2026</p>
      </div>

      {/* Cumpleaños */}
      <p className="text-[7px] font-bold uppercase tracking-wide text-brand-muted">
        Cumpleaños · 12
      </p>
      <div className="flex items-center justify-between rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🎂</span>
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] font-bold">Pérez, María Ana</span>
            <span className="text-[7px] text-brand-muted">14 may · UDAI Once</span>
          </div>
        </div>
        <button className="rounded-full bg-[#25D366] px-1.5 py-0.5 text-[7px] font-bold text-white">
          WhatsApp
        </button>
      </div>
      <div className="flex items-center justify-between rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🎂</span>
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] font-bold">Rojas, Esteban</span>
            <span className="text-[7px] text-brand-muted">19 may · CABA Centro</span>
          </div>
        </div>
        <button className="rounded-full bg-[#25D366] px-1.5 py-0.5 text-[7px] font-bold text-white">
          WhatsApp
        </button>
      </div>

      {/* Aniversarios */}
      <p className="mt-1 text-[7px] font-bold uppercase tracking-wide text-brand-muted">
        Aniversarios APOPS · 4
      </p>
      <div className="flex items-center justify-between rounded-md bg-white p-1.5 ring-1 ring-neutral-200">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🎉</span>
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] font-bold">García, Lucía</span>
            <span className="text-[7px] text-brand-muted">10 años · 22 may</span>
          </div>
        </div>
        <button className="rounded-full bg-[#25D366] px-1.5 py-0.5 text-[7px] font-bold text-white">
          WhatsApp
        </button>
      </div>

      {/* Plantilla preview */}
      <div className="mt-auto rounded-md bg-emerald-50 p-1.5 ring-1 ring-emerald-200">
        <p className="text-[7px] font-bold text-emerald-900">
          Plantilla precargada
        </p>
        <p className="mt-0.5 text-[8px] leading-snug text-emerald-900">
          ¡Feliz cumpleaños, María! Te saluda la Comisión Directiva de APOPS…
        </p>
      </div>
    </div>
  )
}

// Mock 10 — Carga del padrón ANSES (upload Excel + stats)
function MockCargaPadron() {
  return (
    <div className="flex h-full flex-col gap-1.5 text-[10px] text-brand-ink">
      <div className="-mx-3 -mt-3 bg-brand-gradient px-3 pb-2 pt-3 text-white">
        <p className="text-[8px] uppercase tracking-widest text-white/80">
          APOPS · Admin
        </p>
        <p className="text-sm font-bold leading-tight">Padrón ANSES</p>
      </div>

      {/* Upload box */}
      <div className="rounded-md border-2 border-dashed border-brand-blue/40 bg-brand-blue/5 p-2 text-center">
        <p className="text-base">📤</p>
        <p className="mt-0.5 text-[8px] font-bold text-brand-blue">
          Subí el Excel mensual
        </p>
        <p className="text-[7px] text-brand-muted">XLSX / hoja única</p>
      </div>

      {/* Resumen carga */}
      <div className="rounded-md bg-emerald-50 p-1.5 ring-1 ring-emerald-200">
        <p className="text-[7px] font-bold text-emerald-900">
          ✓ Última carga: Mayo 2026
        </p>
        <div className="mt-1 grid grid-cols-3 gap-1 text-center">
          <div>
            <p className="text-[10px] font-bold text-emerald-900">15 558</p>
            <p className="text-[6px] uppercase text-emerald-800">filas</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-900">+27</p>
            <p className="text-[6px] uppercase text-emerald-800">altas</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-900">−5</p>
            <p className="text-[6px] uppercase text-emerald-800">bajas</p>
          </div>
        </div>
      </div>

      {/* Historial snapshots */}
      <p className="text-[7px] font-bold uppercase tracking-wide text-brand-muted">
        Snapshots
      </p>
      <div className="flex flex-col gap-0.5">
        {['May 2026', 'Abr 2026', 'Mar 2026', 'Feb 2026'].map((mes, i) => (
          <div
            key={mes}
            className="flex items-center justify-between rounded bg-white px-1.5 py-0.5 text-[8px] ring-1 ring-neutral-200"
          >
            <span className="font-medium">{mes}</span>
            <span className="text-brand-muted">
              {i === 0 ? '15 558' : i === 1 ? '15 536' : i === 2 ? '15 520' : '15 502'}
            </span>
          </div>
        ))}
      </div>

      {/* Notif auto */}
      <div className="mt-auto rounded-md bg-amber-50 p-1.5 ring-1 ring-amber-200">
        <p className="text-[7px] leading-snug text-amber-900">
          🔔 38 delegados notificados automáticamente de altas/bajas en sus
          edificios.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Capturas reales del Dashboard CD (screenshots de producción)
// ─────────────────────────────────────────────────────────────────────────
function DashboardCapturas() {
  const shots = [
    {
      src: '/imagenes para software/dashboard5.PNG',
      alt: 'Login de la app — pantalla de acceso',
      caption: 'Acceso a la app',
      desc: 'La pantalla que ve cualquier afiliado al entrar: noticias, ingreso con DNI o legajo, instalación en un toque.',
    },
    {
      src: '/imagenes para software/dashboard4.PNG',
      alt: 'Panel del delegado — vista del edificio con buscador',
      caption: 'Vista del delegado',
      desc: 'Todas las personas del edificio con buscador y filtros por gremio (APOPS, otros, sin gremio).',
    },
    {
      src: '/imagenes para software/dashboard1.PNG',
      alt: 'Dashboard CD — vista del padrón en mapa',
      caption: 'Padrón en mapa',
      desc: 'Distribución geográfica con choropleth + heatmap edificios × dimensiones.',
    },
    {
      src: '/imagenes para software/dashboard2.PNG',
      alt: 'Dashboard CD — vista de evolución y métricas',
      caption: 'Evolución y métricas',
      desc: 'Series por gremio, KPIs vs objetivos y delta mes anterior.',
    },
    {
      src: '/imagenes para software/dashboard3.PNG',
      alt: 'Dashboard CD — vista de delegados y eventos',
      caption: 'Delegados y eventos',
      desc: 'Mandatos por vencer, edificios sin delegado, eventos APOPS del mes.',
    },
  ]
  return (
    <section className="bg-neutral-50 px-5 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
            Pantallas reales
          </span>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-brand-ink md:text-4xl">
            Capturas del producto en vivo.
          </h2>
          <p className="mt-3 text-base text-brand-muted">
            Desde el login del afiliado hasta el dashboard de Comisión
            Directiva, con datos del padrón ANSES real.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shots.map((s) => (
            <figure
              key={s.src}
              className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition hover:shadow-cardHover"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.src}
                  alt={s.alt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <figcaption className="flex flex-col gap-1 p-4">
                <h3 className="text-base font-bold text-brand-ink">
                  {s.caption}
                </h3>
                <p className="text-sm leading-relaxed text-brand-muted">
                  {s.desc}
                </p>
              </figcaption>
            </figure>
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
          <InstallPWAButton variant="onBlue" label="📱 Instalar la app" />
          <Link
            href="/registrarse"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-white/10 px-6 text-sm font-bold uppercase tracking-wider text-white ring-2 ring-white/30 backdrop-blur-sm transition hover:bg-white/20"
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
      q: '¿Y si me olvido la clave?',
      a: 'Con un click pedís un magic link a tu email y entrás sin clave. Después podés crear una nueva desde Mi perfil.',
    },
    {
      q: '¿Mis datos están seguros?',
      a: 'Sí. Las claves se guardan con hash bcrypt estándar de industria, las consultas a la base están protegidas por reglas de acceso por rol (RLS), y todo viaja por HTTPS. Cada afiliado solo ve sus propios datos y los de su grupo familiar — nunca los de otros.',
    },
    {
      q: '¿Qué pasa si no estoy en el padrón?',
      a: 'La app te ofrece dos caminos claros: solicitar acceso (si sos afiliado/a pero hubo un desfasaje administrativo) o iniciar la afiliación online completa, con firma digital incluida.',
    },
    {
      q: '¿Cómo es la afiliación online?',
      a: 'Es un wizard de 3 pasos. Paso 1 son los datos mínimos obligatorios (legajo, apellido y nombre, DNI, celular, email, edificio donde trabajás). Paso 2 son datos opcionales agrupados en secciones colapsables (domicilio, datos familiares, etc.). Paso 3 muestra un resumen de todo lo cargado, te pide la autorización del 3% y firmás digital con el dedo o el mouse.',
    },
    {
      q: '¿Llega algo por mail después de afiliarme?',
      a: 'Sí. Al enviar, el sistema genera un PDF con todos tus datos y tu firma embedida, y lo manda automáticamente a tres destinatarios: a vos (acuse de recibo + comprobante para tus registros), a apops@apops.org.ar (para que la Comisión Directiva lo procese) y a el/los delegado(s) del edificio que declaraste (para que estén en conocimiento). Todo en el mismo momento del envío.',
    },
    {
      q: '¿Cómo se actualiza la app?',
      a: 'Sola. Cada vez que abrís la app, automáticamente carga la última versión. No hay que esperar updates ni hacer nada.',
    },
    {
      q: '¿Cómo se instala en mi celular?',
      a: 'En Android (Chrome) tocás "Instalar app" y se instala automáticamente. En iPhone (Safari) tocás Compartir → Agregar a pantalla de inicio. En cualquier caso el botón "📱 Instalar app" de esta página te guía. No pasa por Play Store ni App Store — queda como un ícono más en tu pantalla de inicio.',
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

function SignatureIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <path d="M3 17c4-1 6-7 9-7s2 5 5 5 4-2 4-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 14l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="10" r="0.5" fill="currentColor" />
    </svg>
  )
}

function MetricsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
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
