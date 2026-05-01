'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { submitNombreCompleto } from '@/lib/auth/actions'
import type { FormState } from '@/types/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

const initial: FormState = {}

export function NombreCompletoForm() {
  const [state, action] = useFormState(submitNombreCompleto, initial)

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}

      <Input
        id="nombreCompleto"
        name="nombreCompleto"
        label="Nombre completo"
        type="text"
        autoComplete="name"
        required
        placeholder="Apellido, Nombres"
        hint="Como figura en tu DNI."
        error={state.fieldErrors?.['nombreCompleto']}
      />

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Guardando…' : 'Continuar'}
    </Button>
  )
}
