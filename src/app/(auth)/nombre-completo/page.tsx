import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { NombreCompletoForm } from '@/components/auth/NombreCompletoForm'
import { getAuthContext } from '@/lib/auth/auth-cookie'

export const metadata: Metadata = {
  title: 'Tu nombre completo',
  description:
    'Necesitamos tu nombre completo para registrar tu solicitud pendiente.',
}

// Solo accesible cuando el flujo previo dio motivo='dni_no_en_padron' en el
// sub-flujo 'sin_legajo'. Cualquier otro estado redirige al inicio del flujo.
// El padrón no tiene a la persona, por eso pedimos el nombre — el constraint
// chk_subflujo_data exige nombre_completo NOT NULL para sub_flujo='sin_legajo'.
export default function NombreCompletoPage() {
  const ctx = getAuthContext()
  if (!ctx) redirect('/login')
  if (
    ctx.flujo !== 'sin_legajo' ||
    ctx.match !== false ||
    ctx.motivo !== 'dni_no_en_padron'
  ) {
    redirect('/login-sin-legajo')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 pt-6">
        <h1 className="text-2xl font-semibold text-[#042C53]">
          Tu nombre completo
        </h1>
        <p className="text-base text-[#5F5E5A]">
          Tu DNI no figura en el padrón actual. Para que un administrador pueda
          revisar tu solicitud, necesitamos tu nombre completo.
        </p>
      </header>

      <NombreCompletoForm />
    </main>
  )
}
