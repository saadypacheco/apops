import Image from 'next/image'

// Sol/girasol APOPS — SVG inline cyan claro. Aproximación del logo oficial.
function SunMark({ className }: { className?: string }) {
  const rays = Array.from({ length: 12 })
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
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

// Logo APOPS oficial. La imagen es rectangular y trae el descriptor
// "Asociación del Personal de los Organismos de Previsión Social" abajo del
// nombre. El png viene con fondo navy oscuro propio.
//
// Modos:
//   - <Logo /> default 280x140, para páginas internas con fondo claro/card.
//   - <Logo as="banner" /> ocupa el ancho del contenedor padre.
//   - <Logo as="onBlue" /> aplica mix-blend-mode: screen para que el navy
//     del png se funda con un fondo azul medio (caso landing). Solo los
//     elementos blancos/cyan del logo permanecen visibles.

type LogoProps = {
  width?: number
  height?: number
  as?: 'inline' | 'banner' | 'onBlue' | 'onWhite'
  priority?: boolean
}

export function Logo({
  width = 280,
  height = 140,
  as = 'inline',
  priority = false,
}: LogoProps) {
  if (as === 'banner') {
    return (
      <div className="relative w-full">
        <Image
          src="/logo-apops.png"
          alt="APOPS — Asociación del Personal de los Organismos de Previsión Social"
          width={1200}
          height={600}
          priority={priority}
          unoptimized
          className="h-auto w-full object-contain"
        />
      </div>
    )
  }

  if (as === 'onWhite') {
    // Variante para fondos blancos (nav top, footer claro). Mismo SVG que
    // onBlue pero con texto en brand-deep y rayos del sol en brand-blue.
    return (
      <div
        className="flex items-center gap-2"
        role="img"
        aria-label="APOPS — Asociación del Personal de los Organismos de Previsión Social"
      >
        <SunMark className="h-9 w-9 shrink-0 text-brand-blue" />
        <div className="flex flex-col leading-none">
          <span className="text-xl font-extrabold tracking-wide text-brand-deep">
            APOPS
          </span>
          <span className="mt-0.5 text-[7px] font-semibold uppercase leading-tight tracking-[0.08em] text-brand-muted">
            Asociación del Personal
            <br />
            de Organismos de Previsión Social
          </span>
        </div>
      </div>
    )
  }

  if (as === 'onBlue') {
    // Aproximación SVG del logo APOPS oficial. Reemplaza al PNG (que viene
    // con fondo navy y no se funde bien con el azul medio del header).
    // El "girasol" son 12 rayos rectangulares cyan más un círculo central.
    // APOPS y descriptor son texto HTML blanco.
    return (
      <div
        className="flex items-center gap-2.5"
        role="img"
        aria-label="APOPS — Asociación del Personal de los Organismos de Previsión Social"
      >
        <SunMark className="h-12 w-12 shrink-0 text-[#7FCFE5]" />
        <div className="flex flex-col leading-none">
          <span className="text-[2rem] font-extrabold tracking-wide text-white">
            APOPS
          </span>
          <span className="mt-1 text-[8px] font-semibold uppercase leading-tight tracking-[0.08em] text-white/90">
            Asociación del Personal
            <br />
            de Organismos de Previsión Social
          </span>
        </div>
      </div>
    )
  }

  return (
    <Image
      src="/logo-apops.png"
      alt="APOPS — Asociación del Personal de los Organismos de Previsión Social"
      width={width}
      height={height}
      priority={priority}
      unoptimized
      className="h-auto w-auto"
      style={{ maxWidth: width, height: 'auto' }}
    />
  )
}
