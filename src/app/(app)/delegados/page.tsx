import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { MensajeForm } from '@/components/delegados/MensajeForm'
import {
  getCotizantesRepresentados,
  type CotizanteResumido,
} from '@/lib/delegados/queries'

export const metadata: Metadata = {
  title: 'Panel delegados',
}

type GremioBadge = {
  label: string
  className: string
}

function gremioBadge(c: CotizanteResumido): GremioBadge {
  if (c.afiliado_apops) {
    return {
      label: 'APOPS',
      className: 'bg-emerald-100 text-emerald-800',
    }
  }
  if (c.cotiza_papel) {
    return {
      label: 'Cotiza papel',
      className: 'bg-cyan-100 text-cyan-800',
    }
  }
  if (c.afiliado_ate) {
    return { label: 'ATE', className: 'bg-red-100 text-red-800' }
  }
  if (c.afiliado_upcn) {
    return { label: 'UPCN', className: 'bg-orange-100 text-orange-800' }
  }
  if (c.afiliado_sec) {
    return { label: 'SEC', className: 'bg-purple-100 text-purple-800' }
  }
  if (c.afiliado_secasfpi) {
    return { label: 'SECASFPI', className: 'bg-purple-100 text-purple-800' }
  }
  return {
    label: 'Sin gremio',
    className: 'bg-neutral-200 text-brand-muted',
  }
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

  const { cotizantes, stats } = await getCotizantesRepresentados(
    session.nombre,
  )

  const admin = createAdminClient()
  const { data: misMensajes } = await admin
    .from('mensajes_delegado')
    .select('id, asunto, leido, leido_at, created_at')
    .eq('delegado_id', session.afiliadoId)
    .order('created_at', { ascending: false })
    .limit(5)
  const ultimosMensajes = (misMensajes ?? []) as MensajeEnviado[]

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="delegados">
      <div className="flex flex-col gap-5">
        <header className="rounded-xl bg-white p-4 shadow-card">
          <h1 className="text-lg font-semibold text-brand-ink">
            Mis cotizantes
          </h1>
          <p className="mt-1 text-sm text-brand-muted">
            Personas del padrón que figuran con vos como representante.
          </p>
          {cotizantes.length > 0 && (
            <p className="mt-2 text-xs text-brand-muted">
              ⚠ El cruce con el padrón se hace por nombre. Si ves cotizantes
              que faltan o sobran, avisanos.
            </p>
          )}
        </header>

        {/* Stats */}
        {stats.total > 0 && (
          <section
            aria-label="Resumen del sector"
            className="grid grid-cols-2 gap-3"
          >
            <StatCard
              label="Cotizantes totales"
              value={stats.total}
              tone="neutral"
            />
            <StatCard
              label="Afiliados APOPS"
              value={stats.afiliadosApops}
              tone="success"
            />
            <StatCard
              label="No afiliados APOPS"
              value={stats.noAfiliadosApops}
              tone="warn"
              hint="Oportunidades de afiliación"
            />
            <StatCard
              label="Cotizan en papel"
              value={stats.cotizaPapel}
              tone="info"
            />
          </section>
        )}

        {/* Listado */}
        {cotizantes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
            <p className="text-base font-medium text-brand-ink">
              No encontramos cotizantes asignados a tu nombre.
            </p>
            <p className="mt-2">
              Si creés que es un error, contactá a la administración del
              gremio para revisar la asignación en el padrón.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {cotizantes.map((c) => {
              const badge = gremioBadge(c)
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-1.5 rounded-xl bg-white p-3 shadow-card"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-brand-ink">
                        {c.nombre}
                      </h3>
                      <p className="text-xs text-brand-muted">
                        DNI {c.dni}
                        {c.legajo ? ` · L-${c.legajo.replace(/^L-?/, '')}` : ''}
                      </p>
                    </div>
                    <span
                      className={
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ' +
                        badge.className
                      }
                    >
                      {badge.label}
                    </span>
                  </header>

                  {(c.lugar_trabajo || c.provincia || c.regional) && (
                    <p className="text-xs text-brand-muted">
                      {[c.lugar_trabajo, c.regional, c.provincia]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}

                  {(c.tipo_planta || c.vence_mandato_30dias) && (
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {c.tipo_planta && (
                        <span className="text-brand-muted">
                          Planta: {c.tipo_planta.toLowerCase()}
                        </span>
                      )}
                      {c.vence_mandato_30dias && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                          Vence mandato &lt; 30 días
                        </span>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
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
