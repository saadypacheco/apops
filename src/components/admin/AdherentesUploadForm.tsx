'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { subirAdherentes, type SubirAdherentesState } from '@/lib/admin/actions-adherentes'
import { Button } from '@/components/ui/Button'

const initial: SubirAdherentesState = {}

export function AdherentesUploadForm() {
  const [state, action] = useFormState(subirAdherentes, initial)
  const success = state.success

  return (
    <div className="flex flex-col gap-4">
      <form
        action={action}
        className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card"
        noValidate
      >
        <header>
          <h2 className="text-lg font-semibold text-brand-ink">
            Cargar adherentes (familiares)
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            Archivo .xlsx con la lista de familiares de cotizantes. Cada fila
            debe tener al menos: DNI o Legajo del titular + Nombre + Vínculo.
          </p>
        </header>

        {state.error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
          >
            <strong className="font-semibold">Error: </strong>
            {state.error}
            {state.fatalErrors && state.fatalErrors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium">
                  Ver detalle ({state.fatalErrors.length})
                </summary>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {state.fatalErrors.slice(0, 20).map((e, i) => (
                    <li key={i}>
                      {e.row ? `Fila ${e.row}: ` : ''}
                      {e.message}
                    </li>
                  ))}
                  {state.fatalErrors.length > 20 && (
                    <li className="italic">
                      …y {state.fatalErrors.length - 20} más.
                    </li>
                  )}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="archivo"
            className="text-sm font-medium text-brand-ink"
          >
            Archivo Excel de adherentes
          </label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="block w-full text-sm text-brand-ink file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-blue hover:file:bg-brand-blue/20"
          />
          <p className="text-xs text-brand-muted">
            Columnas esperadas (case-insensitive): Titular DNI / Titular Legajo,
            Nombre, DNI (opcional), Vínculo (conyuge / hijo / hija / padre /
            madre / hermano / hermana / otro), Fecha Nacimiento (opcional),
            Email (opcional), Teléfono (opcional).
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-brand-ink">Modo</span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="modo"
              value="reemplazo"
              defaultChecked
            />
            <span>
              <strong>Reemplazar:</strong> borra todos los adherentes anteriores
              y carga los nuevos. Recomendado para sincronización completa.
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="modo" value="agregar" />
            <span>
              <strong>Agregar:</strong> suma los nuevos a los existentes. Para
              cargas incrementales. Atención: puede duplicar si un mismo
              familiar ya estaba.
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <SubmitBtn />
        </div>
      </form>

      {success && <SuccessSummary success={success} />}
    </div>
  )
}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Procesando…' : 'Cargar adherentes'}
    </Button>
  )
}

function SuccessSummary({
  success,
}: {
  success: NonNullable<SubirAdherentesState['success']>
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
      <header>
        <h3 className="text-base font-semibold text-emerald-900">
          ✓ Adherentes cargados
        </h3>
        <p className="mt-1 text-sm text-emerald-800">
          {success.insertados.toLocaleString('es-AR')} adherentes vinculados a{' '}
          {success.titularesConAdherentes.toLocaleString('es-AR')} titulares.
          Modo: <strong>{success.modo === 'reemplazo' ? 'reemplazo total' : 'agregado'}</strong>.
        </p>
      </header>
      {success.softErrors.length > 0 && (
        <details className="rounded-lg bg-white p-3 text-sm">
          <summary className="cursor-pointer font-medium text-brand-ink">
            Avisos del archivo ({success.softErrors.length})
          </summary>
          <ul className="mt-2 max-h-60 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-brand-muted">
            {success.softErrors.map((e, i) => (
              <li key={i}>
                Fila {e.row} · {e.column}: {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
