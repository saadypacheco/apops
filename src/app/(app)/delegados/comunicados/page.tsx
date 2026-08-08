import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { ComunicadosTabs } from '@/components/delegados/ComunicadosTabs'
import { getComunicadosParaDelegado } from '@/lib/delegados/panel-queries'

export const metadata: Metadata = {
  title: 'Comunicados',
}

export default async function ComunicadosDelegadoPage() {
  const session = await requireRole('delegado')
  const comunicados = await getComunicadosParaDelegado()

  const exclusivos = comunicados.filter((c) => c.audiencia === 'delegados').length

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="comunicados">
      <div className="flex flex-col gap-4 pb-4">
        <header>
          <h1 className="text-2xl font-semibold text-brand-ink">Comunicados</h1>
          <p className="text-sm text-brand-muted">
            {exclusivos > 0
              ? `Incluye ${exclusivos} ${exclusivos === 1 ? 'comunicado exclusivo' : 'comunicados exclusivos'} para delegados.`
              : 'Información del sindicato para tu gestión.'}
          </p>
        </header>

        <ComunicadosTabs comunicados={comunicados} />
      </div>
    </AppShell>
  )
}
