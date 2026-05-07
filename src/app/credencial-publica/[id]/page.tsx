import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CredencialCard } from '@/components/credencial/CredencialCard'
import { getCredencialAdherentePublica } from '@/lib/credencial/queries'

export const metadata: Metadata = {
  title: 'Credencial APOPS',
  description: 'Credencial digital del adherente APOPS.',
  robots: 'noindex, nofollow',
}

// Vista pública (sin auth) de la credencial de un adherente. El UUID del
// adherente actúa como secret. Decisión D6 del spec — sin tokens firmados
// en MVP.

export default async function CredencialPublicaPage({
  params,
}: {
  params: { id: string }
}) {
  // Validar UUID básico para evitar lookups con strings random
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    notFound()
  }

  const data = await getCredencialAdherentePublica(params.id)
  if (!data) notFound()

  return (
    <main className="relative min-h-[100dvh] w-full bg-brand-gradient px-5 py-10">
      <div className="relative mx-auto flex max-w-md flex-col gap-5">
        <header className="text-center">
          <h1 className="text-base font-bold uppercase tracking-widest text-white">
            Credencial APOPS
          </h1>
          <p className="text-xs text-white/85">
            Adherente del afiliado titular
          </p>
        </header>

        <CredencialCard
          cred={{
            tipo: 'adherente',
            id: params.id,
            nombre: data.nombre,
            dni: data.dni,
            vinculo: data.vinculo,
            numero_afiliado: data.numero_afiliado,
            email: null,
            telefono: null,
          }}
        />

        <p className="text-center text-[11px] text-white/75">
          Esta credencial fue compartida por un afiliado APOPS. Para uso
          personal del adherente.
        </p>
      </div>
    </main>
  )
}
