'use client'

import { useState } from 'react'
import { CredencialCard } from './CredencialCard'
import { CompartirButton } from './CompartirButton'
import type { Credencial } from '@/lib/credencial/queries'

// Carrusel de credenciales con tabs por nombre (no flechas — pisaban datos
// importantes de la card). NO autoplay (decisión D8 del spec).

function shortName(cred: Credencial): string {
  if (cred.tipo === 'titular') return 'Yo'
  // Padrón viene como "Apellido, Nombres" o "Nombre Apellido"
  const parts = cred.nombre.split(',')
  if (parts.length === 2) {
    const nombres = parts[1]?.trim().split(/\s+/) ?? []
    return nombres[0] ?? cred.nombre
  }
  return cred.nombre.split(/\s+/)[0] ?? cred.nombre
}

export function CredencialCarousel({
  credenciales,
  baseUrl,
}: {
  credenciales: Credencial[]
  baseUrl: string
}) {
  const [idx, setIdx] = useState(0)
  const total = credenciales.length
  const cred = credenciales[idx]
  if (!cred) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs con nombres (solo si hay más de 1) */}
      {total > 1 && (
        <div
          role="tablist"
          aria-label="Elegir credencial"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none"
        >
          {credenciales.map((c, i) => {
            const active = i === idx
            return (
              <button
                key={c.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setIdx(i)}
                className={
                  'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ' +
                  (active
                    ? 'bg-brand-blue text-white shadow-card'
                    : 'bg-white text-brand-ink ring-1 ring-neutral-200 hover:ring-brand-blue/50')
                }
              >
                {shortName(c)}
              </button>
            )
          })}
        </div>
      )}

      <CredencialCard cred={cred} />

      {/* Compartir (solo para adherentes) */}
      {cred.tipo === 'adherente' && (
        <CompartirButton cred={cred} baseUrl={baseUrl} />
      )}
    </div>
  )
}
