import Link from 'next/link'

// Acceso al sub-flujo sin_legajo (jubilados/ex-empleados sin legajo activo).
// FR-003 — visible y accesible desde la pantalla de login activo.

export function LinkNoTengoLegajo() {
  return (
    <Link
      href="/login-sin-legajo"
      className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 py-2 text-base text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      No tengo legajo
    </Link>
  )
}
