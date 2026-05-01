import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { EmailForm } from '@/components/auth/EmailForm'
import { getAuthContext } from '@/lib/auth/auth-cookie'

export const metadata: Metadata = {
  title: 'Tu email',
  description: 'Ingresá tu email para recibir el enlace de acceso.',
}

export default function EmailPage() {
  const ctx = getAuthContext()
  if (!ctx) {
    // Sin contexto → la cookie expiró o saltearon el flujo
    redirect('/login')
  }

  // Mensaje de contexto (no expone datos del padrón al cliente, solo el dato
  // que el propio usuario ingresó: su DNI)
  const subtitulo = ctx.match
    ? `Validamos tu DNI ${ctx.dni}. Ahora necesitamos tu email para enviarte el enlace.`
    : `Recibimos tu pedido. Necesitamos tu email para que un administrador pueda confirmar tu afiliación.`

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 pt-6">
        <h1 className="text-2xl font-semibold text-[#042C53]">Tu email</h1>
        <p className="text-base text-[#5F5E5A]">{subtitulo}</p>
      </header>

      <EmailForm />
    </main>
  )
}
