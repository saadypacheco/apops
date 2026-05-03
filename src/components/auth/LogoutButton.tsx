'use client'

import { useFormStatus } from 'react-dom'
import { logoutAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/Button'

// FR-014: logout en máximo 2 taps. Tap 1: este botón. Tap 2: el confirm
// nativo. Sin confirmación, un toque accidental cerraría la sesión — el
// confirm es la barrera de intencionalidad.
//
// Usamos confirm() del navegador en lugar de un dialog Radix para
// minimizar JS al cliente (constitución VII). El componente queda
// plano y accesible: el confirm es nativo y respeta lectores de pantalla.

export function LogoutButton() {
  return (
    <form
      action={logoutAction}
      onSubmit={(e) => {
        if (!window.confirm('¿Cerrar sesión?')) {
          e.preventDefault()
        }
      }}
    >
      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="secondary"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? 'Cerrando…' : 'Cerrar sesión'}
    </Button>
  )
}
