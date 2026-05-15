import Link from 'next/link'
import type { Rol } from '@/lib/auth/role'
import { RoleSwitcherSlot } from './RoleSwitcherSlot'
import { WhatsAppFab } from './WhatsAppFab'
import { CampanaSlot } from './CampanaSlot'
import { NavBadgeNotif } from './NavBadgeNotif'
import { InstallPWAButton } from '@/components/landing/InstallPWAButton'

// Layout común para las pantallas autenticadas: header con saludo + nav
// inferior con accesos rápidos. Mobile-first.

type Props = {
  children: React.ReactNode
  nombre: string
  rol: Rol
  /** ruta activa (para resaltar el item del nav) */
  current:
    | 'home'
    | 'novedades'
    | 'notificaciones'
    | 'perfil'
    | 'admin'
    | 'delegados'
  /** Si true, el contenido se expande hasta max-w-7xl en desktop.
   *  Mobile sigue siendo max-w-md. Para páginas tipo dashboard con sidebar. */
  wide?: boolean
}

const roleLabel: Record<Rol, string> = {
  afiliado: 'Afiliado',
  delegado: 'Delegado',
  admin: 'Administrador',
}

export function AppShell({ children, nombre, rol, current, wide }: Props) {
  const mainMaxW = wide ? 'md:max-w-7xl' : 'md:max-w-md'
  const homeHref =
    rol === 'admin' ? '/admin' : rol === 'delegado' ? '/delegados' : '/feed'

  return (
    <div className="flex min-h-screen flex-col bg-[#f8faf6]">
      <header className="bg-brand-gradient px-5 pt-8 pb-6 text-white shadow-card">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-white/80">
              APOPS Siempre · {roleLabel[rol]}
            </span>
            <h1 className="text-2xl font-semibold">¡Hola, {firstName(nombre)}!</h1>
          </div>
          <div className="flex items-center gap-2">
            <RoleSwitcherSlot />
            <CampanaSlot />
            <Link
              href="/perfil"
              aria-label="Ir a mi perfil"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg font-semibold text-white hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {initials(nombre)}
            </Link>
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full max-w-md ${mainMaxW} flex-1 px-5 py-6`}>
        {children}
      </main>

      <nav
        aria-label="Navegación principal"
        className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white"
      >
        <div className="mx-auto flex max-w-md justify-around">
          <NavItem
            href={homeHref}
            label="Inicio"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <path d="M3 12l9-9 9 9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            active={current === 'home' || current === 'admin' || current === 'delegados'}
          />
          <NavItem
            href="/novedades"
            label="Novedades"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <path d="M11 5L6 9H3v6h3l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round" />
                <path d="M19.07 4.93a10 10 0 010 14.14" strokeLinecap="round" />
              </svg>
            }
            active={current === 'novedades'}
          />
          <NavItem
            href="/perfil"
            label="Mi perfil"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
            }
            active={current === 'perfil'}
          />
          <NavItem
            href="/notificaciones"
            label="Notificaciones"
            icon={
              <span className="relative inline-flex">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 17a3 3 0 006 0" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <NavBadgeNotif />
              </span>
            }
            active={current === 'notificaciones'}
          />
        </div>
      </nav>

      <WhatsAppFab nombre={nombre} rol={rol} />
      <InstallPWAButton variant="fab-stacked" />
    </div>
  )
}

function NavItem({
  href,
  label,
  icon,
  active,
  disabled = false,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        title={`${label} (próximamente)`}
        className="flex flex-1 cursor-not-allowed flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-brand-muted opacity-60"
      >
        {icon}
        <span>{label}</span>
      </span>
    )
  }
  return (
    <Link
      href={href}
      className={
        'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ' +
        (active
          ? 'text-brand-teal'
          : 'text-brand-muted hover:text-brand-ink')
      }
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

function firstName(nombre: string): string {
  // Padrón viene como "Apellido, Nombres" — tomamos el primer nombre.
  const parts = nombre.split(',')
  if (parts.length === 2) {
    const nombres = parts[1]?.trim().split(/\s+/) ?? []
    return nombres[0] ?? nombre
  }
  return nombre.split(/\s+/)[0] ?? nombre
}

function initials(nombre: string): string {
  const parts = nombre.split(',')
  if (parts.length === 2) {
    const ape = parts[0]?.trim()[0] ?? ''
    const nom = parts[1]?.trim()[0] ?? ''
    return (nom + ape).toUpperCase() || '··'
  }
  const tokens = nombre.split(/\s+/)
  return ((tokens[0]?.[0] ?? '') + (tokens[1]?.[0] ?? '')).toUpperCase() || '··'
}
