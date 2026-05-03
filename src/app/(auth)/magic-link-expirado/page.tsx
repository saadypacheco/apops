import type { Metadata } from 'next'
import Link from 'next/link'
import { resendMagicLink } from '@/lib/auth/actions'
import { getRecentValidation } from '@/lib/auth/auth-cookie'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Enlace inválido',
}

interface PageProps {
  searchParams?: { reason?: string }
}

// Mensajes por motivo. El motivo viene del callback (route.ts) cuando el
// intercambio del token falla, o de resendMagicLink cuando rate-limita.
function messageFor(reason: string | undefined): { title: string; body: string } {
  switch (reason) {
    case 'rate_limit':
      return {
        title: 'Esperá un rato',
        body: 'Hiciste varios intentos seguidos. Probá de nuevo en una hora.',
      }
    case 'invalid':
    case 'expired':
    default:
      return {
        title: 'El enlace ya no sirve',
        body: 'Puede haber expirado o haberse usado antes.',
      }
  }
}

export default function MagicLinkExpiradoPage({ searchParams }: PageProps) {
  const { title, body } = messageFor(searchParams?.reason)
  const recent = getRecentValidation()
  const canResend = recent !== null && searchParams?.reason !== 'rate_limit'

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center gap-6 p-6 text-center">
      <header className="flex flex-col gap-3 pt-10">
        <div
          aria-hidden
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl"
        >
          ⏱
        </div>
        <h1 className="text-2xl font-semibold text-[#042C53]">{title}</h1>
        <p className="text-base text-[#5F5E5A]">{body}</p>
      </header>

      {canResend ? (
        <form action={resendMagicLink} className="flex flex-col gap-3 w-full">
          <Button type="submit">Pedir uno nuevo</Button>
          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 py-2 text-base text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Empezar de nuevo
          </Link>
        </form>
      ) : (
        <Link
          href="/login"
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700"
        >
          Volver al ingreso
        </Link>
      )}
    </main>
  )
}
