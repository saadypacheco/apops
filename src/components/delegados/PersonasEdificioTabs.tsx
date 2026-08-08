'use client'

import { useMemo, useState } from 'react'
import type {
  Oportunidad,
  PersonaEdificio,
} from '@/lib/delegados/panel-queries'
import { LABEL_MOTIVO } from '@/lib/delegados/panel-queries'

// Gente del edificio para el delegado, partida en cuatro solapas:
// Oportunidades (a quién conviene acercarse), Afiliados, Sin afiliar y
// En otro gremio.
//
// El botón "Contactar" abre WhatsApp SIN destinatario: el padrón de ANSES
// no trae teléfono ni email, así que el delegado elige el contacto desde
// su agenda. Mismo criterio que el FAB de staff.

type Grupo = 'oportunidades' | 'afiliados' | 'sinAfiliar' | 'otrosGremios'

const LABEL: Record<Grupo, string> = {
  oportunidades: 'Oportunidades',
  afiliados: 'Afiliados',
  sinAfiliar: 'Sin afiliar',
  otrosGremios: 'En otro gremio',
}

const COLOR_GREMIO: Record<string, string> = {
  ATE: 'bg-red-100 text-red-800',
  UPCN: 'bg-indigo-100 text-indigo-800',
  SEC: 'bg-purple-100 text-purple-800',
  SECASFPI: 'bg-slate-200 text-slate-800',
}

function iniciales(nombre: string): string {
  const partes = nombre.replace(',', ' ').split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}

function primerNombre(nombre: string): string {
  const partes = nombre.split(',')
  if (partes.length === 2) return partes[1]!.trim().split(/\s+/)[0] ?? nombre
  return partes[0]!.trim()
}

export function PersonasEdificioTabs({
  oportunidades,
  afiliados,
  sinAfiliar,
  otrosGremios,
  nombreDelegado,
}: {
  oportunidades: Oportunidad[]
  afiliados: PersonaEdificio[]
  sinAfiliar: PersonaEdificio[]
  otrosGremios: PersonaEdificio[]
  nombreDelegado: string
}) {
  const [grupo, setGrupo] = useState<Grupo>('oportunidades')
  const [q, setQ] = useState('')
  const [gremioFiltro, setGremioFiltro] = useState<string | null>(null)

  const listas = useMemo(
    () => ({ oportunidades, afiliados, sinAfiliar, otrosGremios }),
    [oportunidades, afiliados, sinAfiliar, otrosGremios],
  )

  // Gremios presentes, para el filtro secundario de "En otro gremio".
  const gremios = useMemo(() => {
    const s = new Set<string>()
    for (const p of otrosGremios) if (p.gremio) s.add(p.gremio)
    return Array.from(s).sort()
  }, [otrosGremios])

  const visibles = useMemo(() => {
    const termino = q.trim().toLowerCase()
    let lista: PersonaEdificio[] = listas[grupo]

    if (grupo === 'otrosGremios' && gremioFiltro) {
      lista = lista.filter((p) => p.gremio === gremioFiltro)
    }
    if (!termino) return lista

    return lista.filter(
      (p) =>
        p.nombre.toLowerCase().includes(termino) ||
        p.dni.includes(termino) ||
        (p.legajo ?? '').toLowerCase().includes(termino),
    )
  }, [listas, grupo, q, gremioFiltro])

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre, DNI o legajo"
        aria-label="Buscar persona"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-blue"
      />

      <div role="tablist" aria-label="Grupos" className="flex flex-wrap gap-2">
        {(Object.keys(LABEL) as Grupo[]).map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={grupo === g}
            onClick={() => {
              setGrupo(g)
              setGremioFiltro(null)
            }}
            className={
              'rounded-full px-3 py-1.5 text-sm font-semibold transition ' +
              (grupo === g
                ? 'bg-brand-blue text-white'
                : g === 'oportunidades' && listas.oportunidades.length > 0
                  ? 'bg-brand-lime/25 text-brand-deep shadow-card'
                  : 'bg-white text-brand-muted shadow-card hover:text-brand-ink')
            }
          >
            {g === 'oportunidades' && '⭐ '}
            {LABEL[g]} ({listas[g].length})
          </button>
        ))}
      </div>

      {grupo === 'oportunidades' && (
        <p className="rounded-lg bg-brand-blue/5 p-3 text-xs text-brand-muted">
          Personas del edificio a las que conviene acercarse, comparando el
          padrón de este mes contra el anterior. Primero las que dejaron su
          gremio y quedaron sin representación.
        </p>
      )}

      {grupo === 'otrosGremios' && gremios.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FiltroGremio
            label="Todos"
            activo={gremioFiltro === null}
            onClick={() => setGremioFiltro(null)}
          />
          {gremios.map((g) => (
            <FiltroGremio
              key={g}
              label={`${g} (${otrosGremios.filter((p) => p.gremio === g).length})`}
              activo={gremioFiltro === g}
              onClick={() => setGremioFiltro(g)}
            />
          ))}
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
          {q.trim()
            ? 'Nadie coincide con la búsqueda.'
            : grupo === 'oportunidades'
              ? 'No hay movimientos nuevos este mes. Cuando alguien deje su gremio o entre al edificio, va a aparecer acá.'
              : 'No hay personas en este grupo.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((p) => (
            <li
              key={p.dni}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-sm font-bold text-brand-blue"
              >
                {iniciales(p.nombre)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-ink">
                  {p.nombre}
                </p>
                <p className="truncate text-xs text-brand-muted">
                  DNI {p.dni}
                  {p.legajo ? ` · L-${p.legajo}` : ''}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {p.gremio && (
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                        (COLOR_GREMIO[p.gremio] ?? 'bg-neutral-200 text-neutral-800')
                      }
                    >
                      {p.gremio}
                    </span>
                  )}
                  {'motivo' in p && <MotivoBadge oportunidad={p as Oportunidad} />}
                </div>
              </div>

              {p.esApops ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  Afiliado
                </span>
              ) : (
                <ContactarBtn persona={p} nombreDelegado={nombreDelegado} />
              )}
            </li>
          ))}
        </ul>
      )}

      {grupo !== 'afiliados' && visibles.length > 0 && (
        <p className="text-xs text-brand-muted">
          &ldquo;Contactar&rdquo; abre WhatsApp con el mensaje ya escrito. Como
          el padrón no trae teléfonos, elegís vos el contacto de tu agenda.
        </p>
      )}
    </div>
  )
}

