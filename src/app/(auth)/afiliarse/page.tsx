import type { Metadata } from 'next'
import Link from 'next/link'
import { AfiliacionForm } from '@/components/afiliacion/AfiliacionForm'

export const metadata: Metadata = {
  title: 'Afiliate a APOPS',
  description:
    'Formulario de afiliación al gremio APOPS. Completá tus datos y un administrador procesará tu solicitud.',
}

export default function AfiliarsePage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <header className="bg-brand-gradient px-5 pt-8 pb-10 text-white shadow-card">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-white/85 underline-offset-4 hover:underline"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Afiliate a APOPS
          </h1>
          <p className="text-sm text-white/90 sm:text-base">
            Completá la ficha de afiliación. Lo que envíes lo recibe la
            Comisión Directiva y te contactamos por email cuando esté
            procesada.
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-6 max-w-2xl px-5 pb-12">
        <AfiliacionForm />
      </div>
    </main>
  )
}
