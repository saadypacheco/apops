'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { enviarNotificacion } from '@/lib/notificaciones/actions'
import type { DestinatarioCandidato, NotifFormState } from '@/types/notificaciones'
import type { Rol } from '@/lib/auth/role'

const initial: NotifFormState = {}

// Filtros disponibles según rol del autor.
type FiltroChip =
  | 'todos'
  | 'admins'
  | 'delegados'
  | 'afiliados-activos'
  | 'afiliados-jubilados'

const ROL_LABELS: Record<Rol, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800' },
  delegado: { label: 'Delegado', color: 'bg-amber-100 text-amber-800' },
  afiliado: { label: 'Afiliado', color: 'bg-cyan-100 text-cyan-800' },
}

type Props = {
  destinatarios: DestinatarioCandidato[]
  miRol: Rol
}

export function NuevaNotificacionForm({ destinatarios, miRol }: Props) {
  const [state, action] = useFormState(enviarNotificacion, initial)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<FiltroChip>('todos')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [modo, setModo] = useState<'editar' | 'preview'>('editar')

  // Filtrar la lista de candidatos en cliente
  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    return destinatarios.filter((d) => {
      if (q) {
        const haystack = `${d.nombre} ${d.dni} ${d.legajo ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (filtro === 'admins' && d.rol !== 'admin') return false
      if (filtro === 'delegados' && d.rol !== 'delegado') return false
      if (filtro === 'afiliados-activos') {
        if (d.rol !== 'afiliado' || d.tipo !== 'activo') return false
      }
      if (filtro === 'afiliados-jubilados') {
        if (d.rol !== 'afiliado' || d.tipo !== 'jubilado') return false
      }
      return true
    })
  }, [destinatarios, search, filtro])

  const allVisibleSelected =
    filtrados.length > 0 && filtrados.every((d) => seleccionados.has(d.afiliadoId))

  const toggleOne = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleVisible = () => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        filtrados.forEach((d) => next.delete(d.afiliadoId))
      } else {
        filtrados.forEach((d) => next.add(d.afiliadoId))
      }
      return next
    })
  }

  const limpiarSeleccion = () => setSeleccionados(new Set())

  // Lookup helper para el preview
  const seleccionadosArr = useMemo(() => {
    return destinatarios.filter((d) => seleccionados.has(d.afiliadoId))
  }, [destinatarios, seleccionados])

  // Validaciones de "Continuar a preview"
  const puedeContinuar =
    seleccionados.size > 0 && asunto.trim().length >= 3 && mensaje.trim().length >= 1

  const filtrosDisponibles: Array<{ id: FiltroChip; label: string }> = [
    { id: 'todos', label: 'Todos' },
    ...(miRol === 'admin' || miRol === 'afiliado'
      ? [{ id: 'admins' as FiltroChip, label: 'Admins' }]
      : []),
    ...(miRol === 'admin' || miRol === 'afiliado'
      ? [{ id: 'delegados' as FiltroChip, label: 'Delegados' }]
      : []),
    ...(miRol === 'admin' || miRol === 'delegado'
      ? [
          {
            id: 'afiliados-activos' as FiltroChip,
            label: 'Afiliados activos',
          },
        ]
      : []),
    ...(miRol === 'admin'
      ? [
          {
            id: 'afiliados-jubilados' as FiltroChip,
            label: 'Jubilados',
          },
        ]
      : []),
  ]

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Inputs hidden en modo preview, visibles en modo editar */}
      {/* Asunto */}
      <input type="hidden" name="asunto" value={asunto} />
      {/* Mensaje */}
      <input type="hidden" name="mensaje" value={mensaje} />
      {/* Destinatarios — uno por id seleccionado */}
      {Array.from(seleccionados).map((id) => (
        <input key={id} type="hidden" name="destinatarios" value={id} />
      ))}

      {state.error && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {state.error}
        </div>
      )}
      {state.success && (
        <div role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
          ✓ {state.success}
          <div className="mt-2">
            <Link href="/notificaciones" className="text-sm font-semibold text-emerald-800 underline">
              Volver al inbox →
            </Link>
          </div>
        </div>
      )}

      {modo === 'editar' && !state.success && (
        <>
          {/* Buscador */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-dest" className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Buscar destinatarios
            </label>
            <input
              id="search-dest"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, DNI o legajo..."
              className="rounded-lg border border-neutral-300 px-3 py-2 text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          {/* Chips filtros */}
          <div className="flex flex-wrap gap-2">
            {filtrosDisponibles.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={
                  'rounded-full px-3 py-1 text-xs font-semibold transition ' +
                  (filtro === f.id
                    ? 'bg-brand-blue text-white shadow-card'
                    : 'bg-neutral-100 text-brand-muted hover:bg-neutral-200')
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Listado */}
          <section
            aria-label="Destinatarios disponibles"
            className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-neutral-100"
          >
            <header className="flex items-center justify-between gap-2 text-xs">
              <span className="text-brand-muted">
                {filtrados.length} disponible{filtrados.length === 1 ? '' : 's'} ·{' '}
                <span className="font-semibold text-brand-blue">
                  {seleccionados.size} seleccionado{seleccionados.size === 1 ? '' : 's'}
                </span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleVisible}
                  disabled={filtrados.length === 0}
                  className="text-xs font-semibold text-brand-blue hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {allVisibleSelected ? 'Desmarcar visibles' : 'Marcar todos los visibles'}
                </button>
                {seleccionados.size > 0 && (
                  <>
                    <span aria-hidden className="text-brand-muted">·</span>
                    <button type="button" onClick={limpiarSeleccion} className="text-xs font-semibold text-brand-muted hover:underline">
                      Limpiar
                    </button>
                  </>
                )}
              </div>
            </header>

            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {filtrados.length === 0 ? (
                <li className="py-6 text-center text-sm text-brand-muted">
                  No hay coincidencias.
                </li>
              ) : (
                filtrados.map((d) => {
                  const checked = seleccionados.has(d.afiliadoId)
                  const rolBadge = ROL_LABELS[d.rol]
                  return (
                    <li key={d.afiliadoId}>
                      <label
                        className={
                          'flex cursor-pointer items-center gap-3 rounded-lg p-2 transition ' +
                          (checked ? 'bg-brand-blue/5 ring-1 ring-brand-blue/30' : 'hover:bg-neutral-50')
                        }
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(d.afiliadoId)}
                          className="h-4 w-4 cursor-pointer accent-brand-blue"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-brand-ink">
                            {d.nombre}
                          </p>
                          <p className="text-xs text-brand-muted">
                            DNI {d.dni}
                            {d.legajo ? ` · ${d.legajo}` : ''}
                          </p>
                        </div>
                        <span
                          className={'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' + rolBadge.color}
                        >
                          {rolBadge.label}
                        </span>
                      </label>
                    </li>
                  )
                })
              )}
            </ul>
          </section>

          {/* Plantillas rápidas — solo para admin */}
          {miRol === 'admin' && (
            <PlantillasRapidas
              onSelect={(asuntoTpl, mensajeTpl) => {
                setAsunto(asuntoTpl)
                setMensaje(mensajeTpl)
              }}
            />
          )}

          {/* Asunto + mensaje */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="asunto-input" className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Asunto
            </label>
            <input
              id="asunto-input"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              maxLength={200}
              placeholder="Ej: Recordatorio de plenario"
              className={
                'rounded-lg border px-3 py-2 text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 ' +
                (state.fieldErrors?.asunto
                  ? 'border-red-300 focus:ring-red-300'
                  : 'border-neutral-300 focus:ring-brand-blue')
              }
            />
            {state.fieldErrors?.asunto && (
              <p role="alert" className="text-sm text-red-600">
                {state.fieldErrors.asunto}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="mensaje-input" className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Mensaje
            </label>
            <textarea
              id="mensaje-input"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="Escribí lo que querés comunicar..."
              className={
                'resize-y rounded-lg border px-3 py-2 text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 ' +
                (state.fieldErrors?.mensaje
                  ? 'border-red-300 focus:ring-red-300'
                  : 'border-neutral-300 focus:ring-brand-blue')
              }
            />
            {state.fieldErrors?.mensaje && (
              <p role="alert" className="text-sm text-red-600">
                {state.fieldErrors.mensaje}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModo('preview')}
              disabled={!puedeContinuar}
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-btn-primary px-5 text-sm font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continuar →
            </button>
            <Link href="/notificaciones" className="text-sm text-brand-muted hover:text-brand-blue hover:underline">
              Cancelar
            </Link>
          </div>
        </>
      )}

      {modo === 'preview' && !state.success && (
        <PreviewBlock
          asunto={asunto}
          mensaje={mensaje}
          destinatarios={seleccionadosArr}
          onVolver={() => setModo('editar')}
        />
      )}
    </form>
  )
}

function PreviewBlock({
  asunto,
  mensaje,
  destinatarios,
  onVolver,
}: {
  asunto: string
  mensaje: string
  destinatarios: DestinatarioCandidato[]
  onVolver: () => void
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-brand-blue/30 bg-brand-blue/5 p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-brand-ink">Revisá antes de enviar</h3>
          <p className="text-xs text-brand-muted">
            Esta notificación se va a enviar a {destinatarios.length} destinatario
            {destinatarios.length === 1 ? '' : 's'}. Cada uno la recibe en privado.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-1 rounded-lg bg-white p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
          Asunto
        </p>
        <p className="text-base font-semibold text-brand-ink">{asunto}</p>
      </section>

      <section className="flex flex-col gap-1 rounded-lg bg-white p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
          Mensaje
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-ink">
          {mensaje}
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
          Destinatarios ({destinatarios.length})
        </p>
        <ul className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {destinatarios.map((d) => {
            const rolBadge = ROL_LABELS[d.rol]
            return (
              <li
                key={d.afiliadoId}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-1 text-xs"
              >
                <span className="font-medium text-brand-ink">{d.nombre}</span>
                <span className={'rounded-full px-1.5 py-0 text-[9px] font-bold ' + rolBadge.color}>
                  {rolBadge.label}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="flex items-center gap-3 pt-2">
        <ConfirmarBtn />
        <button
          type="button"
          onClick={onVolver}
          className="text-sm font-medium text-brand-muted hover:text-brand-blue hover:underline"
        >
          ← Volver a editar
        </button>
      </div>
    </div>
  )
}

function ConfirmarBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-bold uppercase tracking-wider text-white shadow-card transition hover:bg-emerald-700 hover:shadow-cardHover disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Enviando…' : 'Confirmar envío ✓'}
    </button>
  )
}

// =====================================================================
// Plantillas rápidas — solo admin
// =====================================================================

type Plantilla = {
  icon: string
  titulo: string
  asunto: string
  mensaje: string
}

const PLANTILLAS_ADMIN: Plantilla[] = [
  {
    icon: '🥽',
    titulo: 'Anteojos listos',
    asunto: 'Anteojos listos para retirar',
    mensaje:
      'Hola. Te avisamos que los anteojos están listos para retirar en la óptica. Coordiná con tu delegado o pasá por la sede del gremio para más detalles.',
  },
  {
    icon: '🌴',
    titulo: 'Vacaciones confirmadas',
    asunto: 'Reserva de vacaciones confirmada',
    mensaje:
      'Hola. Te confirmamos la reserva de vacaciones. Coordiná con tu delegado para más detalles de fechas, lugar y documentación.',
  },
  {
    icon: '📋',
    titulo: 'Trámite resuelto',
    asunto: 'Tu trámite fue resuelto',
    mensaje:
      'Hola. Te avisamos que el trámite quedó resuelto. Cualquier consulta, escribinos o coordiná con tu delegado.',
  },
  {
    icon: '📅',
    titulo: 'Recordatorio plenario',
    asunto: 'Recordatorio: próximo plenario',
    mensaje:
      'Hola. Te recordamos el próximo plenario. Esperamos contar con tu presencia.',
  },
]

function PlantillasRapidas({
  onSelect,
}: {
  onSelect: (asunto: string, mensaje: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-brand-blue/5 p-3 ring-1 ring-brand-blue/10">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
        Plantillas rápidas
      </span>
      <p className="text-xs text-brand-muted">
        Click en una plantilla pre-llena asunto + mensaje. Después podés editar
        lo que necesites.
      </p>
      <div className="flex flex-wrap gap-2">
        {PLANTILLAS_ADMIN.map((p) => (
          <button
            key={p.titulo}
            type="button"
            onClick={() => onSelect(p.asunto, p.mensaje)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink shadow-card transition hover:bg-brand-blue hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
          >
            <span aria-hidden>{p.icon}</span>
            {p.titulo}
          </button>
        ))}
      </div>
    </div>
  )
}
