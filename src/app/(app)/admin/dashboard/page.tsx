import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { ArgentinaMap } from '@/components/admin/ArgentinaMap'
import {
  getAppVsPadron,
  getComisionDirectiva,
  getDistribucionApops,
  getEvolucion,
  getSnapshots,
  type Bucket,
} from '@/lib/admin/dashboard-queries'

export const metadata: Metadata = {
  title: 'Dashboard CD',
}

const MESES = [
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

function periodoLabel(year: number, month: number): string {
  return `${MESES[month - 1]} ${year}`
}

function pct(part: number, total: number): string {
  if (total === 0) return '0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

function numero(n: number): string {
  return n.toLocaleString('es-AR')
}

// =====================================================================
// Página
// =====================================================================

export default async function DashboardPage() {
  const session = await requireRole('admin')
  const admin = createAdminClient()

  const snaps = await getSnapshots(admin)
  if (snaps.length === 0) {
    return (
      <AppShell nombre={session.nombre} rol={session.rol} current="admin">
        <EmptyState />
      </AppShell>
    )
  }

  const current = snaps[0]!
  const previous = snaps[1] ?? null

  const [distribucion, cd, app, evolucion] = await Promise.all([
    getDistribucionApops(admin, current.id),
    getComisionDirectiva(admin, current.id),
    getAppVsPadron(admin, current.id, current.total_apops),
    previous ? getEvolucion(admin, current.id, previous.id) : Promise.resolve(null),
  ])

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <Link
            href="/admin"
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            ← Volver al panel
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-brand-ink">
            Dashboard Comisión Directiva
          </h1>
          <p className="text-sm text-brand-muted">
            Padrón {periodoLabel(current.periodo_year, current.periodo_month)} ·
            {' '}
            {numero(current.total_filas)} cotizantes ·{' '}
            <strong className="text-brand-ink">{numero(current.total_apops)} APOPS</strong>
            {previous && (
              <>
                {' '}· comparando contra{' '}
                {periodoLabel(previous.periodo_year, previous.periodo_month)}
              </>
            )}
          </p>
        </header>

        {/* Bloque 1 — Resumen del padrón */}
        <Block titulo="Resumen del padrón">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <BigStat label="Cotizantes" value={current.total_filas} primary />
            <BigStat
              label="APOPS"
              value={current.total_apops}
              of={current.total_filas}
            />
            <BigStat label="Delegados" value={current.total_delegados} />
            <BigStat
              label="Planta Permanente"
              value={current.total_planta_perm}
              of={current.total_filas}
            />
            <BigStat
              label="Planta Transitoria"
              value={current.total_planta_trans}
              of={current.total_filas}
            />
            <BigStat
              label="Solo papel"
              value={current.total_papel}
              hint="Jubilados que siguen afiliados"
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <SmallStat
              label="ATE"
              value={current.total_ate}
              of={current.total_filas}
            />
            <SmallStat
              label="UPCN"
              value={current.total_upcn}
              of={current.total_filas}
            />
            <SmallStat
              label="SECASFPI"
              value={current.total_secasfpi}
              of={current.total_filas}
            />
          </div>
        </Block>

        {/* Bloque 2 — Evolución vs mes anterior */}
        {evolucion && previous && (
          <Block
            titulo={`Cambios desde ${periodoLabel(previous.periodo_year, previous.periodo_month)}`}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DeltaStat
                label="Altas reales"
                value={evolucion.altasReales}
                tone="positive"
                hint={`${evolucion.altasApops} APOPS`}
              />
              <DeltaStat
                label="Bajas reales"
                value={evolucion.bajasReales}
                tone="negative"
                hint={`${evolucion.bajasApops} APOPS`}
              />
              <DeltaStat
                label="Cambios categoría"
                value={evolucion.cambiosCategoria}
                tone="neutral"
              />
              <DeltaStat
                label="Cambios gremio"
                value={evolucion.cambiosGremio}
                tone="neutral"
              />
              <DeltaStat
                label="Cambios delegado"
                value={evolucion.cambiosDelegado}
                tone="neutral"
              />
            </div>
          </Block>
        )}

        {!previous && (
          <Block titulo="Cambios mes vs mes">
            <p className="text-sm text-brand-muted">
              Cargá un segundo padrón para ver altas, bajas y cambios reales
              entre meses.
            </p>
          </Block>
        )}

        {/* Bloque 3 — Distribución APOPS */}
        <Block titulo={`Distribución APOPS (${numero(distribucion.totalApops)} afiliados)`}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-brand-ink">
                Mapa por provincia
              </h3>
              <ArgentinaMap
                data={distribucion.porProvinciaMap}
                label="APOPS"
              />
              <p className="text-xs text-brand-muted">
                Pasá el cursor por encima de una provincia para ver el conteo.
                CABA aparece como punto sobre Buenos Aires.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Distribucion
                titulo="Por edificio (top 10)"
                buckets={distribucion.porEdificio}
                total={distribucion.totalApops}
              />
              <Distribucion
                titulo="Por provincia (top 8)"
                buckets={distribucion.porProvincia}
                total={distribucion.totalApops}
              />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Distribucion
              titulo="Tipo de planta"
              buckets={[
                { label: 'Permanente', count: distribucion.porPlanta.pp },
                { label: 'Transitoria', count: distribucion.porPlanta.pt },
                { label: 'Sin dato', count: distribucion.porPlanta.sin },
              ]}
              total={distribucion.totalApops}
            />
            <Distribucion
              titulo="Sexo"
              buckets={[
                { label: 'Mujer', count: distribucion.porSexo.mujer },
                { label: 'Varón', count: distribucion.porSexo.varon },
                { label: 'Otro', count: distribucion.porSexo.otro },
                { label: 'Sin dato', count: distribucion.porSexo.sin },
              ]}
              total={distribucion.totalApops}
            />
            <Distribucion
              titulo="Edad"
              buckets={[
                { label: 'Menos de 30', count: distribucion.porEdad.lt30 },
                { label: '30–40', count: distribucion.porEdad.r30_40 },
                { label: '40–50', count: distribucion.porEdad.r40_50 },
                { label: '50–60', count: distribucion.porEdad.r50_60 },
                { label: '60 o más', count: distribucion.porEdad.gte60 },
                { label: 'Sin dato', count: distribucion.porEdad.sin },
              ]}
              total={distribucion.totalApops}
            />
          </div>
          {distribucion.porCategoria.length > 0 && (
            <div className="mt-6">
              <Distribucion
                titulo="Categorías"
                buckets={distribucion.porCategoria}
                total={distribucion.totalApops}
                compact
              />
            </div>
          )}
        </Block>

        {/* Bloque 4 — Comisión Directiva */}
        <Block titulo="Comisión Directiva">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BigStat label="Delegados activos" value={cd.totalDelegados} />
            <BigStat
              label="Mandatos vencen 30 días"
              value={cd.mandatosVencen30.length}
              warn={cd.mandatosVencen30.length > 0}
            />
            <BigStat
              label="Edificios sin delegado"
              value={cd.edificiosSinDelegado.length}
              warn={cd.edificiosSinDelegado.length > 0}
              hint="con APOPS pero ningún delegado asignado"
            />
          </div>

          {cd.mandatosVencen30.length > 0 && (
            <details className="mt-4 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
              <summary className="cursor-pointer text-sm font-semibold text-amber-900">
                Mandatos que vencen en 30 días ({cd.mandatosVencen30.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs">
                {cd.mandatosVencen30.map((m, i) => (
                  <li key={i} className="text-amber-900">
                    <strong>{m.nombre}</strong> · L-{m.legajo}
                    {m.edificio && <span> · {m.edificio}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {cd.edificiosSinDelegado.length > 0 && (
            <details className="mt-3 rounded-lg bg-white p-3 ring-1 ring-neutral-200">
              <summary className="cursor-pointer text-sm font-semibold text-brand-ink">
                Edificios APOPS sin delegado ({cd.edificiosSinDelegado.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-brand-muted">
                {cd.edificiosSinDelegado.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </Block>

        {/* Bloque 5 — App vs Padrón */}
        <Block titulo="App APOPS vs padrón">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BigStat
              label="Registrados app"
              value={app.totalAfiliadosApp}
              primary
            />
            <BigStat label="Activos" value={app.totalActivos} />
            <BigStat
              label="% Adopción"
              value={app.porcentajeAdopcion}
              suffix="%"
              hint={`sobre ${numero(app.totalApopsEnPadron)} APOPS`}
            />
            <BigStat
              label="Engagement 30d"
              value={app.engaged30d}
              of={app.totalActivos}
              hint="ingresaron en los últimos 30 días"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SmallStat
              label="Solicitudes de acceso pendientes"
              value={app.pendientesAcceso}
              warn={app.pendientesAcceso > 0}
            />
            <SmallStat
              label="Afiliaciones online pendientes"
              value={app.pendientesAfiliacion}
              warn={app.pendientesAfiliacion > 0}
            />
          </div>
        </Block>
      </div>
    </AppShell>
  )
}

// =====================================================================
// Subcomponentes
// =====================================================================

function Block({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-brand-ink">{titulo}</h2>
      <div className="rounded-2xl bg-white p-5 shadow-card">{children}</div>
    </section>
  )
}

function BigStat({
  label,
  value,
  of,
  hint,
  primary,
  warn,
  suffix,
}: {
  label: string
  value: number
  of?: number
  hint?: string
  primary?: boolean
  warn?: boolean
  suffix?: string
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-brand-muted">
        {label}
      </span>
      <span
        className={
          primary
            ? 'text-2xl font-bold text-brand-blue'
            : warn
              ? 'text-2xl font-bold text-amber-700'
              : 'text-2xl font-bold text-brand-ink'
        }
      >
        {numero(value)}
        {suffix}
        {of !== undefined && (
          <span className="ml-1 text-xs font-normal text-brand-muted">
            ({pct(value, of)})
          </span>
        )}
      </span>
      {hint && <span className="text-xs text-brand-muted">{hint}</span>}
    </div>
  )
}

function SmallStat({
  label,
  value,
  of,
  warn,
}: {
  label: string
  value: number
  of?: number
  warn?: boolean
}) {
  return (
    <div className="flex flex-col rounded-lg bg-neutral-50 p-3">
      <span className="text-xs text-brand-muted">{label}</span>
      <span
        className={
          warn
            ? 'text-lg font-semibold text-amber-700'
            : 'text-lg font-semibold text-brand-ink'
        }
      >
        {numero(value)}
        {of !== undefined && (
          <span className="ml-1 text-xs font-normal text-brand-muted">
            ({pct(value, of)})
          </span>
        )}
      </span>
    </div>
  )
}

function DeltaStat({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: number
  tone: 'positive' | 'negative' | 'neutral'
  hint?: string
}) {
  const cls =
    tone === 'positive'
      ? 'text-emerald-700'
      : tone === 'negative'
        ? 'text-red-700'
        : 'text-brand-ink'
  const prefix = tone === 'positive' ? '+' : tone === 'negative' ? '−' : '±'
  return (
    <div className="flex flex-col rounded-lg bg-neutral-50 p-3">
      <span className="text-xs text-brand-muted">{label}</span>
      <span className={`text-xl font-bold ${cls}`}>
        {prefix}
        {numero(value)}
      </span>
      {hint && <span className="text-xs text-brand-muted">{hint}</span>}
    </div>
  )
}

function Distribucion({
  titulo,
  buckets,
  total,
  compact = false,
}: {
  titulo: string
  buckets: Bucket[]
  total: number
  compact?: boolean
}) {
  if (buckets.length === 0) {
    return (
      <div className="text-sm text-brand-muted">
        Sin datos para {titulo.toLowerCase()}.
      </div>
    )
  }
  const max = Math.max(...buckets.map((b) => b.count))
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-brand-ink">{titulo}</h3>
      <ul className={compact ? 'grid grid-cols-2 gap-x-4 gap-y-1' : 'space-y-2'}>
        {buckets.map((b) => (
          <li key={b.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-brand-ink">{b.label}</span>
              <span className="text-brand-muted">
                <strong className="text-brand-ink">{numero(b.count)}</strong>{' '}
                ({pct(b.count, total)})
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-neutral-100"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-brand-blue"
                style={{ width: `${(b.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin"
        className="text-sm font-medium text-brand-blue hover:underline"
      >
        ← Volver al panel
      </Link>
      <div className="rounded-2xl bg-white p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-brand-ink">
          Dashboard Comisión Directiva
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          Todavía no se cargó ningún padrón. Subí el primero para empezar a
          ver métricas.
        </p>
        <Link
          href="/admin/padron"
          className="mt-4 inline-block rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
        >
          Cargar padrón
        </Link>
      </div>
    </div>
  )
}
