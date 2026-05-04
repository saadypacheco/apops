import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/role'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { AppShell } from '@/components/app/AppShell'

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

export default async function PerfilPage() {
  const session = await requireRole('afiliado')

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="perfil">
      <div className="flex flex-col gap-6">
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
          <LogoutButton />
        </section>

        <p className="text-center text-xs text-brand-muted">
          Si necesitás cambiar tu email, contactá a la Secretaría.
        </p>
      </div>
    </AppShell>
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
