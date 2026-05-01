import type { Metadata } from 'next'
import Link from 'next/link'
import { DniSinLegajoForm } from '@/components/auth/DniSinLegajoForm'

export const metadata: Metadata = {
  title: 'Ingresar sin legajo',
  description:
    'Si sos jubilado o no tenés legajo de ANSES, ingresá solo con tu DNI.',
}

export default function LoginSinLegajoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 pt-6">
        <h1 className="text-2xl font-semibold text-[#042C53]">
          Ingresar sin legajo
        </h1>
        <p className="text-base text-[#5F5E5A]">
          Si sos jubilado afiliado a APOPS o no tenés legajo activo de ANSES,
          podés ingresar solo con tu DNI.
        </p>
      </header>

      <DniSinLegajoForm />

      <div className="flex flex-col items-center gap-2 pt-4">
        <span className="text-sm text-[#5F5E5A]">¿Tenés legajo de ANSES?</span>
        <Link
          href="/login"
          className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 py-2 text-base text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Ingresar con DNI y legajo
        </Link>
      </div>
    </main>
  )
}
