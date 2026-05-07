import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/landing/Logo'
import { MagicLinkForm } from '@/components/auth/MagicLinkForm'

export const metadata: Metadata = {
  title: 'Ingresar con magic link',
}

// F3: Form real para pedir magic link. Reemplaza el stub anterior.
// El parámetro `?modo=reset` muestra la copy de "recuperar clave" en vez
// de "ingresar con magic link" (D5: misma implementación, dos casos).
export default function LoginMagicLinkPage({
  searchParams,
}: {
  searchParams?: { modo?: string }
}) {
  const modo = searchParams?.modo === 'reset' ? 'reset' : 'login'

  return (
    <main className="relative min-h-[100dvh] w-full bg-brand-gradient">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_18%,rgba(255,255,255,0.18),transparent_55%)]"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-col items-center gap-5 px-5 py-10">
        <Logo width={200} />

        <MagicLinkForm modo={modo} />

        <Link
          href="/"
          className="self-center text-sm font-medium text-white/85 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  )
}
