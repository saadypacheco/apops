import type { Metadata } from 'next'
import Link from 'next/link'

// Placeholder mínimo para el caso no_match (DNI no validado contra padrón).
// La versión definitiva, con CTA y mensajes diferenciados por sub-flujo, vive
// en US3 (T059). Para US1 alcanza con confirmar al usuario que su solicitud
// quedó registrada.

export const metadata: Metadata = {
  title: 'Verificando tu afiliación',
  description:
    'Recibimos tu solicitud y la estamos revisando. Te avisaremos por email.',
}

export default function PendienteValidacionPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center gap-6 p-6 text-center">
      <header className="flex flex-col gap-3 pt-10">
        <div
          aria-hidden
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl"
        >
          ⏳
        </div>
        <h1 className="text-2xl font-semibold text-[#042C53]">
          Estamos verificando tu afiliación
        </h1>
        <p className="text-base text-[#5F5E5A]">
          Recibimos tu solicitud y un administrador la va a revisar. Te
          avisaremos por email cuando esté lista.
        </p>
      </header>

      <Link
        href="/login"
        className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700"
      >
        Volver al inicio
      </Link>
    </main>
  )
}
