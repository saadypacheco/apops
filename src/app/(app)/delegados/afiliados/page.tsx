import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { PersonasEdificioTabs } from '@/components/delegados/PersonasEdificioTabs'
import {
  getOportunidadesAfiliacion,
  getPersonasDelEdificio,
} from '@/lib/delegados/panel-queries'

export const metadata: Metadata = {
  title: 'Afiliados',
}

export default async function AfiliadosDelegadoPage() {
  const session = await requireRole('delegado')
  const [{ afiliados, sinAfiliar, otrosGremios }, oportunidades] =
    await Promise.all([
      getPersonasDelEdificio(session.nombre),
      getOportunidadesAfiliacion(session.nombre),
    ])

  const total = afiliados.length + sinAfiliar.length + otrosGremios.length

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="afiliados">
      <div className="flex flex-col gap-4 pb-4">
        <header>
          <h1 className="text-2xl font-semibold text-brand-ink">Afiliados</h1>
          <p className="text-sm text-brand-muted">
            Todas las personas del padrón que trabajan en tu edificio.
          </p>
        </header>

        {total === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
            <p className="text-base font-medium text-brand-ink">
              No encontramos personas en tu edificio.
            </p>
            <p className="mt-2">
              El cruce se hace por nombre contra el padrón. Si creés que es un
              error, contactá a la administración del gremio.
            </p>
          </div>
        ) : (
          <PersonasEdificioTabs
            oportunidades={oportunidades}
            afiliados={afiliados}
            sinAfiliar={sinAfiliar}
            otrosGremios={otrosGremios}
            nombreDelegado={session.nombre}
          />
        )}
      </div>
    </AppShell>
  )
}
