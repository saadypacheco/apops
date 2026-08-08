import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { LineChart } from '@/components/admin/LineChart'
import { AltasBajasList } from '@/components/admin/AltasBajasList'
import { EventosList } from '@/components/admin/EventosList'
import {
  getAltasYBajas,
  getEventosDelMes,
  getSnapshots,
} from '@/lib/admin/dashboard-queries'
import {
  getEvolucionEdificio,
  getOtrosGremios,
  getStatsEdificio,
} from '@/lib/delegados/panel-queries'
import { getCotizantesRepresentados } from '@/lib/delegados/queries'

export const metadata: Metadata = {
  title: 'Mi edificio',
}

export default async function MiEdificioPage() {
  const session = await requireRole('delegado')

  const [stats, evolucion, gremios] = await Promise.all([
    getStatsEdificio(session.nombre),
    getEvolucionEdificio(session.nombre),
    getOtrosGremios(session.nombre),
  ])

  // Variación contra el mes anterior, para el "+15 afiliaciones" del panel.
  const ultimo = evolucion[evolucion.length - 1]?.afiliados ?? 0
  const previo = evolucion[evolucion.length - 2]?.afiliados ?? ultimo
  const variacion = ultimo - previo

  const admin = createAdminClient()
  const snapshots = await getSnapshots(admin)
  const actual = snapshots[0] ?? null
  const anterior = snapshots[1] ?? null

  // Eventos del mes acotados a los representados APOPS del delegado.
  const { cotizantes: representados } = await getCotizantesRepresentados(
    session.nombre,
  )
  const legajos = new Set(
    representados.map((c) => c.legajo).filter((l): l is string => !!l),
  )
  const eventos = actual
    ? await getEventosDelMes(admin, actual.id, undefined, legajos)
    : null

  // Altas y bajas del edificio, todos los gremios.
  const edificiosSet = new Set(stats.edificios)
  const altasBajas =
    actual && anterior ? await getAltasYBajas(admin, actual.id, anterior.id) : null
  const altas =
    altasBajas?.altas.filter((p) => p.edificio && edificiosSet.has(p.edificio)) ??
    []
  const bajas =
    altasBajas?.bajas.filter((p) => p.edificio && edificiosSet.has(p.edificio)) ??
    []

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="edificio">
      <div className="flex flex-col gap-5 pb-4">
        <header>
          <h1 className="text-2xl font-semibold text-brand-ink">Mi edificio</h1>
          <p className="text-sm text-brand-muted">
            {stats.edificios.length === 0
              ? 'Sin edificio asignado'
              : stats.edificios.join(' · ')}
          </p>
        </header>

        {stats.edificios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
            No figurás como representante de ningún edificio en el padrón.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3">
              <StatCard label="Empleados" valor={stats.empleados} tone="neutral" />
              <StatCard
                label="Afiliados APOPS"
                valor={stats.afiliadosApops}
                tone="success"
              />
              <StatCard
                label="No afiliados"
                valor={stats.noAfiliados}
                tone="warn"
                hint="Oportunidades de afiliación"
              />
              <StatCard
                label="Otros gremios"
                valor={stats.otrosGremios}
                tone="info"
              />
            </section>

            {evolucion.length > 1 && (
              <section className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-card">
                <header className="flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold text-brand-ink">
                    Variación mensual
                  </h2>
                  <span
                    className={
                      'text-sm font-bold ' +
                      (variacion > 0
                        ? 'text-emerald-700'
                        : variacion < 0
                          ? 'text-red-600'
                          : 'text-brand-muted')
                    }
                  >
                    {variacion > 0 ? '+' : ''}
                    {variacion} afiliaciones
                  </span>
                </header>
                <LineChart
                  data={evolucion.map((p) => ({
                    x: p.periodo,
                    values: { afiliados: p.afiliados },
                  }))}
                  series={[
                    {
                      key: 'afiliados',
                      label: 'Afiliados APOPS',
                      color: '#1D6FB8',
                    },
                  ]}
                  height={160}
                />
              </section>
            )}

            {gremios.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                  Otros gremios en el edificio
                </h2>
                <ul className="flex flex-col gap-2">
                  {gremios.map((g) => (
                    <li
                      key={g.gremio}
                      className="flex items-center justify-between rounded-xl bg-white p-3 shadow-card"
                    >
                      <span className="text-sm font-semibold text-brand-ink">
                        {g.gremio}
                      </span>
                      <span className="text-sm text-brand-muted">
                        {g.empleados}{' '}
                        {g.empleados === 1 ? 'empleado' : 'empleados'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {eventos &&
              (eventos.cumpleanos.length > 0 ||
                eventos.aniversarios.length > 0) && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                    Eventos de {eventos.mesLabel}
                  </h2>
                  <EventosList
                    mesLabel={eventos.mesLabel}
                    cumpleanos={eventos.cumpleanos}
                    aniversarios={eventos.aniversarios}
                  />
                </section>
              )}

            {(altas.length > 0 || bajas.length > 0) && (
              <section className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                  Altas y bajas
                </h2>
                <p className="text-xs text-brand-muted">
                  Quiénes entraron o salieron del edificio comparando el padrón
                  actual contra el anterior. Incluye todos los gremios.
                </p>
                <AltasBajasList altas={altas} bajas={bajas} />
              </section>
            )}

            {/* El desglose por sector (Administración, Sistemas, Trámites…)
                está pendiente: el Excel del padrón de ANSES no trae esa
                columna. Ver RESUME.md. */}
            <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs text-brand-muted">
              El desglose por sector va a estar disponible cuando el padrón
              del Ministerio incluya esa información.
            </p>
          </>
        )}
      </div>
    </AppShell>
  )
}

function StatCard({
  label,
  valor,
  tone,
  hint,
}: {
  label: string
  valor: number
  tone: 'neutral' | 'success' | 'warn' | 'info'
  hint?: string
}) {
  const toneClass = {
    neutral: 'text-brand-ink',
    success: 'text-emerald-700',
    warn: 'text-amber-700',
    info: 'text-cyan-700',
  }[tone]

  return (
    <div className="rounded-xl bg-white p-3 shadow-card">
      <p className={'text-2xl font-bold leading-tight ' + toneClass}>{valor}</p>
      <p className="mt-0.5 text-xs font-medium text-brand-ink">{label}</p>
      {hint && <p className="text-[11px] text-brand-muted">{hint}</p>}
    </div>
  )
}
