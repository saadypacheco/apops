import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'

export const metadata: Metadata = {
  title: 'Inicio',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function FeedPage() {
  const session = await requireRole('afiliado')

  const supabase = createClient()
  type NoticiaRow = {
    id: string
    titulo: string
    resumen: string
    publicada_at: string
    autor: string | null
    destacada: boolean
  }
  // Cast por mismatch entre supabase-js 2.45 y el types.ts generado por CLI más nuevo.
  const { data: noticias } = (await supabase
    .from('noticias')
    .select('id, titulo, resumen, publicada_at, autor, destacada')
    .eq('publicada', true)
    .order('publicada_at', { ascending: false })
    .limit(10)) as { data: NoticiaRow[] | null }

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="home">
      <div className="flex flex-col gap-6">
        <section
          aria-label="Accesos rápidos"
          className="grid grid-cols-3 gap-3"
        >
          <QuickAction
            href="/perfil"
            label="Mi perfil"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
              </svg>
            }
          />
          <QuickAction
            href="#"
            label="Credencial"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M7 10h4M7 14h6" strokeLinecap="round" />
              </svg>
            }
            disabled
          />
          <QuickAction
            href="#"
            label="Consultas"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4M12 18h.01" strokeLinecap="round" />
              </svg>
            }
            disabled
          />
        </section>

        <section aria-label="Novedades" className="flex flex-col gap-3">
          <header className="flex items-end justify-between">
            <h2 className="text-lg font-semibold text-brand-ink">Novedades</h2>
            <span className="text-xs text-brand-muted">
              {noticias?.length ?? 0} publicadas
            </span>
          </header>

          {(!noticias || noticias.length === 0) && (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
              Todavía no hay noticias publicadas.
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {noticias?.map((n) => (
              <li
                key={n.id}
                className={
                  'flex flex-col gap-2 rounded-xl bg-white p-4 shadow-card ' +
                  (n.destacada ? 'ring-2 ring-brand-lime' : '')
                }
              >
                <header className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-brand-ink">
                    {n.titulo}
                  </h3>
                  {n.destacada && (
                    <span className="shrink-0 rounded-full bg-brand-lime/15 px-2 py-0.5 text-xs font-semibold text-brand-deep">
                      ⭐ Destacada
                    </span>
                  )}
                </header>
                <p className="text-sm text-brand-muted">{n.resumen}</p>
                <footer className="mt-1 flex items-center justify-between text-xs text-brand-muted">
                  <span>{n.autor ?? 'APOPS'}</span>
                  <time dateTime={n.publicada_at}>
                    {formatDate(n.publicada_at)}
                  </time>
                </footer>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  )
}

function QuickAction({
  href,
  label,
  icon,
  disabled = false,
}: {
  href: string
  label: string
  icon: React.ReactNode
  disabled?: boolean
}) {
  const className =
    'flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white p-3 text-xs font-medium shadow-card text-brand-ink ' +
    (disabled
      ? 'opacity-60 cursor-not-allowed'
      : 'hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal')
  if (disabled) {
    return (
      <div className={className} aria-disabled>
        <span className="text-brand-teal">{icon}</span>
        <span>{label}</span>
        <span className="text-[10px] uppercase tracking-wide text-brand-muted">
          Próximamente
        </span>
      </div>
    )
  }
  return (
    <Link href={href} className={className}>
      <span className="text-brand-teal">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
