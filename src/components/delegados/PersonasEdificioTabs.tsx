'use client'

import { useMemo, useState } from 'react'
import type { PersonaEdificio } from '@/lib/delegados/panel-queries'

// Listado de gente del edificio partido en Afiliados / Sin afiliar / En
// otro gremio, con buscador.
//
// El botón "Contactar" abre WhatsApp SIN destinatario: el padrón de ANSES
// no trae teléfono ni email, así que el delegado elige el contacto desde
// su agenda. Mismo criterio que el FAB de staff.

type Grupo = 'afiliados' | 'sinAfiliar' | 'otrosGremios'

const LABEL: Record<Grupo, string> = {
  afiliados: 'Afiliados',
  sinAfiliar: 'Sin afiliar',
  otrosGremios: 'En otro gremio',
}

function iniciales(nombre: string): string {
  const limpio = nombre.replace(',', ' ')
  const partes = limpio.split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}

function primerNombre(nombre: string): string {
  const partes = nombre.split(',')
  if (partes.length === 2) return partes[1]!.trim().split(/\s+/)[0] ?? nombre
  return partes[0]!.trim()
}

export function PersonasEdificioTabs({
  afiliados,
  sinAfiliar,
  otrosGremios,
  nombreDelegado,
}: {
  afiliados: PersonaEdificio[]
  sinAfiliar: PersonaEdificio[]
  otrosGremios: PersonaEdificio[]
  nombreDelegado: string
}) {
  const [grupo, setGrupo] = useState<Grupo>('afiliados')
  const [q, setQ] = useState('')

  const listas: Record<Grupo, PersonaEdificio[]> = useMemo(
    () => ({ afiliados, sinAfiliar, otrosGremios }),
    [afiliados, sinAfiliar, otrosGremios],
  )

  const visibles = useMemo(() => {
    const termino = q.trim().toLowerCase()
    const lista = listas[grupo]
    if (!termino) return lista
    return lista.filter(
      (p) =>
        p.nombre.toLowerCase().includes(termino) ||
        p.dni.includes(termino) ||
        (p.legajo ?? '').toLowerCase().includes(termino),
    )
  }, [listas, grupo, q])

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
            onClick={() => setGrupo(g)}
            className={
              'rounded-full px-3 py-1.5 text-sm font-semibold transition ' +
              (grupo === g
                ? 'bg-brand-blue text-white'
                : 'bg-white text-brand-muted shadow-card hover:text-brand-ink')
            }
          >
            {LABEL[g]} ({listas[g].length})
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-brand-muted">
          {q.trim()
            ? 'Nadie coincide con la búsqueda.'
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
              </div>

              {p.esApops ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  Afiliado
                </span>
              ) : (
                <ContactarBtn
                  persona={p}
                  nombreDelegado={nombreDelegado}
                />
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

function ContactarBtn({
  persona,
  nombreDelegado,
}: {
  persona: PersonaEdificio
  nombreDelegado: string
}) {
  const yo = primerNombre(nombreDelegado)
  const mensaje =
    `Hola ${primerNombre(persona.nombre)}, soy ${yo}, delegado/a de APOPS en ` +
    `${persona.edificio ?? 'tu edificio'}. ` +
    (persona.gremio
      ? '¿Tenés unos minutos para que te cuente qué ofrece APOPS?'
      : 'Quería contarte cómo afiliarte a APOPS y qué beneficios tenés.')

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
