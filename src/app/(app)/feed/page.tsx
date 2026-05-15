import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { CredencialCarousel } from '@/components/credencial/CredencialCarousel'
import { getCredencialesParaTitular } from '@/lib/credencial/queries'

export const metadata: Metadata = {
  title: 'Inicio',
}

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  const h = headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

export default async function FeedPage() {
  const session = await requireRole('afiliado')

  const credenciales = await getCredencialesParaTitular(session)
  const baseUrl = getBaseUrl()

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="home">
      <div className="flex flex-col gap-6">
        <section aria-label="Mi credencial" className="flex flex-col gap-3">
          <header className="flex items-end justify-between">
            <h2 className="text-lg font-semibold text-brand-ink">
              Mi credencial
            </h2>
            <span className="text-xs text-brand-muted">
              {credenciales.length === 1
                ? 'Solo titular'
                : `Vos y ${credenciales.length - 1} adherente${credenciales.length - 1 > 1 ? 's' : ''}`}
            </span>
          </header>
          <CredencialCarousel
            credenciales={credenciales}
            baseUrl={baseUrl}
          />
        </section>
      </div>
    </AppShell>
  )
}
