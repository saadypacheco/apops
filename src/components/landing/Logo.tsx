import Image from 'next/image'

// Logo institucional APOPS. Los assets salen del manual de marca
// (public/APOPS_logos/) procesados por scripts/preparar-logos.ts:
//
//   /logo-apops.png          horizontal + descriptor, texto navy.
//   /logo-apops-white.png    misma pieza en versión reversa (texto blanco,
//                            sol celeste), para fondos azules/oscuros.
//   /logo-apops-stacked.png  sol arriba + APOPS + descriptor abajo.
//
// Los tres tienen fondo transparente, así que apoyan sobre cualquier color
// sin recuadro ni mix-blend-mode.
//
// Modos:
//   - <Logo />                 horizontal navy, para fondos claros.
//   - <Logo as="onWhite" />    igual, pensado para navs sobre blanco.
//   - <Logo as="onBlue" />     versión clara, para el azul de marca.
//   - <Logo as="stacked" />    lockup vertical, para heroes y login.
//   - <Logo as="banner" />     lockup vertical al ancho del contenedor.

type LogoProps = {
  width?: number
  height?: number
  as?: 'inline' | 'banner' | 'onBlue' | 'onWhite' | 'stacked'
  priority?: boolean
}

const ALT =
  'APOPS — Asociación del Personal de los Organismos de Previsión Social'

// Relaciones de aspecto reales de los assets generados.
const HORIZONTAL_RATIO = 1200 / 310
const STACKED_RATIO = 800 / 828

export function Logo({
  width,
  height,
  as = 'inline',
  priority = false,
}: LogoProps) {
  if (as === 'banner') {
    return (
      <div className="relative w-full">
        <Image
          src="/logo-apops-stacked.png"
          alt={ALT}
          width={800}
          height={828}
          priority={priority}
          className="h-auto w-full object-contain"
        />
      </div>
    )
  }

  if (as === 'stacked') {
    const w = width ?? 240
    return (
      <Image
        src="/logo-apops-stacked.png"
        alt={ALT}
        width={800}
        height={828}
        priority={priority}
        className="h-auto"
        style={{ width: w, maxWidth: '100%' }}
      />
    )
  }

  const src = as === 'onBlue' ? '/logo-apops-white.png' : '/logo-apops.png'
  const w = width ?? 220

  return (
    <Image
      src={src}
      alt={ALT}
      width={1200}
      height={310}
      priority={priority}
      className="h-auto"
      style={{
        width: w,
        maxWidth: '100%',
        height: height ?? 'auto',
      }}
    />
  )
}

/** Ratios expuestos por si alguna pantalla necesita reservar espacio. */
export const LOGO_RATIOS = {
  horizontal: HORIZONTAL_RATIO,
  stacked: STACKED_RATIO,
}
