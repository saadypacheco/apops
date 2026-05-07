import type { Credencial } from '@/lib/credencial/queries'

// Card visual de la credencial. Estilo "tarjeta de crédito": fondo gradient
// brand, header con tipo (TITULAR/ADHERENTE), bloque central con nombre y
// número, footer con DNI y mensaje de validez.
//
// Sin foto y sin QR (decisión D3 del spec).

const VINCULO_LABEL: Record<string, string> = {
  conyuge: 'Cónyuge',
  hijo: 'Hijo',
  hija: 'Hija',
  padre: 'Padre',
  madre: 'Madre',
  hermano: 'Hermano',
  hermana: 'Hermana',
  otro: 'Otro',
}

export function CredencialCard({ cred }: { cred: Credencial }) {
  const isTitular = cred.tipo === 'titular'
  const tipoLabel = isTitular ? 'Afiliado Titular' : 'Afiliado Adherente'
  const subtitulo =
    cred.tipo === 'adherente' ? VINCULO_LABEL[cred.vinculo] : null

  return (
    <article className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue via-brand-deep to-brand-navy p-6 text-white shadow-cardHover">
      {/* Decoración: círculo translúcido */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-md"
      />

      <div className="relative flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              APOPS · Credencial
            </p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-white">
              {tipoLabel}
            </p>
            {subtitulo && (
              <p className="text-[11px] text-white/80">{subtitulo}</p>
            )}
          </div>
          <SunMark className="h-10 w-10 shrink-0" />
        </header>

        {/* Datos */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              Nombre completo
            </p>
            <p className="text-xl font-bold leading-tight">{cred.nombre}</p>
          </div>

          {cred.numero_afiliado && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Número de afiliado
              </p>
              <p className="font-mono text-base font-semibold tracking-wider">
                {cred.numero_afiliado}
              </p>
            </div>
          )}

          {cred.dni && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                DNI
              </p>
              <p className="font-mono text-base font-semibold tracking-wider">
                {cred.dni}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-white/15 pt-3 text-[10px] leading-snug text-white/70">
          Esta credencial es personal e intransferible. Para uso exclusivo del
          afiliado. Debe acompañarse siempre con DNI.
        </footer>
      </div>
    </article>
  )
}

// Mini logo APOPS (mismo SVG del header de la landing, más chico)
function SunMark({ className }: { className?: string }) {
  const rays = Array.from({ length: 12 })
  return (
    <svg
      viewBox="0 0 100 100"
      fill="#7FCFE5"
      aria-hidden
      className={className}
    >
      {rays.map((_, i) => (
        <rect
          key={i}
          x="46.5"
          y="6"
          width="7"
          height="22"
          rx="1.5"
          transform={`rotate(${(i * 360) / 12} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="9" />
    </svg>
  )
}
