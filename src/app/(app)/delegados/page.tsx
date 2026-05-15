import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { AltasBajasList } from '@/components/admin/AltasBajasList'
import { EventosList } from '@/components/admin/EventosList'
import { MensajeForm } from '@/components/delegados/MensajeForm'
import { CotizantesEdificioBuscador } from '@/components/delegados/CotizantesEdificioBuscador'
import {
  getAltasYBajas,
  getEventosDelMes,
  getSnapshots,
} from '@/lib/admin/dashboard-queries'
import {
  getCotizantesRepresentados,
  getCotizantesDeLosEdificios,
} from '@/lib/delegados/queries'

export const metadata: Metadata = {
  title: 'Panel delegados',
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type MensajeEnviado = {
  id: string
  asunto: string
  leido: boolean
  leido_at: string | null
  created_at: string
}

export default async function DelegadosPage() {
  const session = await requireRole('delegado')

  // Representados directos (los que tienen al delegado como `representante`
  // en padrón). Se usa para filtrar eventos APOPS del mes a su sector.
  const { cotizantes: representados } = await getCotizantesRepresentados(
    session.nombre,
  )

  // Vista completa del/los edificio(s) del delegado: TODOS los cotizantes,
  // incluyendo otros gremios y sin gremio. Es lo que muestra el listado
  // principal con buscador y filtros.
  const {
    cotizantes: todosDelEdificio,
    edificios: misEdificios,
    stats,
  } = await getCotizantesDeLosEdificios(session.nombre)

  const admin = createAdminClient()
  const { data: misMensajes } = await admin
    .from('mensajes_delegado')
    .select('id, asunto, leido, leido_at, created_at')
    .eq('delegado_id', session.afiliadoId)
    .order('created_at', { ascending: false })
    .limit(5)
  const ultimosMensajes = (misMensajes ?? []) as MensajeEnviado[]

  // Mi info de delegado: ¿vence mandato en 30d?
  const { data: miPadronRaw } = await admin
    .from('padron_cotizantes_actual')
    .select('vence_mandato_30dias, fecha_actualizacion_delegados, periodo_mandato')
    .or(
      `dni.eq.${session.dni}${session.legajo ? `,legajo.eq.${session.legajo}` : ''}`,
    )
    .maybeSingle()
  const miInfoDelegado = miPadronRaw as
    | {
        vence_mandato_30dias: boolean | null
        fecha_actualizacion_delegados: string | null
        periodo_mandato: string | null
      }
    | null

  // Eventos del mes filtrados a mis representados APOPS (saludos
  // cumpleaños/aniversarios solo tiene sentido para APOPS).
  const snapshots = await getSnapshots(admin)
  const currentSnapshot = snapshots[0] ?? null
  const previousSnapshot = snapshots[1] ?? null
  const legajosRepresentados = new Set(
    representados.map((c) => c.legajo).filter((l): l is string => !!l),
  )
  const eventos = currentSnapshot
    ? await getEventosDelMes(
        admin,
        currentSnapshot.id,
        undefined,
        legajosRepresentados,
      )
    : null

  // Altas/bajas en mis edificios (todos los gremios, no solo APOPS)
  const edificiosSet = new Set(misEdificios)
  const altasBajasRaw =
    currentSnapshot && previousSnapshot
      ? await getAltasYBajas(admin, currentSnapshot.id, previousSnapshot.id)
      : null
  const altasMiEdificio = altasBajasRaw
    ? altasBajasRaw.altas.filter(
        (p) => p.edificio && edificiosSet.has(p.edificio),
      )
    : []
  const bajasMiEdificio = altasBajasRaw
    ? altasBajasRaw.bajas.filter(
        (p) => p.edificio && edificiosSet.has(p.edificio),
      )
    : []

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="delegados">
      <div className="flex flex-col gap-5">
        <header className="rounded-xl bg-white p-4 shadow-card">
          <h1 className="text-lg font-semibold text-brand-ink">
            Mi edificio
          </h1>
          <p className="mt-1 text-sm text-brand-muted">
            Todas las personas del padrón ANSES que trabajan en{' '}
            {misEdificios.length === 0
              ? 'tu sector'
              : misEdificios.length === 1
                ? misEdificios[0]
                : `tus ${misEdificios.length} edificios`}
            : afiliadas a APOPS, a otros gremios, sin gremio, etc.
          </p>
        </header>

        {/* Alerta de mandato si vence en 30 días */}
        {miInfoDelegado?.vence_mandato_30dias && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200"
          >
            <span aria-hidden className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Tu mandato como delegado/a vence en los próximos 30 días.
              </p>
              <p className="mt-1 text-xs text-amber-800">
                {miInfoDelegado.periodo_mandato && (
                  <>
                    Período: <strong>{miInfoDelegado.periodo_mandato}</strong>.{' '}
                  </>
                )}
                Contactá a la CD para renovar o transferir la representación.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats.total > 0 && (
          <section
            aria-label="Resumen del sector"
            className="grid grid-cols-2 gap-3"
          >
            <StatCard
              label="Personas en mi edificio"
              value={stats.total}
              tone="neutral"
            />
            <StatCard
              label="Afiliados APOPS"
              value={stats.afiliadosApops}
              tone="success"
            />
            <StatCard
              label="Otros gremios"
              value={stats.otrosGremios}
              tone="warn"
              hint="ATE / UPCN / SEC / SECASFPI"
            />
            <StatCard
              label="Sin gremio"
              value={stats.sinGremio}
              tone="info"
              hint="Oportunidades de afiliación"
            />
          </section>
        )}

        {/* Eventos APOPS del mes en mi sector */}
        {eventos &&
          (eventos.cumpleanos.length > 0 || eventos.aniversarios.length > 0) && (
            <section className="flex flex-col gap-3">
              <header>
                <h2 className="text-lg font-semibold text-brand-ink capitalize">
                  Eventos APOPS de {eventos.mesLabel} en tu sector
                </h2>
                <p className="text-xs text-brand-muted">
                  Cumpleaños y aniversarios de ingreso de tus representados
                  APOPS este mes. Click en el botón verde abre WhatsApp con la
                  plantilla lista.
                </p>
              </header>
              <EventosList
                mesLabel={eventos.mesLabel}
                cumpleanos={eventos.cumpleanos}
                aniversarios={eventos.aniversarios}
              />
            </section>
          )}

        {/* Altas/bajas en mi edificio (todos los gremios) */}
        {previousSnapshot &&
          (altasMiEdificio.length > 0 || bajasMiEdificio.length > 0) && (
            <section className="flex flex-col gap-3">
              <header>
                <h2 className="text-lg font-semibold text-brand-ink">
                  Altas y bajas en tu edificio
                </h2>
                <p className="text-xs text-brand-muted">
                  Personas que entraron o salieron de los edificios donde
                  trabajan tus representados, comparando el padrón actual
                  contra el anterior. Incluye TODOS los gremios — útil para
                  invitar a APOPS o despedir compañeros.
                </p>
              </header>
              <AltasBajasList
                altas={altasMiEdificio}
                bajas={bajasMiEdificio}
              />
            </section>
          )}

        {/* Listado con buscador + filtros por gremio */}
        {todosDelEdificio.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
            <p className="text-base font-medium text-brand-ink">
              No encontramos personas en tu edificio.
            </p>
            <p className="mt-2">
              El cruce contra el padrón se hace por nombre. Si creés que es un
              error, contactá a la administración del gremio.
            </p>
          </div>
        ) : (
          <CotizantesEdificioBuscador
            cotizantes={todosDelEdificio}
            edificios={misEdificios}
          />
        )}

        {/* ============================================================
            Mensajería con la CD
            ============================================================ */}
        <section
          aria-label="Mensajes a la Comisión Directiva"
          className="flex flex-col gap-3 pt-2"
        >
          <header>
            <h2 className="text-lg font-semibold text-brand-ink">
              Mensajes a la CD
            </h2>
          </header>

          <MensajeForm />

          {ultimosMensajes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                Últimos enviados
              </h3>
              <ul className="flex flex-col gap-2">
                {ultimosMensajes.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-white p-3 shadow-card"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-ink">
                        {m.asunto}
                      </p>
                      <p className="text-xs text-brand-muted">
                        Enviado {formatRelative(m.created_at)}
                      </p>
                    </div>
                    {m.leido ? (
                      <span
                        className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800"
                        title={
                          m.leido_at
                            ? `Leído ${formatRelative(m.leido_at)}`
                            : 'Leído'
                        }
                      >
                        ✓ Leído
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                        Pendiente
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: number
  tone: 'neutral' | 'success' | 'warn' | 'info'
  hint?: string
}) {
  const toneClass: Record<typeof tone, string> = {
    neutral: 'text-brand-ink',
    success: 'text-emerald-700',
    warn: 'text-amber-700',
    info: 'text-cyan-700',
  } as const
  return (
    <div className="rounded-xl bg-white p-3 shadow-card">
      <p className={'text-2xl font-bold leading-tight ' + toneClass[tone]}>
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-brand-ink">{label}</p>
      {hint && <p className="text-[11px] text-brand-muted">{hint}</p>}
    </div>
  )
}
