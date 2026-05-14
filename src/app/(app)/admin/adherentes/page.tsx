import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { AdherentesUploadForm } from '@/components/admin/AdherentesUploadForm'

export const metadata: Metadata = {
  title: 'Adherentes — admin',
}

export default async function AdminAdherentesPage() {
  const session = await requireRole('admin')
  const admin = createAdminClient()

  // Stats agregadas
  const { count: total } = await admin
    .from('padron_adherentes')
    .select('id', { count: 'exact', head: true })

  // Por vínculo
  const { data: muestraData } = await admin
    .from('padron_adherentes')
    .select('vinculo, titular_dni, titular_legajo')
    .limit(2000)
  const muestra = (muestraData ?? []) as Array<{
    vinculo: string
    titular_dni: string | null
    titular_legajo: string | null
  }>
  const porVinculo = new Map<string, number>()
  const titularesSet = new Set<string>()
  for (const m of muestra) {
    porVinculo.set(m.vinculo, (porVinculo.get(m.vinculo) ?? 0) + 1)
    if (m.titular_dni) titularesSet.add(`d:${m.titular_dni}`)
    else if (m.titular_legajo) titularesSet.add(`l:${m.titular_legajo}`)
  }

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-6">
        <header>
          <Link
            href="/admin"
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            ← Volver al panel
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-brand-ink">
            Adherentes
          </h1>
          <p className="mt-1 text-sm text-brand-muted">
            Familiares de cotizantes. Carga independiente del padrón ANSES —
            son data interna del gremio.
          </p>
        </header>

        <AdherentesUploadForm />

        {/* Stats actuales */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-brand-ink">Estado actual</h2>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Adherentes totales" value={total ?? 0} primary />
              <Stat
                label="Titulares con adherentes"
                value={titularesSet.size}
              />
              <Stat label="Cónyuges" value={porVinculo.get('conyuge') ?? 0} />
              <Stat
                label="Hijos/as"
                value={
                  (porVinculo.get('hijo') ?? 0) + (porVinculo.get('hija') ?? 0)
                }
              />
            </dl>
            {muestra.length === 2000 && (
              <p className="mt-2 text-xs text-brand-muted">
                Stats calculadas sobre una muestra de 2000 filas. El total es exacto.
              </p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function Stat({
  label,
  value,
  primary = false,
}: {
  label: string
  value: number
  primary?: boolean
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-brand-muted">{label}</dt>
      <dd
        className={
          primary
            ? 'text-2xl font-bold text-brand-blue'
            : 'text-lg font-semibold text-brand-ink'
        }
      >
        {value.toLocaleString('es-AR')}
      </dd>
    </div>
  )
}
