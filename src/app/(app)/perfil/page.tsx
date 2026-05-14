import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { AppShell } from '@/components/app/AppShell'
import { EnablePushButton } from '@/components/notif/EnablePushButton'

export const metadata: Metadata = {
  title: 'Mi perfil',
  description: 'Información de tu cuenta y sesión.',
}

const tipoLabel = { activo: 'Trabajador activo', jubilado: 'Jubilado' } as const
const rolLabel = {
  afiliado: 'Afiliado',
  delegado: 'Delegado',
  admin: 'Administrador',
} as const

function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const at = email.indexOf('@')
  if (at <= 0) return email
  const name = email.slice(0, at)
  const domain = email.slice(at + 1)
  const head = name.slice(0, 1)
  const masked = '*'.repeat(Math.max(name.length - 1, 1))
  return `${head}${masked}@${domain}`
}

export default async function PerfilPage({
  searchParams,
}: {
  searchParams?: { clave?: string }
}) {
  const session = await requireRole('afiliado')

  const flashClaveOk = searchParams?.clave === 'ok'

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="perfil">
      <div className="flex flex-col gap-6">
        {flashClaveOk && (
          <div
            role="status"
            className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200"
          >
            ✓ Tu clave fue actualizada.
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-brand-ink">Mis datos</h2>
          <dl className="flex flex-col gap-3 text-base">
            <Field label="Nombre" value={session.nombre} />
            <Field label="DNI" value={session.dni} />
            {session.legajo && <Field label="Legajo" value={session.legajo} />}
            <Field label="Tipo de afiliación" value={tipoLabel[session.tipo]} />
            <Field label="Rol" value={rolLabel[session.rol]} />
            <Field label="Email" value={maskEmail(session.email)} />
          </dl>
        </section>

        <section>
          <Link
            href="/perfil/clave"
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
              >
                <KeyIcon />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-brand-ink">
                  Cambiar mi clave
                </span>
                <span className="text-xs text-brand-muted">
                  Actualizá tu contraseña de acceso
                </span>
              </div>
            </div>
            <span aria-hidden className="text-brand-blue">→</span>
          </Link>
        </section>

        <section>
          <EnablePushButton />
        </section>

        <section>
          <LogoutButton />
        </section>

        <p className="text-center text-xs text-brand-muted">
          Si necesitás cambiar tu email, contactá a la Secretaría.
        </p>
      </div>
    </AppShell>
  )
}

function KeyIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11l9-9M16 6l3 3M14 8l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-brand-muted">{label}</dt>
      <dd className="text-brand-ink">{value}</dd>
    </div>
  )
}