function MotivoBadge({ oportunidad }: { oportunidad: Oportunidad }) {
  const { motivo, gremioAnterior } = oportunidad
  const tono =
    motivo === 'dejo_gremio'
      ? 'bg-brand-lime/25 text-brand-deep'
      : motivo === 'ingreso_nuevo'
        ? 'bg-cyan-100 text-cyan-900'
        : motivo === 'cambio_gremio'
          ? 'bg-amber-100 text-amber-900'
          : 'bg-neutral-200 text-neutral-700'

  return (
    <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + tono}>
      {LABEL_MOTIVO[motivo]}
      {gremioAnterior && motivo !== 'sin_gremio' && ` · venía de ${gremioAnterior}`}
    </span>
  )
}

function FiltroGremio({
  label,
  activo,
  onClick,
}: {
  label: string
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={
        'rounded-full px-2.5 py-1 text-xs font-semibold transition ' +
        (activo
          ? 'bg-brand-deep text-white'
          : 'bg-white text-brand-muted shadow-card hover:text-brand-ink')
      }
    >
      {label}
    </button>
  )
}

function ContactarBtn({
  persona,
  nombreDelegado,
}: {
  persona: PersonaEdificio
  nombreDelegado: string
}) {
  const yo = primerNombre(nombreDelegado)
  const dejoGremio =
    'motivo' in persona &&
    (persona as Oportunidad).motivo === 'dejo_gremio'
  const esNuevo =
    'motivo' in persona &&
    (persona as Oportunidad).motivo === 'ingreso_nuevo'

  // El mensaje cambia según por qué lo estamos contactando: no es lo mismo
  // alguien que acaba de dejar su gremio que alguien que recién entró.
  const cierre = dejoGremio
    ? 'Vi que ya no estás afiliado/a a tu gremio anterior. ¿Querés que te cuente qué ofrece APOPS?'
    : esNuevo
      ? '¡Bienvenido/a al edificio! ¿Querés que te cuente qué ofrece APOPS?'
      : persona.gremio
        ? '¿Tenés unos minutos para que te cuente qué ofrece APOPS?'
        : 'Quería contarte cómo afiliarte a APOPS y qué beneficios tenés.'

  const mensaje =
    `Hola ${primerNombre(persona.nombre)}, soy ${yo}, delegado/a de APOPS en ` +
    `${persona.edificio ?? 'tu edificio'}. ${cierre}`

  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 rounded-full bg-brand-blue px-3 py-1 text-[11px] font-bold text-white transition hover:bg-brand-blue/90"
    >
      Contactar
    </a>
  )
}
