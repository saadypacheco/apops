import Link from 'next/link'
import type { Rol } from '@/lib/auth/role'

// Layout común para las pantallas autenticadas: header con saludo + nav
// inferior con accesos rápidos. Mobile-first.

type Props = {
  children: React.ReactNode
  nombre: string
  rol: Rol
  /** ruta activa (para resaltar el item del nav) */
  current: 'home' | 'perfil' | 'admin' | 'delegados'
}

const roleLabel: Record<Rol, string> = {
  afiliado: 'Afiliado',
  delegado: 'Delegado',
  admin: 'Administrador',
}

export function AppShell({ children, nombre, rol, current }: Props) {
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
          <Link
            href="/perfil"
            aria-label="Ir a mi perfil"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg font-semibold text-white hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {initials(nombre)}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-5 py-6">
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
            href="/perfil"
            label="Perfil"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
            }
            active={current === 'perfil'}
          />
        </div>
      </nav>
    </div>
  )
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
}) {
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
