import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { BeneficioForm } from '@/components/admin/BeneficioForm'

export const metadata: Metadata = {
  title: 'Nuevo beneficio',
}

export default async function NuevoBeneficioPage() {
  const session = await requireRole('admin')

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/beneficios"
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          ← Volver a beneficios
        </Link>
        <BeneficioForm />
      </div>
    </AppShell>
  )
}
