import type { Metadata } from 'next'
import Link from 'next/link'

// Placeholder. La versión definitiva (T068, Phase 6 Polish) agrega CTA
// "Pedir uno nuevo" sin reingresar DNI/legajo (FR-017) y diferencia mensajes
// según el query param `reason` (expired | used | invalid).

export const metadata: Metadata = {
  title: 'Enlace inválido',
}

export default function MagicLinkExpiradoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center gap-6 p-6 text-center">
      <header className="flex flex-col gap-3 pt-10">
        <h1 className="text-2xl font-semibold text-[#042C53]">
          El enlace ya no sirve
        </h1>
        <p className="text-base text-[#5F5E5A]">
          Puede haber expirado o haberse usado antes. Volvé a la pantalla de
          ingreso para pedir uno nuevo.
        </p>
      </header>

      <Link
        href="/login"
        className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700"
      >
        Volver al ingreso
      </Link>
    </main>
  )
}
