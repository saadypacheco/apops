import Link from 'next/link'
import { DniLegajoForm } from '@/components/auth/DniLegajoForm'

// Tarjeta blanca sobre el gradient verde con el form de login.
// Reusa DniLegajoForm (que dispara el flujo: validar → email → magic link).

export function LandingLoginCard() {
  return (
    <section
      aria-label="Ingresar a APOPS Siempre"
      className="mx-5 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-brand-ink">Ingresar</h2>
        <p className="text-sm text-brand-muted">
          Validamos tu afiliación con DNI y legajo.
        </p>
      </header>

      <DniLegajoForm />

      <div className="flex flex-col items-center gap-2 border-t border-neutral-100 pt-3">
        <span className="text-xs text-brand-muted">
          ¿Sos jubilado o no tenés legajo activo?
        </span>
        <Link
          href="/login-sin-legajo"
          className="inline-flex min-h-touch items-center justify-center rounded-md px-4 text-sm font-medium text-brand-teal underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
        >
          Ingresá solo con tu DNI
        </Link>
      </div>
    </section>
  )
}
