import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/role'
import { AppShell } from '@/components/app/AppShell'
import { BeneficioToggleActions } from '@/components/admin/BeneficioToggleActions'
import {
  getTodosLosBeneficios,
  LABEL_CATEGORIA,
} from '@/lib/beneficios/queries'

export const metadata: Metadata = {
  title: 'Gestionar beneficios',
}

export default async function GestionarBeneficiosPage({
  searchParams,
}: {
  searchParams?: { creado?: string; editado?: string; eliminado?: string }
}) {
  const session = await requireRole('admin')
  const beneficios = await getTodosLosBeneficios()

  const flash =
    searchParams?.creado === '1'
      ? 'Beneficio creado.'
      : searchParams?.editado === '1'
        ? 'Cambios guardados.'
        : searchParams?.eliminado === '1'
          ? 'Beneficio eliminado.'
          : null

  return (
    <AppShell nombre={session.nombre} rol={session.rol} current="admin">
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-brand-ink">
                Beneficios
              </h1>
              <p className="mt-1 text-sm text-brand-muted">
                {beneficios.length === 0
                  ? 'Todavía no cargaste ningún beneficio.'
                  : `${beneficios.length} beneficios cargados.`}
              </p>
            </div>
            <Link
              href="/admin"
              className="text-sm font-medium text-brand-blue hover:underline"
            >
              ← Volver al panel
            </Link>
          </div>
          <Link
            href="/admin/beneficios/nuevo"
            className="inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-btn-primary px-5 text-sm font-bold uppercase tracking-wider text-white shadow-card transition hover:shadow-cardHover"
          >
            + Nuevo beneficio
          </Link>
        </header>

        {flash && (
          <div
            role="status"
            className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200"
          >
            ✓ {flash}
          </div>
        )}

        {beneficios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-brand-muted">
            Cuando cargues un beneficio va a aparecer acá.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {beneficios.map((b) => (
              <li
                key={b.id}
                className={
                  'flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card ' +
                  (!b.publicado ? 'opacity-70 ring-1 ring-amber-200' : '')
                }
              >
                <header className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xl"
                  >
                    {b.icono ?? '🎁'}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="truncate text-base font-semibold text-brand-ink">
                      {b.titulo}
                    </h3>
                    <p className="line-clamp-2 text-sm text-brand-muted">
                      {b.resumen}
                    </p>
                  </div>
                </header>

                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
                  <div>
                    <dt className="inline">Categoría: </dt>
                    <dd className="inline text-brand-ink">
                      {LABEL_CATEGORIA[b.categoria]}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Orden: </dt>
                    <dd className="inline text-brand-ink">{b.orden}</dd>
                  </div>
                  {b.destaque && (
                    <div>
                      <dt className="inline">Destaque: </dt>
                      <dd className="inline text-brand-ink">{b.destaque}</dd>
                    </div>
                  )}
                  {b.proximamente && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                      Próximamente
                    </span>
                  )}
                </dl>

                <BeneficioToggleActions
                  beneficioId={b.id}
                  publicado={b.publicado}
                />

                <div className="flex justify-end">
                  <Link
                    href={`/admin/beneficios/${b.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline"
                  >
                    Editar →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
