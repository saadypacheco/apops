// Tabs server-side para el dashboard. El tab activo viene del searchParam.
// Cada tab es solo un enlace que cambia ?tab=X — no necesita JS de cliente.

import Link from 'next/link'

export const DASHBOARD_TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'padron', label: 'Padrón' },
  { key: 'evolucion', label: 'Evolución' },
  { key: 'eventos', label: 'Eventos del mes' },
  { key: 'delegados', label: 'Delegados' },
  { key: 'uso', label: 'Uso' },
  { key: 'altas-bajas', label: 'Altas / Bajas' },
] as const

export type DashboardTab = (typeof DASHBOARD_TABS)[number]['key']

export function isValidTab(s: string | undefined): s is DashboardTab {
  return DASHBOARD_TABS.some((t) => t.key === s)
}

export function DashboardTabs({ active }: { active: DashboardTab }) {
  return (
    <nav
      aria-label="Secciones del dashboard"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {DASHBOARD_TABS.map((t) => {
        const isActive = t.key === active
        return (
          <Link
            key={t.key}
            href={`/admin/dashboard?tab=${t.key}`}
            scroll={false}
            className={
              isActive
                ? 'whitespace-nowrap rounded-t-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white'
                : 'whitespace-nowrap rounded-t-lg bg-white px-4 py-2 text-sm font-medium text-brand-muted shadow-card hover:text-brand-ink'
            }
            aria-current={isActive ? 'page' : undefined}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
