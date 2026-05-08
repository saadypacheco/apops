'use client'

import { useState } from 'react'
import { cambiarRolDemo } from '@/lib/auth/actions-demo'
import type { Rol } from '@/lib/auth/role'

// Switcher de rol — solo visible para usuarios con permite_role_switch=true
// (modo demo). Permite cambiar entre afiliado/delegado/admin sin re-loguearse.
//
// En el header de AppShell, abre un mini-menu con las 3 opciones. El rol
// activo se marca destacado.

const ROLES: Array<{ value: Rol; label: string; emoji: string }> = [
  { value: 'admin', label: 'Admin', emoji: '🛡️' },
  { value: 'delegado', label: 'Delegado', emoji: '🤝' },
  { value: 'afiliado', label: 'Afiliado', emoji: '🧑' },
]

export function RoleSwitcher({ rolActual }: { rolActual: Rol }) {
  const [open, setOpen] = useState(false)
  const actual = ROLES.find((r) => r.value === rolActual) ?? ROLES[2]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Cambiar de rol (modo demo)"
        className="flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span aria-hidden>{actual?.emoji}</span>
        <span className="uppercase tracking-wider">{actual?.label}</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={'h-3.5 w-3.5 transition ' + (open ? 'rotate-180' : '')}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          {/* overlay para cerrar al clickear afuera */}
          <button
            type="button"
            aria-label="Cerrar menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl bg-white shadow-cardHover ring-1 ring-black/5"
          >
            <p className="border-b border-neutral-100 px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
              Modo demo · cambiar rol
            </p>
            {ROLES.map((r) => {
              const active = r.value === rolActual
              return (
                <form
                  key={r.value}
                  action={cambiarRolDemo}
                  className="flex"
                >
                  <input type="hidden" name="rol" value={r.value} />
                  <button
                    type="submit"
                    role="menuitem"
                    disabled={active}
                    className={
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ' +
                      (active
                        ? 'bg-brand-blue/10 font-semibold text-brand-blue cursor-default'
                        : 'text-brand-ink hover:bg-neutral-50')
                    }
                  >
                    <span aria-hidden>{r.emoji}</span>
                    <span className="flex-1">{r.label}</span>
                    {active && (
                      <span aria-hidden className="text-xs">
                        ✓
                      </span>
                    )}
                  </button>
                </form>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
