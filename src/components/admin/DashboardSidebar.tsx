'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DASHBOARD_TABS,
  type DashboardTab,
} from '@/components/admin/DashboardTabs'

const STORAGE_KEY = 'apops.dashboard.sidebar.open'

type IconKey = (typeof DASHBOARD_TABS)[number]['key']

// Iconos inline — un grupo cohesivo, sin lib externa.
function TabIcon({ k }: { k: IconKey }) {
  const cls = 'h-5 w-5 shrink-0'
  switch (k) {
    case 'resumen':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls} aria-hidden>
          <rect x="3" y="3" width="7" height="9" rx="1" strokeLinejoin="round" />
          <rect x="14" y="3" width="7" height="5" rx="1" strokeLinejoin="round" />
          <rect x="14" y="12" width="7" height="9" rx="1" strokeLinejoin="round" />
          <rect x="3" y="16" width="7" height="5" rx="1" strokeLinejoin="round" />
        </svg>
      )
    case 'padron':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls} aria-hidden>
          <path d="M9 11a4 4 0 100-8 4 4 0 000 8z" />
          <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
          <path d="M16 3.13a4 4 0 010 7.75M22 21v-2a4 4 0 00-3-3.87" />
        </svg>
      )
    case 'evolucion':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls} aria-hidden>
          <path d="M3 3v18h18" strokeLinecap="round" />
          <path d="M7 15l4-4 4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'delegados':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls} aria-hidden>
          <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'uso':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls} aria-hidden>
          <rect x="5" y="2" width="14" height="20" rx="2" strokeLinejoin="round" />
          <line x1="11" y1="18" x2="13" y2="18" strokeLinecap="round" strokeWidth={3} />
        </svg>
      )
    case 'altas-bajas':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls} aria-hidden>
          <path d="M7 17l5-5 5 5M7 7l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'eventos':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls} aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" strokeLinejoin="round" />
          <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
          <line x1="8" y1="3" x2="8" y2="7" strokeLinecap="round" />
          <line x1="16" y1="3" x2="16" y2="7" strokeLinecap="round" />
        </svg>
      )
  }
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
      aria-hidden
    >
      <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
      <line x1="4" y1="18" x2="20" y2="18" strokeLinecap="round" />
    </svg>
  )
}

export function DashboardSidebar({ active }: { active: DashboardTab }) {
  // Default open; client hydrate puede ajustar a partir de localStorage.
  const [open, setOpen] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setOpen(stored === 'true')
  }, [])

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // localStorage puede fallar en modo incógnito — ignoramos
      }
      return next
    })
  }

  return (
    <aside
      className={[
        'hidden md:block md:shrink-0',
        'self-start sticky top-20',
        'transition-[width] duration-200',
        mounted && !open ? 'md:w-14' : 'md:w-56',
      ].join(' ')}
      aria-label="Menú del dashboard"
    >
      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center gap-3 border-b border-neutral-100 px-3 py-3 text-brand-ink hover:bg-neutral-50"
          aria-label={open ? 'Colapsar menú' : 'Expandir menú'}
          aria-expanded={open}
        >
          <MenuIcon />
          {open && (
            <span className="text-sm font-semibold">Dashboard</span>
          )}
        </button>
        <nav aria-label="Secciones del dashboard" className="flex flex-col gap-0.5 p-1">
          {DASHBOARD_TABS.map((t) => {
            const isActive = t.key === active
            return (
              <Link
                key={t.key}
                href={`/admin/dashboard?tab=${t.key}`}
                scroll={false}
                aria-current={isActive ? 'page' : undefined}
                title={t.label}
                className={[
                  'flex items-center gap-3 rounded-lg px-3 py-2',
                  isActive
                    ? 'bg-brand-blue font-semibold text-white'
                    : 'text-brand-muted hover:bg-neutral-50 hover:text-brand-ink',
                  open ? '' : 'justify-center',
                ].join(' ')}
              >
                <TabIcon k={t.key} />
                {open && <span className="text-sm">{t.label}</span>}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
