import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { CredencialCarousel } from '@/components/credencial/CredencialCarousel'
import { getCredencialesParaTitular } from '@/lib/credencial/queries'

export const metadata: Metadata = {
  title: 'Mi Credencial — APOPS',
}

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  const h = headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

export default async function CredencialPage() {
  const session = await requireRole('afiliado')
  const credenciales = await getCredencialesParaTitular(session)
  const baseUrl = getBaseUrl()

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="home">
      <div className="flex flex-col gap-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-brand-ink">
              Mi credencial
            </h1>
            <p className="text-sm text-brand-muted">
              {credenciales.length === 1
                ? 'Tu credencial digital'
                : `Vos y ${credenciales.length - 1} adherente${credenciales.length - 1 > 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href="/feed"
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            ← Volver
          </Link>
        </header>

        <CredencialCarousel
          credenciales={credenciales}
          baseUrl={baseUrl}
        />
      </div>
    </AppShell>
  )
}
