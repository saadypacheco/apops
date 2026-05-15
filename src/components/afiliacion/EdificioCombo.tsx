'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

// Combo de edificio con autocomplete. Lista única desde /api/edificios
// (padrón actual). El valor seleccionado se entrega al form vía input
// hidden con name="edificioUdai" — compatible con el resto del wizard.
//
// UX:
//   - Input texto con datalist de browser nativo (lo más simple y
//     accesible). El user puede tipear y filtrar; si su edificio no
//     aparece, puede dejar el texto que escribió.
//   - Loading state mientras carga el fetch inicial.
//   - Si el endpoint falla, degrada a input texto libre.

type Props = {
  name?: string
  defaultValue?: string
}

export function EdificioCombo({
  name = 'edificioUdai',
  defaultValue = '',
}: Props) {
  const [edificios, setEdificios] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const listId = useRef(`edificios-${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    let cancelled = false
    fetch('/api/edificios')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { edificios?: string[] }) => {
        if (cancelled) return
        setEdificios(j.edificios ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hint = useMemo(() => {
    if (loading) return 'Cargando edificios del padrón…'
    if (error) return 'No pudimos cargar el listado. Escribilo a mano.'
    const n = edificios?.length ?? 0
    return n > 0
      ? `Empezá a escribir para filtrar entre ${n} edificios. Si el tuyo no aparece, escribilo igual.`
      : 'Escribí el nombre de tu edificio.'
  }, [loading, error, edificios])

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={`f-${name}`}
        className="text-sm font-medium text-brand-ink"
      >
        Edificio / UDAI donde trabajás
      </label>
      <input
        id={`f-${name}`}
        name={name}
        type="text"
        list={edificios && edificios.length > 0 ? listId : undefined}
        defaultValue={defaultValue}
        placeholder={loading ? 'Cargando…' : 'Ej: UDAI Once'}
        autoComplete="off"
        className="w-full min-h-touch rounded-md border border-neutral-300 bg-white px-3 py-2 text-base placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-1"
      />
      {edificios && edificios.length > 0 && (
        <datalist id={listId}>
          {edificios.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
      )}
      <p className="text-xs text-brand-muted">{hint}</p>
    </div>
  )
}
