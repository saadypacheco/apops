'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { submitDniLegajo } from '@/lib/auth/actions'
import type { FormState } from '@/types/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

const initial: FormState = {}

export function DniLegajoForm() {
  const [state, action] = useFormState(submitDniLegajo, initial)

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}

      <Input
        id="dni"
        name="dni"
        label="DNI"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required
        placeholder="Sin puntos ni espacios"
        error={state.fieldErrors?.['dni']}
      />

      <Input
        id="legajo"
        name="legajo"
        label="Legajo"
        type="text"
        autoComplete="off"
        required
        error={state.fieldErrors?.['legajo']}
      />

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Validando…' : 'Continuar'}
    </Button>
  )
}
