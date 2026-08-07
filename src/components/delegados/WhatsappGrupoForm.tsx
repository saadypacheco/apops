'use client'

import { useFormState, useFormStatus } from 'react-dom'
import {
  guardarWhatsappGrupo,
  type WhatsappGrupoState,
} from '@/lib/delegados/actions'
import { Button } from '@/components/ui/Button'

const initial: WhatsappGrupoState = {}

export type EdificioLink = { edificio: string; link: string | null }

export function WhatsappGrupoForm({
  edificios,
}: {
  edificios: EdificioLink[]
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-card">
      <div>
        <h2 className="text-lg font-semibold text-brand-ink">
          Grupo de WhatsApp del edificio
        </h2>
        <p className="text-sm text-brand-muted">
          El grupo es del edificio, compartido por todos sus delegados. Los
          afiliados que trabajan ahí lo ven en el botón “Hablar con delegado”
          de su inicio. Si ya lo cargó otro delegado, guardar acá lo reemplaza.
        </p>
      </div>

      {edificios.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-brand-muted">
          Todavía no figurás como representante de ningún edificio en el
          padrón, así que no hay grupo para cargar.
        </p>
      ) : (
        edificios.map((e) => (
          <EdificioRow key={e.edificio} edificio={e.edificio} link={e.link} />
        ))
      )}
    </section>
  )
}

function EdificioRow({
  edificio,
  link,
}: {
  edificio: string
  link: string | null
}) {
  const [state, action] = useFormState(guardarWhatsappGrupo, initial)

  return (
    <form action={action} className="flex flex-col gap-2 border-t pt-3">
      <input type="hidden" name="edificio" value={edificio} />

      <label
        htmlFor={`link-${edificio}`}
        className="text-xs font-semibold uppercase tracking-wider text-brand-muted"
      >
        {edificio}
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-emerald-700">
          ✓ {state.success}
        </p>
      )}

      <input
        id={`link-${edificio}`}
        type="url"
        name="link"
        defaultValue={link ?? ''}
        placeholder="https://chat.whatsapp.com/AbCdEf123"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-base text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-blue"
      />

      <SubmitBtn hasLink={!!link} />
    </form>
  )
}

function SubmitBtn({ hasLink }: { hasLink: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Guardando…' : hasLink ? 'Actualizar link' : 'Guardar link'}
    </Button>
  )
}
