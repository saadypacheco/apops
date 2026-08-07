// Genera los iconos PWA (192×192 y 512×512) componiendo el logo APOPS
// sobre un fondo brand-blue del manifest.
//
// Usage: npx tsx scripts/generate-pwa-icons.ts
//
// Outputs:
//   public/icons/icon-192.png
//   public/icons/icon-512.png
//   public/icons/icon-maskable-512.png (con safe area extra para Android)

import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Versión reversa del logo: el fondo del icono es brand-deep, así que va
// la pieza clara (texto blanco + sol celeste). Con la variante navy el
// logo quedaría invisible sobre el fondo.
const LOGO_PATH = resolve(process.cwd(), 'public/logo-apops-stacked-white.png')
const OUT_DIR = resolve(process.cwd(), 'public/icons')
const BG = '#0F2A47' // brand-deep, mismo que theme_color del manifest

mkdirSync(OUT_DIR, { recursive: true })

async function generate(size: number, filename: string, scale = 0.7) {
  const logoSize = Math.round(size * scale)
  const logoBuffer = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, {
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer()
  const meta = await sharp(logoBuffer).metadata()
  const w = meta.width ?? logoSize
  const h = meta.height ?? logoSize
  const left = Math.floor((size - w) / 2)
  const top = Math.floor((size - h) / 2)

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logoBuffer, left, top }])
    .png()
    .toFile(resolve(OUT_DIR, filename))

  console.log(`✓ ${filename} (${size}×${size})`)
}

async function main() {
  console.log('🎨 Generando iconos PWA...')
  // Logo a ~70% del canvas para iconos normales
  await generate(192, 'icon-192.png', 0.7)
  await generate(512, 'icon-512.png', 0.7)
  // Maskable: logo a ~55% para dejar safe area (Android puede recortar)
  await generate(512, 'icon-maskable-512.png', 0.55)
  console.log('\n✅ Listos en public/icons/')
}

main().catch((e) => {
  console.error('💥', e)
  process.exit(1)
})
