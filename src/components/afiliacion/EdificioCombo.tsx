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
  required?: boolean
  error?: string
}

export function EdificioCombo({
  name = 'edificioUdai',
  defaultValue = '',
  required = false,
  error,
}: Props) {
  const [edificios, setEdificios] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
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
        setLoadError(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hint = useMemo(() => {
    if (loading) return 'Cargando edificios del padrón…'
    if (loadError) return 'No pudimos cargar el listado. Escribilo a mano.'
    const n = edificios?.length ?? 0
    return n > 0
      ? `Empezá a escribir para filtrar entre ${n} edificios. Si el tuyo no aparece, escribilo igual.`
      : 'Escribí el nombre de tu edificio.'
  }, [loading, loadError, edificios])

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={`f-${name}`}
        className="text-sm font-medium text-brand-ink"
      >
        Edificio / UDAI donde trabajás{' '}
        {required && <span className="text-red-600">*</span>}
      </label>
      <input
        id={`f-${name}`}
        name={name}
        type="text"
        list={edificios && edificios.length > 0 ? listId : undefined}
        defaultValue={defaultValue}
        placeholder={loading ? 'Cargando…' : 'Ej: UDAI Once'}
        autoComplete="off"
        aria-invalid={error ? 'true' : undefined}
        className={
          'w-full min-h-touch rounded-md border bg-white px-3 py-2 text-base placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-1 ' +
          (error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-neutral-300 focus:ring-brand-blue')
        }
      />
      {edificios && edificios.length > 0 && (
        <datalist id={listId}>
          {edificios.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!error && <p className="text-xs text-brand-muted">{hint}</p>}
    </div>
  )
}
