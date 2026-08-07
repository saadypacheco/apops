import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { BeneficioForm } from '@/components/admin/BeneficioForm'
import { EliminarBeneficioButton } from '@/components/admin/EliminarBeneficioButton'
import { getBeneficioPorId } from '@/lib/beneficios/queries'

export const metadata: Metadata = {
  title: 'Editar beneficio',
}

export default async function EditarBeneficioPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await requireRole('admin')
  const beneficio = await getBeneficioPorId(params.id)
  if (!beneficio) notFound()

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/beneficios"
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          ← Volver a beneficios
        </Link>
        <BeneficioForm beneficio={beneficio} />
        <EliminarBeneficioButton
          beneficioId={beneficio.id}
          titulo={beneficio.titulo}
        />
      </div>
    </AppShell>
  )
}
