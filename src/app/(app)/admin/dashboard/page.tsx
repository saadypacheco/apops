import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { AltasBajasList } from '@/components/admin/AltasBajasList'
import { ArgentinaMap } from '@/components/admin/ArgentinaMap'
import { BarChart } from '@/components/admin/BarChart'
import { DashboardSidebar } from '@/components/admin/DashboardSidebar'
import { DonutChart } from '@/components/admin/DonutChart'
import { EventosList } from '@/components/admin/EventosList'
import { HeatmapEdificios } from '@/components/admin/HeatmapEdificios'
import { LineChart, type LinePoint } from '@/components/admin/LineChart'
import { PeriodoSelector } from '@/components/admin/PeriodoSelector'
import {
  DashboardTabs,
  isValidTab,
  type DashboardTab,
} from '@/components/admin/DashboardTabs'
import {
  getAltasBajasPorMes,
  getAltasYBajas,
  getAppVsPadron,
  getComisionDirectiva,
  getDistribucionApops,
  getEventosDelMes,
  getEvolucion,
  getHeatmapEdificios,
  getSnapshots,
  type AltasYBajas,
  type AppVsPadron,
  type Bucket,
  type ComisionDirectiva,
  type DeltaPorMes,
  type DistribucionApops,
  type EventosDelMes,
  type Evolucion,
  type HeatmapEdificioRow,
  type SnapshotMeta,
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

function deltaPct(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// =====================================================================
// Página
// =====================================================================

type SearchParams = { tab?: string; periodo?: string; gremio?: string }

type GremioFiltro = '' | 'apops' | 'ate' | 'upcn' | 'secasfpi' | 'ninguno'

const GREMIO_FILTROS: { key: GremioFiltro; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'apops', label: 'APOPS' },
  { key: 'ate', label: 'ATE' },
  { key: 'upcn', label: 'UPCN' },
  { key: 'secasfpi', label: 'SECASFPI' },
  { key: 'ninguno', label: 'Sin gremio' },
]

function isGremioFiltro(s: string | undefined): s is GremioFiltro {
  return GREMIO_FILTROS.some((g) => g.key === s)
}

type NoticiaResumen = {
  id: string
  titulo: string
  resumen: string | null
  publicada_at: string | null
  autor: string | null
  destacada: boolean | null
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
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

  // Resolver período seleccionado. snaps viene desc (más nuevo primero).
  // Si vino ?periodo=YYYY-MM, encuentro su índice; sino tomo el más reciente.
  let currentIdx = 0
  if (searchParams.periodo) {
    const match = searchParams.periodo.match(/^(\d{4})-(\d{1,2})$/)
    if (match) {
      const y = parseInt(match[1]!, 10)
      const m = parseInt(match[2]!, 10)
      const idx = snaps.findIndex(
        (s) => s.periodo_year === y && s.periodo_month === m,
      )
      if (idx >= 0) currentIdx = idx
    }
  }
  const current = snaps[currentIdx]!
  // "Previous" = el inmediato anterior cronológicamente. Como snaps viene
  // desc, es el del índice +1.
  const previous = snaps[currentIdx + 1] ?? null
  const activeTab: DashboardTab = isValidTab(searchParams.tab)
    ? searchParams.tab
    : 'resumen'
  const gremioFiltro: GremioFiltro = isGremioFiltro(searchParams.gremio)
    ? searchParams.gremio
    : ''

  // Cada tab decide qué queries necesita — evitamos pedir toda la data
  // si la tab no la usa.
  const needsDistribucion = activeTab === 'padron' || activeTab === 'resumen'
  const needsCD = activeTab === 'delegados' || activeTab === 'resumen'
  const needsApp = activeTab === 'app' || activeTab === 'resumen'
  const needsEvolucion = activeTab === 'evolucion' || activeTab === 'resumen'
  const needsAltasBajas = activeTab === 'altas-bajas'
  const needsEventos = activeTab === 'eventos'
  const needsHeatmap = activeTab === 'padron'
  const needsNoticias = activeTab === 'resumen'
  const needsAltasBajasPorMes = activeTab === 'evolucion'

  const [
    distribucion,
    cd,
    app,
    evolucion,
    altasBajas,
    eventos,
    heatmap,
    noticias,
    altasBajasPorMes,
  ] = await Promise.all([
      needsDistribucion
        ? getDistribucionApops(admin, current.id)
        : Promise.resolve(null),
      needsCD ? getComisionDirectiva(admin, current.id) : Promise.resolve(null),
      needsApp
        ? getAppVsPadron(admin, current.id, current.total_apops)
        : Promise.resolve(null),
      needsEvolucion && previous
        ? getEvolucion(admin, current.id, previous.id)
        : Promise.resolve(null),
      needsAltasBajas && previous
        ? getAltasYBajas(admin, current.id, previous.id)
        : Promise.resolve(null),
      needsEventos
        ? getEventosDelMes(admin, current.id)
        : Promise.resolve(null),
      needsHeatmap
        ? getHeatmapEdificios(admin, current.id)
        : Promise.resolve(null),
      needsNoticias
        ? admin
            .from('noticias')
            .select('id, titulo, resumen, publicada_at, autor, destacada')
            .eq('publicada', true)
            .order('publicada_at', { ascending: false })
            .limit(5)
            .then((res) => res.data ?? [])
        : Promise.resolve(null),
      needsAltasBajasPorMes
        ? getAltasBajasPorMes(admin, snaps)
        : Promise.resolve(null),
    ])

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin" wide>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-2">
          <Link
            href="/admin"
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            ← Volver al panel
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-brand-ink">
                Dashboard Comisión Directiva
              </h1>
              <p className="mt-1 text-sm text-brand-muted">
                Padrón {periodoLabel(current.periodo_year, current.periodo_month)}
                {' · '}
                {numero(current.total_filas)} cotizantes ·{' '}
                <strong className="text-brand-ink">
                  {numero(current.total_apops)} APOPS
                </strong>
                {previous && (
                  <>
                    {' · comparando contra '}
                    {periodoLabel(previous.periodo_year, previous.periodo_month)}
                  </>
                )}
              </p>
            </div>
            {snaps.length > 1 && (
              <PeriodoSelector
                value={`${current.periodo_year}-${String(current.periodo_month).padStart(2, '0')}`}
                options={snaps.map((s) => ({
                  periodoYear: s.periodo_year,
                  periodoMonth: s.periodo_month,
                  label: periodoLabel(s.periodo_year, s.periodo_month),
                }))}
              />
            )}
          </div>
        </header>

        {/* Mobile: tabs horizontal. Desktop: el menú vive en el sidebar. */}
        <div className="md:hidden">
          <DashboardTabs active={activeTab} />
        </div>

        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <DashboardSidebar active={activeTab} />

          {/* Contenedor de la tab activa */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {activeTab === 'resumen' && (
            <ResumenTab
              current={current}
              previous={previous}
              evolucion={evolucion}
              app={app}
              cd={cd}
              noticias={(noticias as NoticiaResumen[] | null) ?? []}
            />
          )}
          {activeTab === 'padron' && distribucion && (
            <PadronTab
              distribucion={distribucion}
              current={current}
              heatmap={heatmap}
            />
          )}
          {activeTab === 'evolucion' && (
            <EvolucionTab
              evolucion={evolucion}
              previous={previous}
              current={current}
              snapshots={snaps}
              deltasPorMes={altasBajasPorMes}
            />
          )}
          {activeTab === 'delegados' && cd && <DelegadosTab cd={cd} />}
          {activeTab === 'app' && app && <AppTab app={app} />}
          {activeTab === 'altas-bajas' && (
            <AltasBajasTab
              altasBajas={altasBajas}
              previous={previous}
              current={current}
              gremioFiltro={gremioFiltro}
              periodo={searchParams.periodo}
            />
          )}
          {activeTab === 'eventos' && <EventosTab eventos={eventos} />}

            <DashboardFooter current={current} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function DashboardFooter({ current }: { current: SnapshotMeta }) {
  const fechaCarga = new Date(current.importado_at).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <footer className="mt-4 flex flex-col items-center gap-1 border-t border-neutral-200 py-4 text-xs text-brand-muted">
      <p>
        Última actualización del padrón:{' '}
        <strong className="text-brand-ink">{fechaCarga}</strong>
        {current.archivo_nombre && (
          <span> · {current.archivo_nombre}</span>
        )}
      </p>
      <p className="italic">Unidos somos más fuertes</p>
    </footer>
  )
}

// =====================================================================
// Tabs
// =====================================================================

function ResumenTab({
  current,
  previous,
  evolucion,
  app,
  cd,
  noticias,
}: {
  current: SnapshotMeta
  previous: SnapshotMeta | null
  evolucion: Evolucion | null
  app: AppVsPadron | null
  cd: ComisionDirectiva | null
  noticias: NoticiaResumen[]
}) {
  const prevLabel = previous
    ? `vs ${periodoLabel(previous.periodo_year, previous.periodo_month)}`
    : undefined
  return (
    <>
      {/* KPIs primarios — fila destacada con iconos circulares y delta */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Cotizantes"
          value={current.total_filas}
          icon={<UsersIcon />}
          tone="brand"
          delta={previous ? deltaPct(current.total_filas, previous.total_filas) : undefined}
          deltaLabel={prevLabel}
        />
        <KpiCard
          label="APOPS"
          value={current.total_apops}
          icon={<UnionIcon />}
          tone="success"
          delta={previous ? deltaPct(current.total_apops, previous.total_apops) : undefined}
          deltaLabel={prevLabel}
          hint={`${pct(current.total_apops, current.total_filas)} del padrón`}
        />
        <KpiCard
          label="Delegados"
          value={current.total_delegados}
          icon={<ShieldIcon />}
          tone="purple"
          delta={previous ? deltaPct(current.total_delegados, previous.total_delegados) : undefined}
          deltaLabel={prevLabel}
        />
        <KpiCard
          label="Adopción app"
          value={app?.porcentajeAdopcion ?? 0}
          suffix="%"
          icon={<SmartphoneIcon />}
          tone="amber"
          hint={
            app
              ? `${numero(app.totalAfiliadosApp)} de ${numero(app.totalApopsEnPadron)} APOPS`
              : undefined
          }
          objetivo="70%"
          objetivoMin={70}
        />
      </div>

      <Block titulo="Detalle del padrón">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          </div>
          <p className="mt-3 text-xs text-brand-muted">
            <Link
              href="/admin/dashboard?tab=evolucion"
              className="text-brand-blue hover:underline"
            >
              Ver detalle de evolución →
            </Link>
          </p>
        </Block>
      )}

      {app && (
        <Block titulo="Aplicación APOPS">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BigStat
              label="Registrados"
              value={app.totalAfiliadosApp}
              primary
            />
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
              hint="ingresaron últimos 30d"
            />
            <BigStat
              label="Pendientes"
              value={app.pendientesAcceso + app.pendientesAfiliacion}
              warn={app.pendientesAcceso + app.pendientesAfiliacion > 0}
              hint="acceso + afiliación"
            />
          </div>
        </Block>
      )}

      {cd && (
        <Block titulo="Comisión Directiva (resumen)">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BigStat label="Delegados activos" value={cd.totalDelegados} />
            <BigStat
              label="Mandatos vencen 30d"
              value={cd.mandatosVencen30.length}
              warn={cd.mandatosVencen30.length > 0}
              objetivo="0"
              objetivoMax={0}
            />
            <BigStat
              label="Edificios sin delegado"
              value={cd.edificiosSinDelegado.length}
              warn={cd.edificiosSinDelegado.length > 0}
              objetivo="0"
              objetivoMax={0}
            />
          </div>
          <p className="mt-3 text-xs text-brand-muted">
            <Link
              href="/admin/dashboard?tab=delegados"
              className="text-brand-blue hover:underline"
            >
              Ver detalle CD →
            </Link>
          </p>
        </Block>
      )}

      {noticias.length > 0 && (
        <Block titulo="Últimas novedades publicadas">
          <ul className="flex flex-col gap-3">
            {noticias.map((n) => (
              <li
                key={n.id}
                className="flex gap-3 border-b border-neutral-100 pb-3 last:border-b-0 last:pb-0"
              >
                <span
                  aria-hidden
                  className={
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full ' +
                    (n.destacada ? 'bg-amber-400' : 'bg-brand-blue/60')
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-xs uppercase tracking-wide text-brand-muted">
                      {n.publicada_at
                        ? new Date(n.publicada_at).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : 'Sin fecha'}
                      {n.autor && <span> · {n.autor}</span>}
                    </p>
                    {n.destacada && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        DESTACADA
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-brand-ink">
                    {n.titulo}
                  </h3>
                  {n.resumen && (
                    <p className="line-clamp-2 text-xs text-brand-muted">
                      {n.resumen}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-brand-muted">
            <Link
              href="/admin/novedades"
              className="text-brand-blue hover:underline"
            >
              Gestionar novedades →
            </Link>
          </p>
        </Block>
      )}
    </>
  )
}

function PadronTab({
  distribucion,
  current,
  heatmap,
}: {
  distribucion: DistribucionApops
  current: SnapshotMeta
  heatmap: HeatmapEdificioRow[] | null
}) {
  // Donut de gremios sobre el universo total de cotizantes.
  // "Sin gremio conocido" = cotizantes que no aparecen en ningún flag.
  // Estimación: total - max(suma de gremios). Algunos pueden estar en >1.
  const sinGremioAprox = Math.max(
    0,
    current.total_filas -
      current.total_apops -
      current.total_ate -
      current.total_upcn -
      current.total_secasfpi,
  )
  const gremioSlices = [
    { label: 'APOPS', value: current.total_apops, color: '#1d4ed8' },
    { label: 'ATE', value: current.total_ate, color: '#10b981' },
    { label: 'UPCN', value: current.total_upcn, color: '#a78bfa' },
    { label: 'SECASFPI', value: current.total_secasfpi, color: '#f59e0b' },
    { label: 'Sin gremio identificado', value: sinGremioAprox, color: '#cbd5e1' },
  ]
  return (
    <Block
      titulo={`Distribución APOPS (${numero(distribucion.totalApops)} afiliados)`}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-brand-ink">
            Mapa por provincia
          </h3>
          <ArgentinaMap data={distribucion.porProvinciaMap} label="APOPS" />
          <p className="text-xs text-brand-muted">
            Pasá el cursor por una provincia para ver el conteo. CABA aparece
            como punto sobre Buenos Aires.
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

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-brand-ink">
          Cotizantes por gremio (todo el padrón)
        </h3>
        <DonutChart
          slices={gremioSlices}
          centerLabel="TOTAL"
          centerValue={current.total_filas}
          title="Cotizantes por gremio"
          size={200}
        />
      </div>

      {heatmap && heatmap.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">
            Top {heatmap.length} edificios — métricas comparadas
          </h3>
          <p className="mb-3 text-xs text-brand-muted">
            Cada celda colorea según rangos: APOPS verde si supera el 50%,
            planta permanente verde sobre 80%, delegados verde con al menos 1,
            mandatos por vencer verde en 0.
          </p>
          <HeatmapEdificios rows={heatmap} />
        </div>
      )}
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
  )
}

function EvolucionTab({
  evolucion,
  previous,
  current: _current,
  snapshots,
  deltasPorMes,
}: {
  evolucion: Evolucion | null
  previous: SnapshotMeta | null
  current: SnapshotMeta
  snapshots: SnapshotMeta[]
  deltasPorMes: DeltaPorMes[] | null
}) {
  // Snapshots cronológicamente ascendentes (el de abajo del array viene
  // descendente; lo damos vuelta para el chart).
  const cronologico = [...snapshots].sort((a, b) =>
    a.periodo_year !== b.periodo_year
      ? a.periodo_year - b.periodo_year
      : a.periodo_month - b.periodo_month,
  )

  const linePoints: LinePoint[] = cronologico.map((s) => ({
    x: periodoLabel(s.periodo_year, s.periodo_month),
    values: {
      apops: s.total_apops,
      ate: s.total_ate,
      upcn: s.total_upcn,
      secasfpi: s.total_secasfpi,
      delegados: s.total_delegados,
    },
  }))

  return (
    <>
      {cronologico.length >= 2 && (
        <Block
          titulo={`Evolución por gremio (${cronologico.length} períodos)`}
        >
          <LineChart
            data={linePoints}
            series={[
              { key: 'apops', label: 'APOPS', color: '#1d4ed8' },
              { key: 'ate', label: 'ATE', color: '#10b981' },
              { key: 'upcn', label: 'UPCN', color: '#a78bfa' },
              { key: 'secasfpi', label: 'SECASFPI', color: '#f59e0b' },
              { key: 'delegados', label: 'Delegados', color: '#64748b' },
            ]}
            height={260}
          />
          <p className="mt-3 text-xs text-brand-muted">
            Pasá el cursor sobre los puntos para ver el valor exacto en cada
            período.
          </p>
        </Block>
      )}

      {cronologico.length >= 2 && (
        <Block titulo="Cotizantes totales por período">
          <LineChart
            data={linePoints.map((p, i) => ({
              x: p.x,
              values: { cotizantes: cronologico[i]!.total_filas },
            }))}
            series={[
              { key: 'cotizantes', label: 'Cotizantes', color: '#1d4ed8' },
            ]}
            height={200}
          />
        </Block>
      )}

      {deltasPorMes && deltasPorMes.length > 0 && (
        <Block titulo="Altas y bajas por mes">
          <BarChart
            data={deltasPorMes.map((d) => ({
              x: d.periodoLabel,
              values: { altas: d.altas, bajas: d.bajas },
            }))}
            series={[
              { key: 'altas', label: 'Altas reales', color: '#10b981' },
              { key: 'bajas', label: 'Bajas reales', color: '#ef4444' },
            ]}
            height={220}
          />
          <p className="mt-3 text-xs text-brand-muted">
            Altas = legajos que aparecen en el mes y no estaban en el anterior.
            Bajas = legajos que estaban en el mes anterior y desaparecen.
          </p>

          {/* Detalle APOPS por mes (sub-segmento de altas/bajas reales) */}
          <details className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs">
            <summary className="cursor-pointer font-semibold text-brand-ink">
              Detalle APOPS por mes ({deltasPorMes.length} períodos)
            </summary>
            <table className="mt-2 w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-brand-muted">
                  <th className="py-1.5 pr-3">Período</th>
                  <th className="py-1.5 px-2 text-right">Altas</th>
                  <th className="py-1.5 px-2 text-right">Altas APOPS</th>
                  <th className="py-1.5 px-2 text-right">Bajas</th>
                  <th className="py-1.5 px-2 text-right">Bajas APOPS</th>
                </tr>
              </thead>
              <tbody>
                {deltasPorMes.map((d) => (
                  <tr
                    key={d.periodoLabel}
                    className="border-b border-neutral-100 last:border-b-0"
                  >
                    <td className="py-1.5 pr-3 text-brand-ink">
                      {d.periodoLabel}
                    </td>
                    <td className="py-1.5 px-2 text-right text-emerald-700 font-semibold">
                      +{d.altas}
                    </td>
                    <td className="py-1.5 px-2 text-right text-emerald-600">
                      {d.altasApops}
                    </td>
                    <td className="py-1.5 px-2 text-right text-red-700 font-semibold">
                      −{d.bajas}
                    </td>
                    <td className="py-1.5 px-2 text-right text-red-600">
                      {d.bajasApops}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Block>
      )}

      {previous && evolucion ? (
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
          <p className="mt-4 text-xs text-brand-muted">
            Para ver el listado detallado de quiénes son las altas y bajas con
            acciones de mensajería, andá a la tab{' '}
            <Link
              href="/admin/dashboard?tab=altas-bajas"
              className="text-brand-blue hover:underline"
            >
              Altas / Bajas
            </Link>
            .
          </p>
        </Block>
      ) : (
        <Block titulo="Cambios mes vs mes">
          <p className="text-sm text-brand-muted">
            Necesitás al menos 2 snapshots cargados para ver altas/bajas y
            cambios. Hoy hay{' '}
            <strong>{cronologico.length}</strong>{' '}
            ({cronologico.length === 1 ? 'solo el actual' : 'cargados'}). Subí
            otro padrón desde{' '}
            <Link href="/admin/padron" className="text-brand-blue hover:underline">
              /admin/padron
            </Link>
            .
          </p>
        </Block>
      )}
    </>
  )
}

function DelegadosTab({ cd }: { cd: ComisionDirectiva }) {
  return (
    <Block titulo="Comisión Directiva">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BigStat label="Delegados activos" value={cd.totalDelegados} />
        <BigStat
          label="Mandatos vencen 30 días"
          value={cd.mandatosVencen30.length}
          warn={cd.mandatosVencen30.length > 0}
          objetivo="0"
          objetivoMax={0}
        />
        <BigStat
          label="Edificios sin delegado"
          value={cd.edificiosSinDelegado.length}
          warn={cd.edificiosSinDelegado.length > 0}
          hint="con APOPS pero ningún delegado asignado"
          objetivo="0"
          objetivoMax={0}
        />
      </div>

      {cd.mandatosVencen30.length > 0 && (
        <details
          open
          className="mt-4 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200"
        >
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
  )
}

function AppTab({ app }: { app: AppVsPadron }) {
  const engagementPct =
    app.totalActivos > 0
      ? Math.round((app.engaged30d / app.totalActivos) * 100)
      : 0
  return (
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
          objetivo="70%"
          objetivoMin={70}
        />
        <BigStat
          label="Engagement 30d"
          value={engagementPct}
          suffix="%"
          hint={`${numero(app.engaged30d)} de ${numero(app.totalActivos)} activos`}
          objetivo="50%"
          objetivoMin={50}
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
  )
}

function EventosTab({ eventos }: { eventos: EventosDelMes | null }) {
  if (!eventos) {
    return (
      <Block titulo="Eventos del mes">
        <p className="text-sm text-brand-muted">Cargando…</p>
      </Block>
    )
  }
  return (
    <Block titulo={`Eventos APOPS de ${eventos.mesLabel}`}>
      <p className="mb-4 text-xs text-brand-muted">
        Personas afiliadas a APOPS que cumplen años o festejan aniversario de
        ingreso al organismo en <strong>{eventos.mesLabel}</strong>. Click en
        el botón verde abre WhatsApp con la plantilla de saludo lista para
        mandar.
      </p>
      <EventosList
        mesLabel={eventos.mesLabel}
        cumpleanos={eventos.cumpleanos}
        aniversarios={eventos.aniversarios}
      />
    </Block>
  )
}

function AltasBajasTab({
  altasBajas,
  previous,
  current,
  gremioFiltro,
  periodo,
}: {
  altasBajas: AltasYBajas | null
  previous: SnapshotMeta | null
  current: SnapshotMeta
  gremioFiltro: GremioFiltro
  periodo: string | undefined
}) {
  if (!previous) {
    return (
      <Block titulo="Altas y Bajas">
        <p className="text-sm text-brand-muted">
          Solo hay un snapshot del padrón (
          {periodoLabel(current.periodo_year, current.periodo_month)}). Cargá
          otro mes desde{' '}
          <Link href="/admin/padron" className="text-brand-blue hover:underline">
            /admin/padron
          </Link>{' '}
          para ver altas y bajas.
        </p>
      </Block>
    )
  }
  if (!altasBajas) {
    return (
      <Block titulo="Altas y Bajas">
        <p className="text-sm text-brand-muted">Cargando…</p>
      </Block>
    )
  }

  // Filtrar por gremio si aplica
  const filterFn = (p: { gremios: string[] }) => {
    if (!gremioFiltro) return true
    if (gremioFiltro === 'ninguno') return p.gremios.length === 0
    return p.gremios.some((g) => g.toLowerCase() === gremioFiltro)
  }
  const altasFiltradas = altasBajas.altas.filter(filterFn)
  const bajasFiltradas = altasBajas.bajas.filter(filterFn)

  return (
    <Block
      titulo={`Altas y bajas vs ${periodoLabel(previous.periodo_year, previous.periodo_month)}`}
    >
      {/* Chips de filtro por gremio */}
      <GremioChips
        active={gremioFiltro}
        periodo={periodo}
      />

      <p className="mb-4 mt-3 text-xs text-brand-muted">
        Click en <strong>Mensaje bienvenida / despedida</strong> abre WhatsApp
        con la plantilla pre-cargada. Elegís el contacto de tu agenda. Para
        bajas con cuenta en la app también aparece el botón de email.
      </p>
      <AltasBajasList altas={altasFiltradas} bajas={bajasFiltradas} />
    </Block>
  )
}

function GremioChips({
  active,
  periodo,
}: {
  active: GremioFiltro
  periodo: string | undefined
}) {
  return (
    <nav
      aria-label="Filtrar por gremio"
      className="-mx-1 flex flex-wrap gap-1"
    >
      {GREMIO_FILTROS.map((g) => {
        const params = new URLSearchParams()
        params.set('tab', 'altas-bajas')
        if (g.key) params.set('gremio', g.key)
        if (periodo) params.set('periodo', periodo)
        const isActive = g.key === active
        return (
          <Link
            key={g.key}
            href={`/admin/dashboard?${params.toString()}`}
            scroll={false}
            className={
              isActive
                ? 'rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold text-white'
                : 'rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-brand-muted hover:bg-neutral-200 hover:text-brand-ink'
            }
          >
            {g.label}
          </Link>
        )
      })}
    </nav>
  )
}

// =====================================================================
// Subcomponentes visuales
// =====================================================================

function Block({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-brand-ink">{titulo}</h2>
      <div className="rounded-2xl bg-white p-5 shadow-card">{children}</div>
    </section>
  )
}

type KpiTone = 'brand' | 'success' | 'purple' | 'amber' | 'red'

const TONE_STYLES: Record<KpiTone, { bg: string; text: string }> = {
  brand: { bg: 'bg-brand-blue/10', text: 'text-brand-blue' },
  success: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  purple: { bg: 'bg-violet-100', text: 'text-violet-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
  red: { bg: 'bg-red-100', text: 'text-red-700' },
}

function KpiCard({
  label,
  value,
  icon,
  tone = 'brand',
  delta,
  deltaLabel,
  hint,
  suffix,
  objetivo,
  objetivoMin,
  objetivoMax,
}: {
  label: string
  value: number
  icon?: React.ReactNode
  tone?: KpiTone
  /** porcentaje de cambio (puede ser negativo). Si undefined, no se muestra. */
  delta?: number
  deltaLabel?: string
  hint?: string
  suffix?: string
  /** Etiqueta del objetivo (ej "70%"). Sólo informativa. */
  objetivo?: string
  /** Valor mínimo deseado. Si value >= objetivoMin → cumple. */
  objetivoMin?: number
  /** Valor máximo deseado. Si value <= objetivoMax → cumple. */
  objetivoMax?: number
}) {
  const t = TONE_STYLES[tone]
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-brand-muted">
          {label}
        </span>
        {icon && (
          <span
            aria-hidden
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.bg} ${t.text}`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3">
        <span className="text-3xl font-bold leading-tight text-brand-ink">
          {numero(value)}
          {suffix && (
            <span className="ml-0.5 text-xl font-semibold">{suffix}</span>
          )}
        </span>
      </div>
      {delta !== undefined && (
        <div className="mt-1 text-xs">
          <span
            className={
              delta > 0
                ? 'font-semibold text-emerald-600'
                : delta < 0
                  ? 'font-semibold text-red-600'
                  : 'text-brand-muted'
            }
          >
            {delta > 0 ? '↑ +' : delta < 0 ? '↓ ' : '· '}
            {delta.toFixed(1)}%
          </span>
          {deltaLabel && (
            <span className="ml-1 text-brand-muted">{deltaLabel}</span>
          )}
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-brand-muted">{hint}</p>}
      {objetivo !== undefined && (
        <ObjetivoBadge
          value={value}
          objetivo={objetivo}
          min={objetivoMin}
          max={objetivoMax}
        />
      )}
    </div>
  )
}

function ObjetivoBadge({
  value,
  objetivo,
  min,
  max,
}: {
  value: number
  objetivo: string
  min?: number
  max?: number
}) {
  let cumple = true
  if (min !== undefined && value < min) cumple = false
  if (max !== undefined && value > max) cumple = false
  return (
    <div
      className={
        'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
        (cumple
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-800')
      }
    >
      <span aria-hidden>{cumple ? '✓' : '!'}</span>
      <span>Objetivo {objetivo}</span>
    </div>
  )
}

// =====================================================================
// Icons para KpiCard
// =====================================================================

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
      <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="4" />
      <path d="M21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UnionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
      <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  )
}

function SmartphoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
      <rect x="5" y="2" width="14" height="20" rx="2" strokeLinejoin="round" />
      <line x1="11" y1="18" x2="13" y2="18" strokeLinecap="round" strokeWidth={3} />
    </svg>
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
  objetivo,
  objetivoMin,
  objetivoMax,
}: {
  label: string
  value: number
  of?: number
  hint?: string
  primary?: boolean
  warn?: boolean
  suffix?: string
  objetivo?: string
  objetivoMin?: number
  objetivoMax?: number
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
      {objetivo !== undefined && (
        <ObjetivoBadge
          value={value}
          objetivo={objetivo}
          min={objetivoMin}
          max={objetivoMax}
        />
      )}
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
          Todavía no se cargó ningún padrón. Subí el primero para empezar a ver
          métricas.
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
