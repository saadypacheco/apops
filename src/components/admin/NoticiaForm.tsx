'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import {
  crearNoticia,
  editarNoticia,
} from '@/lib/admin/actions-noticias'
import type { NoticiaFormState } from '@/types/noticias'
import { Button } from '@/components/ui/Button'

// Form reusable de noticia. Si recibe `noticia`, edita; si no, crea.

const initial: NoticiaFormState = {}

type NoticiaInicial = {
  id: string
  titulo: string
  resumen: string
  contenido: string | null
  autor: string | null
  destacada: boolean
  publicada: boolean
  audiencia: string
  tema: string
}

type Props = {
  noticia?: NoticiaInicial
  defaultAutor: string
}

export function NoticiaForm({ noticia, defaultAutor }: Props) {
  const isEdit = !!noticia
  const [state, action] = useFormState(
    isEdit ? editarNoticia : crearNoticia,
    initial,
  )

  return (
    <form
      action={action}
      className="flex w-full flex-col gap-4 rounded-2xl bg-white p-5 shadow-card"
      noValidate
    >
      {isEdit && <input type="hidden" name="id" value={noticia!.id} />}

      <header>
        <h2 className="text-lg font-semibold text-brand-ink">
          {isEdit ? 'Editar noticia' : 'Nueva noticia'}
        </h2>
        <p className="text-sm text-brand-muted">
          {isEdit
            ? 'Modificá los campos y guardá los cambios.'
            : 'Completá los campos y publicá la noticia.'}
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
        defaultValue={noticia?.titulo ?? ''}
        placeholder="Ej: Paritaria 2026 — propuesta salarial"
        required
        maxLength={200}
        error={state.fieldErrors?.titulo}
      />

      <Textarea
        id="resumen"
        name="resumen"
        label="Resumen"
        rows={3}
        defaultValue={noticia?.resumen ?? ''}
        placeholder="2-3 líneas que resumen lo principal. Aparece en la landing y el feed."
        required
        maxLength={500}
        error={state.fieldErrors?.resumen}
      />

      <Textarea
        id="contenido"
        name="contenido"
        label="Contenido completo (opcional)"
        rows={8}
        defaultValue={noticia?.contenido ?? ''}
        placeholder="Texto completo de la noticia. Aparece al hacer click en la card."
        maxLength={10000}
        error={state.fieldErrors?.contenido}
      />

      <Field
        id="autor"
        name="autor"
        label="Autor (opcional)"
        defaultValue={noticia?.autor ?? defaultAutor}
        placeholder="Ej: Comisión Directiva"
        maxLength={100}
        error={state.fieldErrors?.autor}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="audiencia"
            className="text-xs font-semibold uppercase tracking-wider text-brand-muted"
          >
            Quién la ve
          </label>
          <select
            id="audiencia"
            name="audiencia"
            defaultValue={noticia?.audiencia ?? 'todos'}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-base text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            <option value="todos">Todos los afiliados</option>
            <option value="delegados">Solo delegados</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="tema"
            className="text-xs font-semibold uppercase tracking-wider text-brand-muted"
          >
            Tema
          </label>
          <select
            id="tema"
            name="tema"
            defaultValue={noticia?.tema ?? 'general'}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-base text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            <option value="general">General</option>
            <option value="paritaria">Paritarias</option>
            <option value="material">Material</option>
            <option value="campana">Campañas</option>
          </select>
        </div>
      </div>
      <p className="-mt-2 text-xs text-brand-muted">
        &ldquo;Solo delegados&rdquo; no aparece en Novedades ni en la landing:
        se ve únicamente en el panel del delegado.
      </p>

      <div className="flex flex-col gap-2">
        <CheckboxField
          id="destacada"
          name="destacada"
          label="Destacada"
          hint="Aparece resaltada con borde verde lima."
          defaultChecked={noticia?.destacada ?? false}
        />
        <CheckboxField
          id="publicada"
          name="publicada"
          label="Publicada"
          hint="Si está desmarcada, queda como borrador (nadie la ve)."
          defaultChecked={noticia?.publicada ?? true}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <SubmitBtn isEdit={isEdit} />
        <Link
          href="/admin/novedades"
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
        ? isEdit
          ? 'Guardando…'
          : 'Publicando…'
        : isEdit
          ? 'Guardar cambios'
          : 'Publicar noticia'}
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
