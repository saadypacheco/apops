import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { createAdminClient } from '@/lib/supabase/admin'
import { contarNoLeidos } from '@/lib/notificaciones/queries'
import { getWhatsappGrupoDelAfiliado } from '@/lib/delegados/whatsapp'
import { getBeneficioDestacado } from '@/lib/beneficios/queries'

export const metadata: Metadata = {
  title: 'Inicio',
}

type NoticiaCard = {
  id: string
  titulo: string
  resumen: string
}

export default async function FeedPage() {
  const session = await requireRole('afiliado')
  const admin = createAdminClient()

  const [
    { data: afiliado },
    { data: comunicados },
    beneficio,
    noLeidos,
    grupoDelegado,
  ] = await Promise.all([
    admin
      .from('afiliados')
      .select('estado')
      .eq('id', session.afiliadoId)
      .maybeSingle(),
    admin
      .from('noticias')
      .select('id, titulo, resumen')
      .eq('publicada', true)
      .order('publicada_at', { ascending: false })
      .limit(1),
    getBeneficioDestacado(),
    contarNoLeidos(session.afiliadoId),
    getWhatsappGrupoDelAfiliado(session),
  ])

  const carnetActivo =
    ((afiliado as { estado: string } | null)?.estado ?? 'activo') === 'activo'
  const comunicado = (comunicados as NoticiaCard[] | null)?.[0] ?? null

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="home">
      <div className="flex flex-col gap-4 pb-28">
        <Link
          href="/credencial"
          className={
            'flex items-center gap-3 rounded-xl p-4 shadow-card transition hover:shadow-cardHover ' +
            (carnetActivo
              ? 'bg-emerald-50 ring-1 ring-emerald-200'
              : 'bg-amber-50 ring-1 ring-amber-200')
          }
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={
              'h-7 w-7 shrink-0 ' +
              (carnetActivo ? 'text-emerald-700' : 'text-amber-700')
            }
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10.5" r="1.5" />
            <path d="M6 16h5M13 9h5M13 12h5M13 15h5" strokeLinecap="round" />
          </svg>
          <div className="flex-1">
            <p
              className={
                'text-base font-semibold ' +
                (carnetActivo ? 'text-emerald-900' : 'text-amber-900')
              }
            >
              {carnetActivo
                ? 'Tu carnet está activo'
                : 'Tu carnet no está activo'}
            </p>
            <p
              className={
                'text-xs ' +
                (carnetActivo ? 'text-emerald-800' : 'text-amber-800')
              }
            >
              {carnetActivo
                ? 'Tocá para verlo o compartirlo'
                : 'Consultá con tu delegado o la Secretaría'}
            </p>
          </div>
          <span aria-hidden className="text-brand-muted">
            →
          </span>
        </Link>

        {noLeidos > 0 && (
          <Link
            href="/notificaciones"
            className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 shadow-card ring-1 ring-amber-200 transition hover:shadow-cardHover"
          >
            <span aria-hidden className="text-2xl">
              ⚠️
            </span>
            <div className="flex-1">
              <p className="text-base font-semibold text-amber-900">
                {noLeidos === 1
                  ? 'Tenés una respuesta'
                  : `Tenés ${noLeidos} mensajes sin leer`}
              </p>
              <p className="text-xs text-amber-800">Tocá para leerlos</p>
            </div>
            <span aria-hidden className="text-amber-700">
              →
            </span>
          </Link>
        )}

        {comunicado && (
          <DashboardCard
            href="/novedades"
            icon="📢"
            eyebrow="Comunicado"
            titulo={comunicado.titulo}
            detalle={comunicado.resumen}
          />
        )}

        {beneficio && (
          <DashboardCard
            href="/beneficios"
            icon="🎁"
            eyebrow="Beneficio nuevo"
            titulo={beneficio.titulo}
            detalle={beneficio.resumen}
          />
        )}

        <DashboardCard
          href="/beneficios"
          icon="📅"
          eyebrow="Próxima capacitación"
          titulo="Próximamente"
          detalle="Estamos preparando el calendario de capacitaciones."
        />

        <section className="flex flex-col gap-2 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Accesos rápidos
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction
              href="/notificaciones/nueva"
              icon="📋"
              label="Consultar trámite"
            />
            <QuickAction
              href={grupoDelegado ?? '/notificaciones/nueva'}
              external={!!grupoDelegado}
              icon="💬"
              label="Hablar con delegado"
            />
            {/* Capacitaciones vive dentro de Beneficios (es una categoría
                más del hub de servicios), así que no tiene ruta propia. */}
            <QuickAction
              href="/beneficios"
              icon="🎓"
              label="Ver capacitaciones"
            />
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function DashboardCard({
  href,
  icon,
  eyebrow,
  titulo,
  detalle,
}: {
  href: string
  icon: string
  eyebrow: string
  titulo: string
  detalle: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
    >
      <span aria-hidden className="text-2xl">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          {eyebrow}
        </p>
        <p className="mt-0.5 text-base font-semibold text-brand-ink">
          {titulo}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm text-brand-muted">
          {detalle}
        </p>
      </div>
      <span aria-hidden className="text-brand-muted">
        →
      </span>
    </Link>
  )
}

function QuickAction({
  href,
  icon,
  label,
  external,
}: {
  href: string
  icon: string
  label: string
  external?: boolean
}) {
  const className =
    'flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 text-center shadow-card transition hover:shadow-cardHover'
  const inner = (
    <>
      <span aria-hidden className="text-2xl">
        {icon}
      </span>
      <span className="text-xs font-medium leading-tight text-brand-ink">
        {label}
      </span>
    </>
  )

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {inner}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  )
}
