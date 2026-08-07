// Prepara los assets de logo institucional a partir del manual de marca
// que vive en public/APOPS_logos/.
//
// De las 12 páginas del manual, 4 vienen con fondo transparente (01, 04,
// 07, 10) y el resto tiene el fondo bakeado (blanco, celeste o navy).
//
// Genera 3 assets, todos recortados al contenido y escalados a un ancho
// razonable para web:
//
//   logo-apops.png          horizontal + descriptor, texto navy.
//                           Fondos claros (cards, nav, mails).
//   logo-apops-white.png    misma pieza en versión clara (texto blanco,
//                           sol celeste). Fondos azules/oscuros — se saca
//                           del page_09 quitándole el fondo navy.
//   logo-apops-stacked.png  sol arriba + APOPS abajo + descriptor.
//                           Hero de landing y login.
//
// Usage: npx tsx scripts/preparar-logos.ts

import sharp from 'sharp'
import { resolve } from 'node:path'

const SRC = 'public/APOPS_logos'
const OUT = 'public'

// Fondo navy del manual (páginas 03/06/09/12).
const NAVY: [number, number, number] = [6, 22, 34]
// Tolerancia del key. El navy del fondo es plano, así que alcanza con un
// radio chico; lo que quede cerca del borde se resuelve con el feather.
const KEY_TOLERANCE = 60
const KEY_FEATHER = 40

function dist(r: number, g: number, b: number): number {
  const [nr, ng, nb] = NAVY
  return Math.sqrt((r - nr) ** 2 + (g - ng) ** 2 + (b - nb) ** 2)
}

/** Reemplaza el fondo navy plano por transparencia. */
async function quitarFondoNavy(inputPath: string): Promise<Buffer> {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const d = dist(data[i]!, data[i + 1]!, data[i + 2]!)
    if (d <= KEY_TOLERANCE) {
      data[i + 3] = 0
    } else if (d <= KEY_TOLERANCE + KEY_FEATHER) {
      const t = (d - KEY_TOLERANCE) / KEY_FEATHER
      data[i + 3] = Math.round(data[i + 3]! * t)
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer()
}

/** Recorta el transparente sobrante y escala a `width`. */
async function recortarYEscalar(
  input: string | Buffer,
  width: number,
  outPath: string,
) {
  await sharp(input)
    .trim()
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(resolve(outPath))

  const meta = await sharp(resolve(outPath)).metadata()
  console.log(`✓ ${outPath}  ${meta.width}x${meta.height}`)
}

async function main() {
  // Horizontal con descriptor, texto navy — ya viene transparente.
  await recortarYEscalar(`${SRC}/APOPS_page_07.png`, 1200, `${OUT}/logo-apops.png`)

  // Apilado con descriptor, texto navy — ya viene transparente.
  await recortarYEscalar(
    `${SRC}/APOPS_page_01.png`,
    800,
    `${OUT}/logo-apops-stacked.png`,
  )

  // Versión clara: page_09 es la pieza reversa oficial (texto blanco, sol
  // celeste) pero sobre fondo navy plano. Le sacamos el fondo.
  const clara = await quitarFondoNavy(`${SRC}/APOPS_page_09.png`)
  await recortarYEscalar(clara, 1200, `${OUT}/logo-apops-white.png`)

  // Apilado en versión clara — casi cuadrado, es el que mejor llena el
  // ícono de la PWA sobre el fondo brand-deep.
  const claraStack = await quitarFondoNavy(`${SRC}/APOPS_page_12.png`)
  await recortarYEscalar(claraStack, 800, `${OUT}/logo-apops-stacked-white.png`)

  // Horizontal SIN descriptor, versión clara. El descriptor ("Asociación
  // del Personal…") es ilegible por debajo de ~60px de alto, así que en
  // piezas chicas como la credencial va esta variante.
  const claraCorta = await quitarFondoNavy(`${SRC}/APOPS_page_06.png`)
  await recortarYEscalar(
    claraCorta,
    1000,
    `${OUT}/logo-apops-white-corto.png`,
  )

  // Isotipo suelto (el "sol"), para espacios chicos donde no entra el
  // lockup completo: credencial, avatares, marcas de agua. Se recorta del
  // logo reversa ya keyeado, quedándose con el cuadrado de la izquierda.
  const claraTrim = await sharp(clara).trim().toBuffer()
  const meta = await sharp(claraTrim).metadata()
  const lado = meta.height ?? 0
  const sol = await sharp(claraTrim)
    .extract({ left: 0, top: 0, width: lado, height: lado })
    .toBuffer()
  await recortarYEscalar(sol, 512, `${OUT}/logo-apops-sol.png`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
