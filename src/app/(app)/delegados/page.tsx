import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import {
  getResumenDelDia,
  getStatsEdificio,
} from '@/lib/delegados/panel-queries'

export const metadata: Metadata = {
  title: 'Panel delegados',
}

// Inicio del delegado: resumen del día + estado del edificio. Las vistas
// de detalle viven en /delegados/edificio, /afiliados, /comunicados y /mas.

export default async function DelegadosPage() {
  const session = await requireRole('delegado')

  const [resumen, stats, miInfo] = await Promise.all([
    getResumenDelDia(session),
    getStatsEdificio(session.nombre),
    getInfoMandato(session.dni, session.legajo),
  ])

  const primerNombre = session.nombre.split(',').pop()?.trim().split(/\s+/)[0]

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="delegados">
      <div className="flex flex-col gap-5 pb-4">
        <header>
          <h1 className="text-2xl font-semibold text-brand-ink">
            Hola, {primerNombre} 👋
          </h1>
          <p className="text-sm text-brand-muted">Delegado</p>
        </header>

        {miInfo?.vence_mandato_30dias && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200"
          >
            <span aria-hidden className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Tu mandato vence en los próximos 30 días.
              </p>
              <p className="mt-1 text-xs text-amber-800">
                {miInfo.periodo_mandato && (
                  <>Período: <strong>{miInfo.periodo_mandato}</strong>. </>
                )}
                Contactá a la CD para renovar la representación.
              </p>
            </div>
          </div>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Resumen del día
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <ResumenTile
              href="/delegados/mas"
              valor={resumen.alertas}
              label={resumen.alertas === 1 ? 'Alerta' : 'Alertas'}
              tone="warn"
            />
            <ResumenTile
              href="/notificaciones"
              valor={resumen.consultas}
              label={resumen.consultas === 1 ? 'Consulta' : 'Consultas'}
              tone="info"
            />
            <ResumenTile
              href="/delegados/comunicados"
              valor={resumen.comunicados}
              label={resumen.comunicados === 1 ? 'Comunicado' : 'Comunicados'}
              tone="neutral"
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card">
          <header className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue"
            >
              <BuildingIcon />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-brand-muted">Estado de tu edificio</p>
              <p className="truncate text-base font-semibold text-brand-ink">
                {stats.edificios.length === 0
                  ? 'Sin edificio asignado'
                  : stats.edificios.length === 1
                    ? stats.edificios[0]
                    : `${stats.edificios.length} edificios`}
              </p>
            </div>
          </header>

          {stats.edificios.length === 0 ? (
            <p className="text-sm text-brand-muted">
              No figurás como representante de ningún edificio en el padrón.
              Contactá a la administración si creés que es un error.
            </p>
          ) : (
            <>
              <dl className="flex flex-col divide-y divide-neutral-100">
                <FilaStat
                  icono="👥"
                  label="Afiliados"
                  valor={stats.afiliadosApops}
                />
                <FilaStat
                  icono="🔓"
                  label="No afiliados"
                  valor={stats.noAfiliados}
                />
                <FilaStat
                  icono="🏛️"
                  label="Otros gremios"
                  valor={stats.otrosGremios}
                />
              </dl>

              <Link
                href="/delegados/edificio"
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-btn-primary px-5 text-sm font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover"
              >
                Ver dashboard
              </Link>
            </>
          )}
        </section>
      </div>
    </AppShell>
  )
}

async function getInfoMandato(dni: string, legajo: string | null) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('padron_cotizantes_actual')
    .select('vence_mandato_30dias, periodo_mandato')
    .or(`dni.eq.${dni}${legajo ? `,legajo.eq.${legajo}` : ''}`)
    .maybeSingle()

  return data as {
    vence_mandato_30dias: boolean | null
    periodo_mandato: string | null
  } | null
}

function ResumenTile({
  href,
  valor,
  label,
  tone,
}: {
  href: string
  valor: number
  label: string
  tone: 'warn' | 'info' | 'neutral'
}) {
  const toneClass = {
    warn: 'text-amber-700',
    info: 'text-brand-blue',
    neutral: 'text-brand-ink',
  }[tone]

  return (
    <Link
      href={href}
      className="flex flex-col items-center rounded-xl bg-white p-3 shadow-card transition hover:shadow-cardHover"
    >
      <span className={'text-2xl font-bold leading-tight ' + toneClass}>
        {valor}
      </span>
      <span className="text-center text-xs text-brand-muted">{label}</span>
    </Link>
  )
}

function FilaStat({
  icono,
  label,
  valor,
}: {
  icono: string
  label: string
  valor: number
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="flex items-center gap-2 text-sm text-brand-ink">
        <span aria-hidden>{icono}</span>
        {label}
      </dt>
      <dd className="text-base font-bold text-brand-ink">{valor}</dd>
    </div>
  )
}

function BuildingIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" strokeLinecap="round" />
    </svg>
  )
}
