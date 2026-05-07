import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/landing/Logo'
import { RegistroForm } from '@/components/auth/RegistroForm'

export const metadata: Metadata = {
  title: 'Crear cuenta — APOPS Siempre',
  description:
    'Si estás en el padrón APOPS, registrate con tu DNI o legajo y empezá a usar la app.',
}

export default async function RegistrarsePage() {
  // Si ya hay sesión, no tiene sentido registrarse
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect('/')
  }

  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col bg-brand-gradient">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_18%,rgba(255,255,255,0.18),transparent_55%)]"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
        <header className="flex flex-col items-center gap-3 pb-6">
          <Logo width={220} />
          <h1 className="text-center text-xl font-bold text-white">
            Crear cuenta
          </h1>
          <p className="text-center text-sm text-white/80">
            Validamos tus datos contra el padrón. Si estás como afiliado o
            cotizante, podés ingresar.
          </p>
        </header>

        <RegistroForm />
      </div>
    </main>
  )
}
