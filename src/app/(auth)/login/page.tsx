import type { Metadata } from 'next'
import { DniLegajoForm } from '@/components/auth/DniLegajoForm'
import { LinkNoTengoLegajo } from '@/components/auth/LinkNoTengoLegajo'

export const metadata: Metadata = {
  title: 'Ingresar',
  description: 'Validá tu DNI y legajo para entrar a APOPS Siempre.',
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 pt-6">
        <h1 className="text-2xl font-semibold text-[#042C53]">
          Ingresar a APOPS Siempre
        </h1>
        <p className="text-base text-[#5F5E5A]">
          Validamos tu afiliación con tu DNI y legajo de ANSES.
        </p>
      </header>

      <DniLegajoForm />

      <div className="flex flex-col items-center gap-2 pt-4">
        <span className="text-sm text-[#5F5E5A]">¿Sos jubilado o no tenés legajo?</span>
        <LinkNoTengoLegajo />
      </div>
    </main>
  )
}
