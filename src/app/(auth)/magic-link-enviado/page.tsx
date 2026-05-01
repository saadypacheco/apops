import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Te enviamos un enlace',
  description: 'Revisá tu email y hacé clic en el enlace para entrar.',
}

export default function MagicLinkEnviadoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center gap-6 p-6 text-center">
      <header className="flex flex-col gap-3 pt-10">
        <div
          aria-hidden
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl"
        >
          ✉
        </div>
        <h1 className="text-2xl font-semibold text-[#042C53]">
          Te enviamos un enlace por email
        </h1>
        <p className="text-base text-[#5F5E5A]">
          Abrí tu correo y hacé clic en el enlace para entrar a APOPS Siempre.
          El enlace puede tardar unos segundos en llegar.
        </p>
      </header>

      <p className="text-sm text-[#5F5E5A]">
        ¿No te llegó? Revisá la carpeta de spam o pedí uno nuevo desde la pantalla de ingreso.
      </p>
    </main>
  )
}
