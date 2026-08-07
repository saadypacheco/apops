'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import {
  crearBeneficio,
  editarBeneficio,
  type BeneficioFormState,
} from '@/lib/admin/actions-beneficios'
import { LABEL_CATEGORIA, ORDEN_CATEGORIAS } from '@/lib/beneficios/queries'
import type { Beneficio } from '@/lib/beneficios/queries'
import { Button } from '@/components/ui/Button'

// Form reusable de beneficio. Si recibe `beneficio`, edita; si no, crea.

const initial: BeneficioFormState = {}

export function BeneficioForm({ beneficio }: { beneficio?: Beneficio }) {
  const isEdit = !!beneficio
  const [state, action] = useFormState(
    isEdit ? editarBeneficio : crearBeneficio,
    initial,
  )

  return (
    <form
      action={action}
      className="flex w-full flex-col gap-4 rounded-2xl bg-white p-5 shadow-card"
      noValidate
    >
      {isEdit && <input type="hidden" name="id" value={beneficio!.id} />}

      <header>
        <h2 className="text-lg font-semibold text-brand-ink">
          {isEdit ? 'Editar beneficio' : 'Nuevo beneficio'}
        </h2>
        <p className="text-sm text-brand-muted">
          Lo que cargues acá aparece en el tab Beneficios de los afiliados.
        </p>
      </header>

      {state.error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200"
        >
          {state.error}
        </div>
      )}

      <Field
        id="titulo"
        name="titulo"
        label="Título"
        defaultValue={beneficio?.titulo ?? ''}
        placeholder="Ej: Subsidio por nacimiento"
        required
        maxLength={120}
        error={state.fieldErrors?.titulo}
      />

      <Textarea
        id="resumen"
        name="resumen"
        label="Resumen"
        rows={3}
        defaultValue={beneficio?.resumen ?? ''}
        placeholder="2-3 líneas. Es lo que se lee en la card del listado."
        required
        maxLength={400}
        error={state.fieldErrors?.resumen}
      />

      <Textarea
        id="detalle"
        name="detalle"
        label="Detalle (opcional)"
        rows={6}
        defaultValue={beneficio?.detalle ?? ''}
        placeholder="Requisitos, documentación necesaria, cómo tramitarlo."
        maxLength={5000}
        error={state.fieldErrors?.detalle}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="categoria"
          className="text-xs font-semibold uppercase tracking-wider text-brand-muted"
        >
          Categoría
        </label>
        <select
          id="categoria"
          name="categoria"
          defaultValue={beneficio?.categoria ?? 'otro'}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-base text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          {ORDEN_CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {LABEL_CATEGORIA[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field
          id="icono"
          name="icono"
          label="Ícono"
          defaultValue={beneficio?.icono ?? ''}
          placeholder="🎁"
          maxLength={8}
        />
        <Field
          id="destaque"
          name="destaque"
          label="Destaque"
          defaultValue={beneficio?.destaque ?? ''}
          placeholder="$400.000"
          maxLength={30}
        />
        <Field
          id="orden"
          name="orden"
          label="Orden"
          type="number"
          defaultValue={String(beneficio?.orden ?? 0)}
          min={0}
          max={9999}
        />
      </div>

      <Field
        id="link_externo"
        name="link_externo"
        label="Link externo (opcional)"
        type="url"
        defaultValue={beneficio?.link_externo ?? ''}
        placeholder="https://apops.org.ar/beneficios/"
        error={state.fieldErrors?.link_externo}
      />

      <div className="flex flex-col gap-2">
        <CheckboxField
          id="publicado"
          name="publicado"
          label="Publicado"
          hint="Si está desmarcado, los afiliados no lo ven."
          defaultChecked={beneficio?.publicado ?? true}
        />
        <CheckboxField
          id="proximamente"
          name="proximamente"
          label="Próximamente"
          hint="Se muestra con etiqueta 'Próximamente' y sin link activo."
          defaultChecked={beneficio?.proximamente ?? false}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <SubmitBtn isEdit={isEdit} />
        <Link
          href="/admin/beneficios"
          className="text-sm text-brand-muted hover:text-brand-blue hover:underline"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}

function SubmitBtn({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending
        ? 'Guardando…'
        : isEdit
          ? 'Guardar cambios'
          : 'Crear beneficio'}
    </Button>
  )
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

function Field({ id, label, error, ...inputProps }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-brand-muted"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        className={
          'rounded-lg border px-3 py-2 text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 ' +
          (error
            ? 'border-red-300 focus:ring-red-300'
            : 'border-neutral-300 focus:ring-brand-blue')
        }
        {...inputProps}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
}

function Textarea({ id, label, error, ...inputProps }: TextareaProps) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-brand-muted"
      >
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        className={
          'resize-y rounded-lg border px-3 py-2 text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 ' +
          (error
            ? 'border-red-300 focus:ring-red-300'
            : 'border-neutral-300 focus:ring-brand-blue')
        }
        {...inputProps}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

function CheckboxField({
  id,
  name,
  label,
  hint,
  defaultChecked,
}: {
  id: string
  name: string
  label: string
  hint?: string
  defaultChecked?: boolean
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 transition hover:border-brand-blue/30"
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-5 w-5 cursor-pointer accent-brand-blue"
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-brand-ink">{label}</span>
        {hint && <span className="text-xs text-brand-muted">{hint}</span>}
      </div>
    </label>
  )
}
