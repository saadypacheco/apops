import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/app/AppShell'
import { PendienteActions } from '@/components/admin/PendienteActions'
import { AfiliacionActions } from '@/components/admin/AfiliacionActions'
import { AfiliacionDetail } from '@/components/admin/AfiliacionDetail'
import { contarNoLeidos } from '@/lib/notificaciones/queries'

export const metadata: Metadata = {
  title: 'Panel admin',
}

const motivoLabel: Record<string, string> = {
  dni_no_en_padron: 'DNI no en padrón',
  sin_flag_apops_y_sin_papel: 'En padrón sin afiliación APOPS',
  otros: 'Otros',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Campos que el AfiliacionDetail necesita renderizar — definidos acá para
// que el SELECT pida exactamente esto y TypeScript lo controle.
const AFIL_FIELDS = `
  id, apellido_nombre, tipo_documento, numero_documento, fecha_nacimiento,
  estado_civil,
  domicilio_calle, domicilio_numero, domicilio_piso, domicilio_depto,
  domicilio_localidad, domicilio_provincia, domicilio_cp,
  telefono, celular, email, cbu,
  numero_legajo, edificio_udai, trabajo_localidad, trabajo_domicilio,
  trabajo_telefono, trabajo_email, gerencia, area_udai, cargo_funcion,
  categoria, tipo_planta,
  conyuge, familiares, firma_png, created_at
`.replace(/\s+/g, ' ').trim()

type AfiliacionRow = {
  id: string
  apellido_nombre: string
  tipo_documento: string
  numero_documento: string
  fecha_nacimiento: string
  estado_civil: string | null
  domicilio_calle: string | null
  domicilio_numero: string | null
  domicilio_piso: string | null
  domicilio_depto: string | null
  domicilio_localidad: string | null
  domicilio_provincia: string | null
  domicilio_cp: string | null
  telefono: string
  celular: string
  email: string
  cbu: string | null
  numero_legajo: string
  edificio_udai: string | null
  trabajo_localidad: string | null
  trabajo_domicilio: string | null
  trabajo_telefono: string | null
  trabajo_email: string | null
  gerencia: string | null
  area_udai: string | null
  cargo_funcion: string | null
  categoria: string | null
  tipo_planta: string
  conyuge: {
    apellidoNombre?: string
    tipoDoc?: string
    numeroDoc?: string
    fechaNac?: string
  } | null
  familiares: Array<{
    apellidoNombre?: string
    tipoDoc?: string
    numeroDoc?: string
    fechaNac?: string
    parentesco?: string
  }> | null
  firma_png: string
  created_at: string
}

export default async function AdminPage() {
  const session = await requireRole('admin')

  const admin = createAdminClient()

  // Solicitudes "pendientes" (no en padrón / sin afiliación APOPS confirmada)
  const { data: pendientes } = await admin
    .from('solicitudes_pendientes')
    .select(
      'id, dni, email, sub_flujo, legajo, nombre_completo, motivo_pendiente, created_at',
    )
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true })

  // Contador de mensajes de delegados no leídos (para badge en el atajo)
  const { count: mensajesNoLeidos } = await admin
    .from('mensajes_delegado')
    .select('id', { count: 'exact', head: true })
    .eq('leido', false)

  // Contador de notificaciones sin leer del admin (sistema nuevo de hilos)
  const notifNoLeidas = await contarNoLeidos(session.afiliadoId)

  // Solicitudes de afiliación online (wizard de 3 pasos con firma).
  // Cast por mismatch entre supabase-js 2.45 y types.ts generado por CLI más nueva.
  const { data: afiliaciones } = (await admin
    .from('solicitudes_afiliacion')
    .select(AFIL_FIELDS)
    .in('estado', ['pendiente', 'en_revision'])
    .order('created_at', { ascending: true })) as {
    data: AfiliacionRow[] | null
  }

  const countPend = pendientes?.length ?? 0
  const countAfil = afiliaciones?.length ?? 0

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-8">
        {/* ============================================================
            Atajos de gestión
            ============================================================ */}
        <nav aria-label="Acciones rápidas" className="grid grid-cols-1 gap-2">
          <Link
            href="/admin/novedades"
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
              >
                <MegaphoneIcon />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-brand-ink">
                  Gestionar novedades
                </span>
                <span className="text-xs text-brand-muted">
                  Crear, editar, despublicar
                </span>
              </div>
            </div>
            <span aria-hidden className="text-brand-blue">→</span>
          </Link>

          <Link
            href="/admin/beneficios"
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xl"
              >
                🎁
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-brand-ink">
                  Gestionar beneficios
                </span>
                <span className="text-xs text-brand-muted">
                  Subsidios, salud, turismo, capacitaciones
                </span>
              </div>
            </div>
            <span aria-hidden className="text-brand-blue">→</span>
          </Link>

          <Link
            href="/admin/mensajes"
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
              >
                <ChatIcon />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-brand-ink">
                  Mensajes de delegados
                </span>
                <span className="text-xs text-brand-muted">
                  {(mensajesNoLeidos ?? 0) === 0
                    ? 'Sin mensajes pendientes'
                    : `${mensajesNoLeidos} sin leer`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(mensajesNoLeidos ?? 0) > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                  {mensajesNoLeidos}
                </span>
              )}
              <span aria-hidden className="text-brand-blue">→</span>
            </div>
          </Link>

          <Link
            href="/notificaciones"
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
              >
                <BellIcon />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-brand-ink">
                  Notificaciones
                </span>
                <span className="text-xs text-brand-muted">
                  {notifNoLeidas === 0
                    ? 'Sin nuevas'
                    : `${notifNoLeidas} sin leer`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {notifNoLeidas > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {notifNoLeidas}
                </span>
              )}
              <span aria-hidden className="text-brand-blue">→</span>
            </div>
          </Link>

          <Link
            href="/admin/padron"
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
              >
                <UploadIcon />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-brand-ink">
                  Padrón ANSES
                </span>
                <span className="text-xs text-brand-muted">
                  Cargar Excel mensual + historial
                </span>
              </div>
            </div>
            <span aria-hidden className="text-brand-blue">→</span>
          </Link>

          <Link
            href="/admin/dashboard"
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
              >
                <ChartIcon />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-brand-ink">
                  Dashboard CD
                </span>
                <span className="text-xs text-brand-muted">
                  Métricas para Comisión Directiva
                </span>
              </div>
            </div>
            <span aria-hidden className="text-brand-blue">→</span>
          </Link>

          <Link
            href="/admin/cotizantes"
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
              >
                <SearchIcon />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-brand-ink">
                  Cotizantes
                </span>
                <span className="text-xs text-brand-muted">
                  Buscar por nombre / legajo / DNI
                </span>
              </div>
            </div>
            <span aria-hidden className="text-brand-blue">→</span>
          </Link>

          <Link
            href="/admin/adherentes"
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card transition hover:shadow-cardHover"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
              >
                <FamilyIcon />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-brand-ink">
                  Adherentes
                </span>
                <span className="text-xs text-brand-muted">
                  Cargar Excel de familiares
                </span>
              </div>
            </div>
            <span aria-hidden className="text-brand-blue">→</span>
          </Link>
        </nav>

        {/* ============================================================
            Sección 1 — Solicitudes pendientes (no en padrón)
            ============================================================ */}
        <div className="flex flex-col gap-3">
          <header className="rounded-xl bg-white p-4 shadow-card">
            <h2 className="text-lg font-semibold text-brand-ink">
              Solicitudes pendientes
            </h2>
            <p className="mt-1 text-sm text-brand-muted">
              {countPend === 0
                ? 'No hay solicitudes esperando revisión.'
                : `${countPend} ${countPend === 1 ? 'solicitud' : 'solicitudes'} esperando tu decisión.`}
            </p>
          </header>

          {countPend === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
              Todo al día. 🎉
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {pendientes!.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-brand-muted">
                        {s.sub_flujo === 'activo' ? 'Activo' : 'Sin legajo'}
                      </span>
                      <h3 className="text-base font-semibold text-brand-ink">
                        {s.nombre_completo ?? `DNI ${s.dni}`}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      {motivoLabel[s.motivo_pendiente] ?? s.motivo_pendiente}
                    </span>
                  </header>

                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-brand-muted">DNI</dt>
                      <dd className="text-brand-ink">{s.dni}</dd>
                    </div>
                    {s.legajo && (
                      <div>
                        <dt className="text-xs text-brand-muted">Legajo</dt>
                        <dd className="text-brand-ink">{s.legajo}</dd>
                      </div>
                    )}
                    <div className="col-span-2">
                      <dt className="text-xs text-brand-muted">Email</dt>
                      <dd className="break-all text-brand-ink">{s.email}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-brand-muted">Recibida</dt>
                      <dd className="text-brand-ink">
                        {formatDateTime(s.created_at)}
                      </dd>
                    </div>
                  </dl>

                  <PendienteActions solicitudId={s.id} dni={s.dni} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ============================================================
            Sección 2 — Solicitudes de afiliación online (wizard + firma)
            ============================================================ */}
        <div className="flex flex-col gap-3">
          <header className="rounded-xl bg-white p-4 shadow-card">
            <h2 className="text-lg font-semibold text-brand-ink">
              Solicitudes de afiliación
            </h2>
            <p className="mt-1 text-sm text-brand-muted">
              {countAfil === 0
                ? 'No hay solicitudes de afiliación esperando revisión.'
                : `${countAfil} ${countAfil === 1 ? 'solicitud' : 'solicitudes'} para revisar.`}
            </p>
            <p className="mt-2 text-xs text-brand-muted">
              Aprobar acá registra la decisión. El alta efectiva en ANSES
              (descuento del 3%) se sigue gestionando aparte.
            </p>
          </header>

          {countAfil === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
              Sin solicitudes de afiliación nuevas.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {afiliaciones!.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-brand-muted">
                        Afiliación online
                      </span>
                      <h3 className="text-base font-semibold text-brand-ink">
                        {s.apellido_nombre}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue">
                      {s.tipo_planta === 'permanente' ? 'Permanente' : 'Transitoria'}
                    </span>
                  </header>

                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-brand-muted">Documento</dt>
                      <dd className="text-brand-ink">
                        {s.tipo_documento} {s.numero_documento}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-brand-muted">Legajo</dt>
                      <dd className="text-brand-ink">{s.numero_legajo}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-brand-muted">Email</dt>
                      <dd className="break-all text-brand-ink">{s.email}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-brand-muted">Recibida</dt>
                      <dd className="text-brand-ink">
                        {formatDateTime(s.created_at)}
                      </dd>
                    </div>
                  </dl>

                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-brand-blue marker:hidden [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">▸ Ver detalle completo + firma</span>
                      <span className="hidden group-open:inline">▾ Ocultar detalle</span>
                    </summary>
                    <AfiliacionDetail {...s} />
                  </details>

                  <AfiliacionActions
                    solicitudId={s.id}
                    apellidoNombre={s.apellido_nombre}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function MegaphoneIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <path
        d="M3 11v2a4 4 0 004 4h1l4 4V7l-4 4H7a4 4 0 00-4 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 8a4 4 0 010 8M19 5a8 8 0 010 14"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FamilyIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <circle cx="8" cy="6" r="3" />
      <circle cx="16" cy="6" r="3" />
      <path d="M2 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M14 21v-2a4 4 0 014-4h0a4 4 0 014 4v2" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <path
        d="M3 3v18h18M7 14l4-4 4 4 5-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <path
        d="M12 4v12m0-12l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
    >
      <path
        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 17a3 3 0 006 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
