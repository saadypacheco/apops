import Image from 'next/image'

// Logo oficial APOPS. Archivo en public/logo-apops.png.
//
// El PNG oficial viene con fondo cyan cuadrado. Para que se integre con
// el gradient navy del fondo, lo recortamos a círculo (rounded-full +
// overflow-hidden) — los corners cyan del cuadrado desaparecen y queda
// la circunferencia natural del logo.
//
// `unoptimized` evita el 400 del optimizador de Next mientras la imagen
// no es servida desde un host externo.

export function Logo({ size = 160 }: { size?: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-full ring-2 ring-white/15 drop-shadow-[0_10px_28px_rgba(0,0,0,0.4)]"
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-apops.png"
        alt="APOPS — Asociación del Personal de los Organismos de Previsión Social"
        width={size}
        height={size}
        priority
        unoptimized
        className="h-full w-full object-cover"
      />
    </div>
  )
}
