// Genera screenshots de teaser para el manifest PWA. No son capturas
// reales (no tenemos browser headless acá) — son composiciones con el logo
// y un tagline. Suficiente para satisfacer el "Richer PWA Install UI" de
// Chrome (que pide al menos un screenshot wide y uno narrow).
//
// Outputs:
//   public/screenshots/mobile-1.png  (narrow, mobile)
//   public/screenshots/desktop-1.png (wide, desktop)
//
// Usage: npx tsx scripts/generate-pwa-screenshots.ts

import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const LOGO_PATH = resolve(process.cwd(), 'public/logo-apops.png')
const OUT_DIR = resolve(process.cwd(), 'public/screenshots')
const BG_TOP = '#1e5ba8' // brand-blue
const BG_BOTTOM = '#0F2A47' // brand-deep

mkdirSync(OUT_DIR, { recursive: true })

function svgTeaser(
  w: number,
  h: number,
  big: string,
  small: string,
): Buffer {
  // SVG con gradient de fondo + textos centrados. Sharp lo rasteriza después.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${BG_TOP}" />
          <stop offset="100%" stop-color="${BG_BOTTOM}" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)" />
      <text x="50%" y="${h * 0.65}" font-family="system-ui, sans-serif"
            font-size="${Math.round(w * 0.05)}" font-weight="700"
            fill="white" text-anchor="middle">${big}</text>
      <text x="50%" y="${h * 0.72}" font-family="system-ui, sans-serif"
            font-size="${Math.round(w * 0.028)}"
            fill="rgba(255,255,255,0.85)" text-anchor="middle">${small}</text>
      <text x="50%" y="${h * 0.92}" font-family="system-ui, sans-serif"
            font-size="${Math.round(w * 0.022)}"
            fill="rgba(255,255,255,0.6)" text-anchor="middle">apops.vercel.app</text>
    </svg>
  `
  return Buffer.from(svg)
}

async function generate(
  filename: string,
  width: number,
  height: number,
  bigText: string,
  smallText: string,
  logoMaxWidthRatio: number,
) {
  const targetLogoW = Math.round(width * logoMaxWidthRatio)
  const logoBuffer = await sharp(LOGO_PATH)
    .resize(targetLogoW, undefined, {
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer()
  const meta = await sharp(logoBuffer).metadata()
  const lw = meta.width ?? targetLogoW
  const lh = meta.height ?? targetLogoW

  const bg = svgTeaser(width, height, bigText, smallText)
  await sharp(bg)
    .composite([
      {
        input: logoBuffer,
        left: Math.floor((width - lw) / 2),
        top: Math.floor(height * 0.3 - lh / 2),
      },
    ])
    .png()
    .toFile(resolve(OUT_DIR, filename))
  console.log(`✓ ${filename} (${width}×${height})`)
}

async function main() {
  console.log('🎨 Generando screenshots PWA...')
  await generate(
    'mobile-1.png',
    540,
    1170,
    'APOPS Siempre',
    'Tu credencial digital + comunicados del gremio',
    0.55,
  )
  await generate(
    'desktop-1.png',
    1280,
    720,
    'APOPS Siempre',
    'Tu credencial digital + comunicados del gremio · Comisión Directiva',
    0.25,
  )
  console.log('\n✅ Listos en public/screenshots/')
}

main().catch((e) => {
  console.error('💥', e)
  process.exit(1)
})
