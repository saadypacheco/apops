'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { subirPadron } from '@/lib/admin/actions-padron'
import { Button } from '@/components/ui/Button'
import type { SubirPadronState } from '@/types/padron'

const initial: SubirPadronState = {}

function formatPercent(part: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PadronUploadForm() {
  const [state, action] = useFormState(subirPadron, initial)

  // El input file mantiene su File entre renders de useFormState — el
  // usuario puede hacer click en "Reemplazar" sin re-seleccionar.
  const needsConf = state.needsConfirmation
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
            Cargar padrón ANSES
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            Archivo .xlsx con el padrón mensual. El período se detecta
            automáticamente desde la celda A1.
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

        {needsConf && (
          <div
            role="alert"
            className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
          >
            <strong className="block font-semibold">
              Ya existe una carga para {needsConf.periodo.label}
            </strong>
            <p className="mt-1 text-xs">
              Importado el {formatFecha(needsConf.snapshotExistente.importado_at)},{' '}
              {needsConf.snapshotExistente.total_filas} filas.
            </p>
            <p className="mt-2 text-xs">
              Si querés <strong>reemplazarla</strong> con este archivo, hacé
              click en &quot;Reemplazar&quot;. La carga anterior se borra y todos
              los afiliados se re-vinculan al nuevo padrón.
            </p>
            {/* Cuando viene needsConfirmation, agregamos el force=true al
                próximo submit. El archivo sigue cargado en el input. */}
            <input type="hidden" name="force" value="true" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="archivo"
            className="text-sm font-medium text-brand-ink"
          >
            Archivo Excel del padrón
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
            Solo .xlsx. Máximo 15 MB. La hoja debe llamarse &quot;Padron&quot;
            o ser la primera del libro.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SubmitBtn isReplace={!!needsConf} />
          {needsConf && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm text-brand-muted hover:text-brand-blue hover:underline"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {success && <SuccessSummary success={success} />}
    </div>
  )
}

function SubmitBtn({ isReplace }: { isReplace: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending
        ? isReplace
          ? 'Reemplazando…'
          : 'Procesando archivo…'
        : isReplace
          ? 'Reemplazar'
          : 'Subir padrón'}
    </Button>
  )
}

function SuccessSummary({
  success,
}: {
  success: NonNullable<SubirPadronState['success']>
}) {
  const { periodo, totals, bajasAutomaticas, afiliadosSinMatch, softErrors } =
    success
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
      <header>
        <h3 className="text-base font-semibold text-emerald-900">
          ✓ Padrón {periodo.label} cargado
        </h3>
        <p className="mt-1 text-sm text-emerald-800">
          {totals.filas.toLocaleString('es-AR')} cotizantes procesados.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Stat label="APOPS" value={totals.apops} of={totals.filas} />
        <Stat label="ATE" value={totals.ate} of={totals.filas} />
        <Stat label="UPCN" value={totals.upcn} of={totals.filas} />
        <Stat label="SECASFPI" value={totals.secasfpi} of={totals.filas} />
        <Stat label="Solo papel" value={totals.papel} />
        <Stat label="Delegados" value={totals.delegados} />
        <Stat label="Planta Perm." value={totals.plantaPerm} of={totals.filas} />
        <Stat label="Planta Trans." value={totals.plantaTrans} of={totals.filas} />
      </dl>

      <div className="rounded-lg bg-white p-3 text-sm">
        <h4 className="font-semibold text-brand-ink">Impacto sobre afiliados</h4>
        <ul className="mt-1 space-y-0.5 text-xs text-brand-muted">
          <li>
            <strong className="text-brand-ink">{bajasAutomaticas}</strong> afiliado(s) marcados de baja
            automáticamente (estaban en el padrón anterior y ya no aparecen, o
            el Excel los marcaba como baja).
          </li>
          <li>
            <strong className="text-brand-ink">{afiliadosSinMatch}</strong> afiliado(s) sin matchear
            (vinieron por solicitud y todavía no aparecen en el padrón).
          </li>
        </ul>
      </div>

      {softErrors.length > 0 && (
        <details className="rounded-lg bg-white p-3 text-sm">
          <summary className="cursor-pointer font-medium text-brand-ink">
            Avisos del archivo ({softErrors.length})
          </summary>
          <ul className="mt-2 max-h-60 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-brand-muted">
            {softErrors.map((e, i) => (
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

function Stat({
  label,
  value,
  of,
}: {
  label: string
  value: number
  of?: number
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-emerald-700">
        {label}
      </dt>
      <dd className="text-lg font-semibold text-emerald-900">
        {value.toLocaleString('es-AR')}
        {of !== undefined && (
          <span className="ml-1 text-xs font-normal text-emerald-700">
            ({formatPercent(value, of)})
          </span>
        )}
      </dd>
    </div>
  )
}
