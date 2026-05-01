import type { Metadata } from 'next'

// Placeholder mínimo para el destino post-login. La feature de Feed real es
// parte del MVP (módulo 4 — Comunicados básicos) y se implementa en una
// feature separada. Para US1 alcanza con confirmar al usuario que la sesión
// quedó iniciada.

export const metadata: Metadata = {
  title: 'Inicio',
}

export default function FeedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold text-[#042C53]">¡Hola!</h1>
      <p className="text-base text-[#5F5E5A]">
        Iniciaste sesión correctamente. Acá vas a ver las novedades del gremio
        cuando esa feature esté lista.
      </p>
    </main>
  )
}
