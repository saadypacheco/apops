'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { submitEmail } from '@/lib/auth/actions'
import type { FormState } from '@/types/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

const initial: FormState = {}

export function EmailForm() {
  const [state, action] = useFormState(submitEmail, initial)

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}

      <Input
        id="email"
        name="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="tu@email.com"
        hint="Te vamos a enviar un enlace para entrar."
        error={state.fieldErrors?.['email']}
      />

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Enviando…' : 'Enviarme el enlace'}
    </Button>
  )
}
