import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { PadronUploadForm } from '@/components/admin/PadronUploadForm'

export const metadata: Metadata = {
  title: 'Padrón ANSES — admin',
}

function formatPeriodo(year: number, month: number): string {
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  return `${meses[month - 1]} ${year}`
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminPadronPage() {
  const session = await requireRole('admin')
  const admin = createAdminClient()

  const { data: snapshots } = await admin
    .from('padron_snapshots')
    .select(
      'id, periodo_label, periodo_year, periodo_month, importado_at, archivo_nombre, total_filas, total_apops, total_ate, total_upcn, total_secasfpi, total_planta_perm, total_planta_trans, total_papel, total_delegados',
    )
    .order('periodo_year', { ascending: false })
    .order('periodo_month', { ascending: false })

  const ultimo = snapshots?.[0] ?? null
  const historico = snapshots?.slice(1) ?? []

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-brand-blue hover:underline"
            >
              ← Volver al panel
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-brand-ink">
              Padrón ANSES
            </h1>
            <p className="mt-1 text-sm text-brand-muted">
              Carga mensual del padrón. Cada Excel se preserva como snapshot
              histórico para que la Comisión Directiva pueda comparar mes a mes.
            </p>
          </div>
        </header>

        <PadronUploadForm />

        {ultimo && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-brand-ink">
              Último snapshot — {formatPeriodo(ultimo.periodo_year, ultimo.periodo_month)}
            </h2>
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <header className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-brand-muted">
                  Importado {formatFecha(ultimo.importado_at)}
                </span>
                <span className="text-xs text-brand-muted">
                  {ultimo.archivo_nombre ?? '—'}
                </span>
              </header>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Stat label="Cotizantes" value={ultimo.total_filas} primary />
                <Stat label="APOPS" value={ultimo.total_apops} />
                <Stat label="ATE" value={ultimo.total_ate} />
                <Stat label="UPCN" value={ultimo.total_upcn} />
                <Stat label="SECASFPI" value={ultimo.total_secasfpi} />
                <Stat label="Delegados" value={ultimo.total_delegados} />
                <Stat label="Planta Perm." value={ultimo.total_planta_perm} />
                <Stat label="Planta Trans." value={ultimo.total_planta_trans} />
                <Stat label="Solo papel" value={ultimo.total_papel} />
              </dl>
            </div>
          </section>
        )}

        {historico.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-brand-ink">
              Historial ({historico.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {historico.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-brand-ink">
                      {formatPeriodo(s.periodo_year, s.periodo_month)}
                    </span>
                    <span className="text-xs text-brand-muted">
                      {formatFecha(s.importado_at)} ·{' '}
                      {s.total_filas.toLocaleString('es-AR')} filas
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
                    <span>
                      <strong className="text-brand-ink">{s.total_apops}</strong> APOPS
                    </span>
                    <span>
                      <strong className="text-brand-ink">{s.total_ate}</strong> ATE
                    </span>
                    <span>
                      <strong className="text-brand-ink">{s.total_delegados}</strong> delegados
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!ultimo && (
          <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
            Todavía no se cargó ningún padrón. Subí el primer Excel arriba.
          </section>
        )}
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
      <dt className="text-xs uppercase tracking-wide text-brand-muted">
        {label}
      </dt>
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
