// Genera la presentación PowerPoint de APOPS Siempre.
//
// Diseño inspirado en el modelo Looker Studio Profesional que pasó el
// cliente, mejorado y adaptado a la identidad APOPS:
//   - Fondo navy oscuro en portadas / cierres
//   - Slides de contenido con fondo claro para legibilidad
//   - Acento azul brand APOPS + amber para CTAs destacados
//   - Tipografía Calibri (estándar Office)
//
// Uso: npx tsx scripts/generar-presentacion-pptx.ts
// (requiere npm install pptxgenjs --no-save antes)

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PptxGenJS = require('pptxgenjs')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readFileSync } = require('node:fs')

// Lee dimensiones reales de un PNG o JPEG sin libs externas — necesario
// para calcular w/h del slide respetando el aspect natural de cada
// imagen y evitar deformación.
function getImageDims(path: string): { w: number; h: number } {
  const buf = readFileSync(path)
  // PNG: bytes 16-23 son IHDR width + height (big endian)
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  }
  // JPEG: recorrer markers hasta encontrar SOF0/1/2
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i < buf.length - 8) {
      if (buf[i] !== 0xff) break
      const marker = buf[i + 1]
      if (marker !== undefined && marker >= 0xc0 && marker <= 0xc2) {
        return {
          w: buf.readUInt16BE(i + 7),
          h: buf.readUInt16BE(i + 5),
        }
      }
      const segLen = buf.readUInt16BE(i + 2)
      i += 2 + segLen
    }
  }
  return { w: 4, h: 5 } // fallback
}

// ─────────────────────────────────────────────────────────────────────
// Paleta y constantes de estilo
// ─────────────────────────────────────────────────────────────────────

// PALETA OSCURA — todos los slides sobre navy uniforme.
// Si querés volver a fondo blanco: invertir bg/bgSoft/inkText/mutedText
// /card/cardRing a los valores que están comentados al lado.
const COLOR = {
  navyDeep: '0F1F3D', // fondo de portadas + ahora también de contenido
  navyMid: '1A325C', // acento oscuro / cards sobre fondo navy
  brandBlue: '1F72B8', // azul APOPS
  brandTeal: '7FCFE5', // cyan APOPS secundario
  amber: 'F59E0B', // CTA cálido
  inkText: 'FFFFFF', // texto principal — ANTES 14213D (oscuro)
  mutedText: 'CBD5E1', // texto secundario — ANTES 6B7280 (gris oscuro)
  bg: '0F1F3D', // fondo principal — ANTES FFFFFF (blanco)
  bgSoft: '1A325C', // fondo de secciones / cards — ANTES F8FAFC
  card: '1A325C', // fondo de cards individuales — ANTES FFFFFF
  cardRing: '334155', // border de cards — ANTES E5E7EB (gris claro)
  success: '10B981',
  warn: 'F97316',
}

const FONT = { regular: 'Calibri', light: 'Calibri Light' }

const pres = new PptxGenJS()
pres.layout = 'LAYOUT_WIDE' // 13.33 x 7.5"
pres.title = 'APOPS Siempre — Propuesta'
pres.author = 'APOPS Siempre'
pres.company = 'APOPS'

const W = 13.33
const H = 7.5

// ─────────────────────────────────────────────────────────────────────
// Helpers visuales
// ─────────────────────────────────────────────────────────────────────

function addFooter(slide: any, num: number, total: number) {
  // Línea fina inferior + paginador + marca
  slide.addShape('rect', {
    x: 0,
    y: H - 0.4,
    w: W,
    h: 0.03,
    fill: { color: COLOR.brandBlue },
    line: { type: 'none' },
  })
  slide.addText('APOPS Siempre · Propuesta 2026', {
    x: 0.5,
    y: H - 0.35,
    w: 6,
    h: 0.3,
    fontSize: 9,
    color: COLOR.mutedText,
    fontFace: FONT.regular,
  })
  slide.addText(`${num} / ${total}`, {
    x: W - 1.5,
    y: H - 0.35,
    w: 1,
    h: 0.3,
    fontSize: 9,
    color: COLOR.mutedText,
    align: 'right',
    fontFace: FONT.regular,
  })
}

function addSlideHeader(
  slide: any,
  eyebrow: string,
  title: string,
  subtitle?: string,
) {
  // Pill superior izquierdo: eyebrow chiquito en navy
  slide.addText(eyebrow, {
    x: 0.5,
    y: 0.45,
    w: 6,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: COLOR.brandBlue,
    fontFace: FONT.regular,
    charSpacing: 2,
  })
  // Título grande
  slide.addText(title, {
    x: 0.5,
    y: 0.78,
    w: 12.3,
    h: 0.85,
    fontSize: 32,
    bold: true,
    color: COLOR.inkText,
    fontFace: FONT.light,
  })
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5,
      y: 1.65,
      w: 12.3,
      h: 0.5,
      fontSize: 16,
      color: COLOR.mutedText,
      fontFace: FONT.regular,
    })
  }
  // Acento horizontal corto bajo el título
  slide.addShape('rect', {
    x: 0.5,
    y: subtitle ? 2.2 : 1.7,
    w: 0.6,
    h: 0.05,
    fill: { color: COLOR.brandBlue },
    line: { type: 'none' },
  })
}

const SLIDES_TOTAL = 27

// Helper para slides de captura — fondo blanco, header arriba,
// imagen grande centrada abajo con un breve caption
function addCapturaSlide(args: {
  eyebrow: string
  title: string
  subtitle: string
  imagePath: string
  caption?: string
  slideNumber: number
}) {
  const slide = pres.addSlide()
  slide.background = { color: COLOR.bgSoft }

  // Header compacto (más pequeño que addSlideHeader para dejar lugar a la imagen)
  slide.addText(args.eyebrow, {
    x: 0.5,
    y: 0.35,
    w: 8,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: COLOR.brandBlue,
    fontFace: FONT.regular,
    charSpacing: 2,
  })
  slide.addText(args.title, {
    x: 0.5,
    y: 0.65,
    w: 12.3,
    h: 0.55,
    fontSize: 24,
    bold: true,
    color: COLOR.inkText,
    fontFace: FONT.light,
  })
  slide.addText(args.subtitle, {
    x: 0.5,
    y: 1.2,
    w: 12.3,
    h: 0.4,
    fontSize: 13,
    color: COLOR.mutedText,
    fontFace: FONT.regular,
  })

  // Calculo dimensiones respetando aspect ratio real de la imagen
  // para evitar deformación. Las capturas son de 3 tipos:
  //   - Mobile vertical (740x1600, ratio ~0.46)
  //   - Cuadradas (564x601 / 424x559, ratio ~0.76-0.94)
  //   - Desktop horizontal (837x554, ratio ~1.5)
  const dims = getImageDims(args.imagePath)
  const aspect = dims.w / dims.h
  const maxW = 9 // ancho máximo del área de imagen
  const maxH = 5 // alto máximo
  let imgW: number, imgH: number
  if (aspect > maxW / maxH) {
    // Imagen más ancha que el área → limita por ancho
    imgW = maxW
    imgH = maxW / aspect
  } else {
    // Imagen más alta → limita por alto
    imgH = maxH
    imgW = maxH * aspect
  }
  const imgX = (W - imgW) / 2
  const imgY = 1.85 + (maxH - imgH) / 2

  // Marco decorativo (sombra simulada con rect detrás semitransparente)
  slide.addShape('roundRect', {
    x: imgX + 0.05,
    y: imgY + 0.05,
    w: imgW,
    h: imgH,
    fill: { color: '000000', transparency: 85 },
    line: { type: 'none' },
    rectRadius: 0.1,
  })
  slide.addImage({
    path: args.imagePath,
    x: imgX,
    y: imgY,
    w: imgW,
    h: imgH,
  })

  // Caption opcional al pie
  if (args.caption) {
    slide.addText(args.caption, {
      x: 1,
      y: 6.95,
      w: 11.3,
      h: 0.3,
      fontSize: 11,
      italic: true,
      color: COLOR.mutedText,
      fontFace: FONT.regular,
      align: 'center',
    })
  }

  addFooter(slide, args.slideNumber, SLIDES_TOTAL)
}

// ─────────────────────────────────────────────────────────────────────
// SLIDE 1 — Portada
// ─────────────────────────────────────────────────────────────────────

let s = pres.addSlide()
s.background = { color: COLOR.navyDeep }
// Círculo decorativo arriba derecha
s.addShape('ellipse', {
  x: W - 4,
  y: -2.5,
  w: 6,
  h: 6,
  fill: { color: COLOR.brandBlue, transparency: 80 },
  line: { type: 'none' },
})
s.addShape('ellipse', {
  x: -2,
  y: H - 3,
  w: 5,
  h: 5,
  fill: { color: COLOR.brandTeal, transparency: 90 },
  line: { type: 'none' },
})
s.addText('GREMIO · COMUNICACIÓN DIGITAL', {
  x: 0.7,
  y: 1.5,
  w: 10,
  h: 0.4,
  fontSize: 14,
  bold: true,
  color: COLOR.brandTeal,
  fontFace: FONT.regular,
  charSpacing: 4,
})
s.addText('APOPS Siempre', {
  x: 0.7,
  y: 2.1,
  w: 12,
  h: 1.6,
  fontSize: 72,
  bold: true,
  color: 'FFFFFF',
  fontFace: FONT.light,
})
s.addText(
  'De cartelera y mail al celular: la plataforma digital que el gremio necesita para los próximos 10 años.',
  {
    x: 0.7,
    y: 3.85,
    w: 11,
    h: 1.1,
    fontSize: 22,
    color: 'E2E8F0',
    fontFace: FONT.light,
  },
)
// Línea divisora
s.addShape('rect', {
  x: 0.7,
  y: 5.2,
  w: 1,
  h: 0.05,
  fill: { color: COLOR.brandTeal },
  line: { type: 'none' },
})
s.addText(
  [
    {
      text: 'Asociación del Personal de los Organismos de Previsión Social',
      options: { fontSize: 14, color: COLOR.brandTeal, bold: true },
    },
    {
      text: '\nPropuesta · 16 de mayo de 2026',
      options: { fontSize: 12, color: '94A3B8' },
    },
  ],
  {
    x: 0.7,
    y: 5.4,
    w: 11,
    h: 0.9,
    fontFace: FONT.regular,
  },
)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 2 — Agenda
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  'AGENDA',
  '¿Qué vamos a ver?',
  'Un recorrido en 19 láminas por el problema, la propuesta y el plan.',
)

const agenda = [
  ['01', 'El problema', 'Por qué hoy la comunicación del gremio se pierde'],
  ['02', 'La propuesta', 'Qué es APOPS Siempre y a quién sirve'],
  ['03', 'Para cada actor', 'Afiliados, delegados, CD y comunidad ANSES'],
  ['04', 'El termómetro', 'Tab Uso: medir el impacto en vivo'],
  ['05', 'Beneficios y diferencial', 'Por qué hacerlo y por qué con esto'],
  ['06', 'Cómo se instala', 'PWA: sin Play Store ni App Store'],
  ['07', 'Roadmap', 'Lo que viene en próximas iteraciones'],
]
for (let i = 0; i < agenda.length; i++) {
  const [num, titulo, desc] = agenda[i]!
  const col = i % 2
  const row = Math.floor(i / 2)
  const x = 0.6 + col * 6.2
  const y = 2.6 + row * 1.1
  // Número grande en azul brand
  s.addText(num, {
    x,
    y,
    w: 1,
    h: 1,
    fontSize: 36,
    bold: true,
    color: COLOR.brandBlue,
    fontFace: FONT.light,
  })
  // Título + descripción
  s.addText(
    [
      { text: titulo, options: { fontSize: 16, bold: true, color: COLOR.inkText } },
      { text: '\n' + desc, options: { fontSize: 12, color: COLOR.mutedText } },
    ],
    {
      x: x + 1,
      y: y + 0.15,
      w: 4.8,
      h: 0.95,
      fontFace: FONT.regular,
    },
  )
}
addFooter(s, 2, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 3 — El problema
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  '01 · EL PROBLEMA',
  'El gremio se queda invisible.',
  'Cinco problemas concretos que la app resuelve.',
)

const problemas = [
  {
    icon: '✉️',
    titulo: 'Comunicación',
    desc: 'Avisos y mensajes con alertas a los afiliados, delegados y también a la Comisión Directiva (CD).',
  },
  {
    icon: '📊',
    titulo: 'Métricas',
    desc: 'La Comisión Directiva (CD) va a saber quién leyó qué, qué delegados/afiliados recibieron la comunicación.',
  },
  {
    icon: '📋',
    titulo: 'Trámites online',
    desc: 'Afiliarse desde la aplicación con firma digital, simple y con posterior aprobación. Recibo de alertas que llegaron sus anteojos.',
  },
  {
    icon: '👁️',
    titulo: 'Compañeros de ANSES invisibles',
    desc: 'ANSES no-APOPS sin manera de llegarles directamente.',
  },
  {
    icon: '🗺️',
    titulo: 'Delegado sin información',
    desc: 'Mayor herramientas para los delegados de los edificios y regionales. Mejor comunicación con los afiliados.',
  },
]
for (let i = 0; i < problemas.length; i++) {
  const p = problemas[i]!
  const col = i % 3
  const row = Math.floor(i / 3)
  const x = 0.6 + col * 4.15
  const y = 2.7 + row * 2.05
  // Card
  s.addShape('roundRect', {
    x,
    y,
    w: 3.95,
    h: 1.85,
    fill: { color: COLOR.bgSoft },
    line: { color: COLOR.cardRing, width: 1 },
    rectRadius: 0.1,
  })
  s.addText(p.icon, {
    x: x + 0.2,
    y: y + 0.2,
    w: 0.7,
    h: 0.7,
    fontSize: 32,
    fontFace: FONT.regular,
  })
  s.addText(p.titulo, {
    x: x + 1,
    y: y + 0.25,
    w: 2.85,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: COLOR.inkText,
    fontFace: FONT.regular,
  })
  s.addText(p.desc, {
    x: x + 1,
    y: y + 0.75,
    w: 2.85,
    h: 1,
    fontSize: 11,
    color: COLOR.mutedText,
    fontFace: FONT.regular,
  })
}
addFooter(s, 3, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 4 — Antes vs Después
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  '01 · COMPARATIVA',
  'Antes vs. después.',
  'Cómo cambia cada flujo cuando la app está en producción.',
)

const tablaComp = [
  ['Hoy (sin app)', 'Con APOPS Siempre'],
  ['Mail o WhatsApp que se pierde', 'Notificación al celular con tasa de lectura medida'],
  ['Comunicados que no se leen', 'Novedades en feed + página pública compartible'],
  ['WhatsApp del delegado se inunda', 'Hilos 1-a-1 ordenados con historial'],
  ['CD sin saber cuántos leyeron', 'Tasa de lectura en vivo (60-80%)'],
  ['Delegado no ve a no-APOPS', 'Vista completa del edificio con filtros'],
  ['Afiliación presencial con papeles', 'Wizard online + firma digital + PDF por mail'],
  ['Compañeros invisibles', 'Página pública con noticias y formulario de afiliación'],
]
for (let i = 0; i < tablaComp.length; i++) {
  const [izq, der] = tablaComp[i]!
  const y = 2.75 + i * 0.55
  if (i === 0) {
    // Header row
    s.addShape('rect', {
      x: 0.6,
      y,
      w: 6,
      h: 0.5,
      fill: { color: '94A3B8' },
      line: { type: 'none' },
    })
    s.addShape('rect', {
      x: 6.7,
      y,
      w: 6,
      h: 0.5,
      fill: { color: COLOR.brandBlue },
      line: { type: 'none' },
    })
    s.addText(izq, {
      x: 0.8,
      y: y + 0.08,
      w: 5.8,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: 'FFFFFF',
      fontFace: FONT.regular,
    })
    s.addText(der, {
      x: 6.9,
      y: y + 0.08,
      w: 5.8,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: 'FFFFFF',
      fontFace: FONT.regular,
    })
  } else {
    s.addText(izq, {
      x: 0.8,
      y,
      w: 5.7,
      h: 0.5,
      fontSize: 12,
      color: COLOR.mutedText,
      fontFace: FONT.regular,
    })
    s.addText(der, {
      x: 6.9,
      y,
      w: 5.7,
      h: 0.5,
      fontSize: 12,
      bold: true,
      color: COLOR.inkText,
      fontFace: FONT.regular,
    })
  }
}
addFooter(s, 4, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 5 — La propuesta (big idea)
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.navyDeep }
s.addShape('ellipse', {
  x: W - 3,
  y: -2,
  w: 5,
  h: 5,
  fill: { color: COLOR.brandBlue, transparency: 85 },
  line: { type: 'none' },
})
s.addText('02 · LA PROPUESTA', {
  x: 0.7,
  y: 0.6,
  w: 5,
  h: 0.4,
  fontSize: 14,
  bold: true,
  color: COLOR.brandTeal,
  fontFace: FONT.regular,
  charSpacing: 3,
})
s.addText('Una plataforma. Dos públicos.', {
  x: 0.7,
  y: 1.3,
  w: 12,
  h: 1.5,
  fontSize: 56,
  bold: true,
  color: 'FFFFFF',
  fontFace: FONT.light,
})

// Dos cards laterales
const cards = [
  {
    x: 0.7,
    tag: 'Para APOPS',
    title: 'Afiliados activos',
    items: [
      'Login + credencial digital propia y familiar',
      'Comunicación bidireccional con CD y delegado',
      'Compartir credencial por WhatsApp',
      'Notificaciones del gremio al celular',
    ],
    color: COLOR.brandBlue,
  },
  {
    x: 6.95,
    tag: 'Para todo ANSES',
    title: 'Compañeros no activos',
    items: [
      'Página pública sin login con noticias del gremio',
      'Noticias importantes para los trabajadores de ANSES',
      'Acceso al formulario de afiliación online',
    ],
    color: COLOR.brandTeal,
  },
]
for (const c of cards) {
  s.addShape('roundRect', {
    x: c.x,
    y: 3.5,
    w: 5.95,
    h: 3.4,
    fill: { color: '1A325C' },
    line: { color: c.color, width: 2 },
    rectRadius: 0.15,
  })
  s.addText(c.tag, {
    x: c.x + 0.3,
    y: 3.65,
    w: 5.5,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: c.color,
    fontFace: FONT.regular,
    charSpacing: 2,
  })
  s.addText(c.title, {
    x: c.x + 0.3,
    y: 3.95,
    w: 5.5,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: 'FFFFFF',
    fontFace: FONT.light,
  })
  s.addText(c.items.map((t) => ({ text: t, options: { bullet: { code: '25AA' } } })), {
    x: c.x + 0.3,
    y: 4.55,
    w: 5.5,
    h: 2.2,
    fontSize: 13,
    color: 'CBD5E1',
    fontFace: FONT.regular,
    paraSpaceAfter: 6,
    lineSpacing: 18,
  })
}
addFooter(s, 5, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 6 — Cifras (los números que importan)
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  '02 · LOS NÚMEROS',
  'La oportunidad real, en cifras.',
  'Padrón ANSES vivo cargado en producción.',
)

const cifras = [
  { num: '11.558', label: 'Cotizantes en padrón ANSES', sub: 'Cargado mensualmente desde Excel' },
  { num: '~4.000', label: 'Afiliados APOPS hoy', sub: 'Universo de usuarios activos' },
  { num: '7.558+', label: 'Compañeros no afiliados o de otros gremios', sub: 'Oportunidad de captación' },
  { num: '100%', label: 'Cobertura digital posible', sub: 'Web instalable sin Play Store' },
]
for (let i = 0; i < cifras.length; i++) {
  const c = cifras[i]!
  const x = 0.6 + i * 3.13
  s.addShape('roundRect', {
    x,
    y: 2.9,
    w: 2.95,
    h: 3.4,
    fill: { color: COLOR.bgSoft },
    line: { color: COLOR.brandBlue, width: 2 },
    rectRadius: 0.12,
  })
  s.addText(c.num, {
    x,
    y: 3.1,
    w: 2.95,
    h: 1.4,
    fontSize: 52,
    bold: true,
    color: COLOR.brandBlue,
    align: 'center',
    fontFace: FONT.light,
  })
  s.addText(c.label, {
    x: x + 0.2,
    y: 4.6,
    w: 2.55,
    h: 0.6,
    fontSize: 14,
    bold: true,
    color: COLOR.inkText,
    align: 'center',
    fontFace: FONT.regular,
  })
  s.addText(c.sub, {
    x: x + 0.2,
    y: 5.3,
    w: 2.55,
    h: 0.7,
    fontSize: 11,
    color: COLOR.mutedText,
    align: 'center',
    fontFace: FONT.regular,
  })
}
addFooter(s, 6, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 7 — Para el afiliado
// ─────────────────────────────────────────────────────────────────────

function slideFuncionalidad(args: {
  num: number
  eyebrow: string
  titulo: string
  subtitulo: string
  bullets: string[]
  highlight?: string
  slideNumber: number
}) {
  const slide = pres.addSlide()
  slide.background = { color: COLOR.bg }
  addSlideHeader(slide, args.eyebrow, args.titulo, args.subtitulo)

  // Lista de bullets
  slide.addText(
    args.bullets.map((t) => ({
      text: t,
      options: { bullet: { code: '25AA' } },
    })),
    {
      x: 0.6,
      y: 2.8,
      w: 7.3,
      h: 4,
      fontSize: 16,
      color: COLOR.inkText,
      fontFace: FONT.regular,
      paraSpaceAfter: 10,
      lineSpacing: 24,
    },
  )

  // Highlight card a la derecha
  if (args.highlight) {
    slide.addShape('roundRect', {
      x: 8.3,
      y: 2.8,
      w: 4.5,
      h: 3.6,
      fill: { color: COLOR.navyDeep },
      line: { type: 'none' },
      rectRadius: 0.15,
    })
    slide.addShape('rect', {
      x: 8.3,
      y: 2.8,
      w: 4.5,
      h: 0.08,
      fill: { color: COLOR.amber },
      line: { type: 'none' },
    })
    slide.addText('LO QUE MÁS PESA', {
      x: 8.6,
      y: 3.05,
      w: 4,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: COLOR.amber,
      fontFace: FONT.regular,
      charSpacing: 3,
    })
    slide.addText(args.highlight, {
      x: 8.6,
      y: 3.4,
      w: 4,
      h: 2.85,
      fontSize: 15,
      color: 'FFFFFF',
      fontFace: FONT.regular,
      paraSpaceAfter: 6,
    })
  }
  addFooter(slide, args.slideNumber, SLIDES_TOTAL)
}

slideFuncionalidad({
  num: 7,
  eyebrow: '03 · PARA EL AFILIADO',
  titulo: 'Una herramienta en el bolsillo.',
  subtitulo: 'Lo que el afiliado APOPS usa todos los días.',
  bullets: [
    'Credencial digital propia y de cada miembro del grupo familiar',
    'Compartir credencial por WhatsApp con link público al destinatario',
    'Feed de novedades del gremio en el home',
    'Notificaciones directas del delegado o de la Comisión Directiva',
    'Botón flotante de contacto: WhatsApp / Email / Llamar siempre visible',
    'Instalable en el celular como cualquier app',
  ],
  highlight:
    'La credencial siempre disponible es lo primero que el afiliado va a usar. Y compartirla por WhatsApp en 1 toque vuelve la app viral entre el grupo familiar.',
  slideNumber: 7,
})

// ─────────────────────────────────────────────────────────────────────
// SLIDE 8 — Para el delegado
// ─────────────────────────────────────────────────────────────────────

slideFuncionalidad({
  num: 8,
  eyebrow: '03 · PARA EL DELEGADO',
  titulo: 'Una vista completa de su edificio.',
  subtitulo: 'El equipamiento que hoy no tiene.',
  bullets: [
    'Vista completa del edificio: todas las personas del padrón ANSES, no solo APOPS',
    'Buscador por nombre, DNI o legajo',
    'Filtros por gremio: APOPS / ATE / UPCN / SEC / sin gremio',
    'Identificación inmediata de candidatos a captación',
    'Hilos de comunicación bidireccional con la CD',
    'Alertas automáticas ante altas/bajas en su edificio',
    'Plantillas WhatsApp para eventos del mes (cumpleaños, aniversarios)',
  ],
  highlight:
    'Hoy el delegado no tiene cómo ver fácilmente quiénes son los compañeros NO-APOPS del edificio. Con esta vista los identifica en segundos y puede invitarlos uno por uno.',
  slideNumber: 8,
})

// ─────────────────────────────────────────────────────────────────────
// SLIDE 9 — Para la CD
// ─────────────────────────────────────────────────────────────────────

slideFuncionalidad({
  num: 9,
  eyebrow: '03 · PARA LA COMISIÓN DIRECTIVA',
  titulo: 'Decisiones con datos, no con intuición.',
  subtitulo: 'Panel admin + dashboard de 7 vistas en vivo.',
  bullets: [
    'Gestión de novedades: crear, editar, despublicar, eliminar',
    'Carga del padrón ANSES desde Excel con histórico mensual preservado',
    'Dashboard con vistas: Resumen, Padrón, Evolución, Eventos, Delegados, Uso, Altas/Bajas',
    'Procesamiento de afiliaciones online con firma + auditoría',
    'Mensajería interna con delegados y afiliados',
    'Mapa de Argentina + heatmap de edificios',
    'Eventos del mes (cumpleaños, aniversarios) con plantillas listas',
  ],
  highlight:
    'Cada acción de la CD queda registrada y medida. La CD pasa de "creemos que llega" a "el 73% de los afiliados leyó la comunicación de paritaria en menos de 6 horas".',
  slideNumber: 9,
})

// ─────────────────────────────────────────────────────────────────────
// SLIDE 10 — Termómetro (Tab Uso) — la joya
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.navyDeep }
s.addShape('ellipse', {
  x: -2,
  y: H - 4,
  w: 6,
  h: 6,
  fill: { color: COLOR.brandBlue, transparency: 88 },
  line: { type: 'none' },
})
s.addText('04 · LA JOYA', {
  x: 0.7,
  y: 0.6,
  w: 5,
  h: 0.4,
  fontSize: 14,
  bold: true,
  color: COLOR.amber,
  fontFace: FONT.regular,
  charSpacing: 3,
})
s.addText('El termómetro del gremio.', {
  x: 0.7,
  y: 1.2,
  w: 12,
  h: 1.4,
  fontSize: 48,
  bold: true,
  color: 'FFFFFF',
  fontFace: FONT.light,
})
s.addText(
  'Tab "Uso" del dashboard CD: mide adopción, comunicación y engagement en vivo. Hoy ningún gremio tiene esto.',
  {
    x: 0.7,
    y: 2.5,
    w: 12,
    h: 0.7,
    fontSize: 17,
    color: 'CBD5E1',
    fontFace: FONT.regular,
  },
)

// 4 bloques de métricas
const bloques = [
  {
    titulo: 'Adopción',
    items: ['% afiliados con cuenta', 'DAU / WAU / MAU', 'Push activos', 'Embudo visual'],
  },
  {
    titulo: 'Comunicación',
    items: [
      'Notificaciones enviadas (afiliados / delegados)',
      'Tasa de lectura (60% / 80%)',
      'Tiempo medio entre envío y lectura',
    ],
  },
  {
    titulo: 'Delegados',
    items: [
      'Registrados / activos 30d',
      'Leyeron CD 30d',
      'Top 10 por actividad',
      'Inactivos accionables',
    ],
  },
  {
    titulo: 'Llega a CD',
    items: [
      'Hilos de delegados 30d',
      'Hilos de afiliados 30d',
      'Sin leer por admin',
      'Afiliaciones online por estado',
    ],
  },
]
for (let i = 0; i < bloques.length; i++) {
  const b = bloques[i]!
  const x = 0.7 + i * 3.1
  s.addShape('roundRect', {
    x,
    y: 3.5,
    w: 2.95,
    h: 3.5,
    fill: { color: '1A325C' },
    line: { color: COLOR.brandBlue, width: 1 },
    rectRadius: 0.1,
  })
  s.addText((i + 1).toString().padStart(2, '0'), {
    x: x + 0.2,
    y: 3.65,
    w: 1,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: COLOR.brandTeal,
    fontFace: FONT.regular,
  })
  s.addText(b.titulo, {
    x: x + 0.2,
    y: 3.95,
    w: 2.6,
    h: 0.6,
    fontSize: 20,
    bold: true,
    color: 'FFFFFF',
    fontFace: FONT.light,
  })
  s.addText(
    b.items.map((t) => ({ text: t, options: { bullet: { code: '25AA' } } })),
    {
      x: x + 0.2,
      y: 4.55,
      w: 2.6,
      h: 2.3,
      fontSize: 11,
      color: 'CBD5E1',
      fontFace: FONT.regular,
      paraSpaceAfter: 4,
      lineSpacing: 16,
    },
  )
}
addFooter(s, 10, SLIDES_TOTAL)

// ═════════════════════════════════════════════════════════════════════
// SLIDES 11-17 — EL PRODUCTO EN VIVO (capturas reales)
// ═════════════════════════════════════════════════════════════════════

// ─── SLIDE 11 — Intro a la sección de capturas ───────────────────────
s = pres.addSlide()
s.background = { color: COLOR.navyDeep }
s.addShape('ellipse', {
  x: W - 5,
  y: -2,
  w: 7,
  h: 7,
  fill: { color: COLOR.brandBlue, transparency: 88 },
  line: { type: 'none' },
})
s.addShape('ellipse', {
  x: -2,
  y: H - 4,
  w: 5,
  h: 5,
  fill: { color: COLOR.brandTeal, transparency: 92 },
  line: { type: 'none' },
})
s.addText('05 · EN VIVO', {
  x: 0.7,
  y: 1.8,
  w: 5,
  h: 0.4,
  fontSize: 14,
  bold: true,
  color: COLOR.amber,
  fontFace: FONT.regular,
  charSpacing: 3,
})
s.addText('El producto funcionando.', {
  x: 0.7,
  y: 2.4,
  w: 12,
  h: 1.6,
  fontSize: 56,
  bold: true,
  color: 'FFFFFF',
  fontFace: FONT.light,
})
s.addText(
  'Capturas reales del sistema con padrón ANSES de Julio 2016 cargado: 15.558 cotizantes, 4.631 APOPS, 529 delegados.',
  {
    x: 0.7,
    y: 4.1,
    w: 12,
    h: 0.7,
    fontSize: 18,
    color: 'CBD5E1',
    fontFace: FONT.regular,
  },
)
s.addShape('rect', {
  x: 0.7,
  y: 5,
  w: 1.2,
  h: 0.05,
  fill: { color: COLOR.brandTeal },
  line: { type: 'none' },
})
s.addText(
  'No son mockups. Es lo que ve hoy un admin de la CD al loguearse.',
  {
    x: 0.7,
    y: 5.15,
    w: 12,
    h: 0.4,
    fontSize: 14,
    color: COLOR.brandTeal,
    fontFace: FONT.regular,
    italic: true,
  },
)
addFooter(s, 11, SLIDES_TOTAL)

// ─── SLIDE 12 — Login del afiliado ───────────────────────────────────
addCapturaSlide({
  eyebrow: '05 · EN VIVO · ACCESO',
  title: 'Login simple del afiliado',
  subtitle: 'DNI o legajo + clave. Magic link si se olvida la contraseña. Instalable en 1 toque.',
  imagePath: 'public/imagenes para software/login.PNG',
  caption: 'Pantalla pública en apops.vercel.app — también visible desde computadora.',
  slideNumber: 12,
})

// ─── SLIDE 13 — Panel admin (atajos) ─────────────────────────────────
addCapturaSlide({
  eyebrow: '05 · EN VIVO · PANEL ADMIN',
  title: 'Panel de la Comisión Directiva',
  subtitle: 'Atajos a todas las funciones administrativas con badges de pendientes.',
  imagePath: 'public/imagenes para software/dasjboard.png',
  caption: 'Mensajes de delegados sin leer y notificaciones aparecen con badge naranja.',
  slideNumber: 13,
})

// ─── SLIDE 14 — Dashboard CD: Resumen ────────────────────────────────
addCapturaSlide({
  eyebrow: '05 · EN VIVO · DASHBOARD',
  title: 'Dashboard CD — vista Resumen',
  subtitle: '4 KPI cards con delta vs mes anterior. Selector de período arriba.',
  imagePath: 'public/imagenes para software/dashboard-resumen.png',
  caption: '15.558 cotizantes · 4.631 APOPS · 529 delegados · % adopción vs objetivo 70%.',
  slideNumber: 14,
})

// ─── SLIDE 15 — Padrón en mapa ───────────────────────────────────────
addCapturaSlide({
  eyebrow: '05 · EN VIVO · PADRÓN',
  title: 'Distribución geográfica',
  subtitle: 'Mapa SVG de Argentina con choropleth + números por provincia + CABA destacada.',
  imagePath: 'public/imagenes para software/dashboard-padron-mapa1.PNG',
  caption: 'CABA concentra 1.2k afiliados APOPS. Buenos Aires 524. Córdoba 301.',
  slideNumber: 15,
})

// ─── SLIDE 16 — Delegados activos ────────────────────────────────────
addCapturaSlide({
  eyebrow: '05 · EN VIVO · DELEGADOS',
  title: 'Comisión Directiva — Delegados',
  subtitle: '529 delegados activos. Mandatos que vencen en 30 días en alerta. Edificios sin delegado.',
  imagePath: 'public/imagenes para software/dashboard-delegados.png',
  caption: '6 mandatos por vencer este mes — listado accionable. 10 edificios APOPS sin delegado asignado.',
  slideNumber: 16,
})

// ─── SLIDE 17 — Vista del delegado (alertas) ─────────────────────────
addCapturaSlide({
  eyebrow: '05 · EN VIVO · DELEGADO',
  title: 'El delegado ve su edificio',
  subtitle: 'Alertas automáticas de altas y bajas. Comunicación directa con la CD.',
  imagePath: 'public/imagenes para software/DashboardalertasDelegado.jpeg',
  caption: 'Cada delegado recibe notificación cuando hay movimientos en su edificio o consultas.',
  slideNumber: 17,
})

// ─── SLIDE 18 — Altas y bajas con plantillas WhatsApp ────────────────
addCapturaSlide({
  eyebrow: '05 · EN VIVO · OPERACIÓN',
  title: 'Altas y bajas accionables',
  subtitle: 'Listado de movimientos con plantillas WhatsApp pre-cargadas para saludar / despedir.',
  imagePath: 'public/imagenes para software/dashboardAltaBajas.PNG',
  caption: 'Botón "Mensaje bienvenida" aparece solo si la persona es APOPS — para no-APOPS es invitación.',
  slideNumber: 18,
})

// ─────────────────────────────────────────────────────────────────────
// SLIDE 19 — Para toda ANSES (público + captación)
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  '03 · PARA TODA ANSES',
  'Llegamos también a los que no son APOPS.',
  'Tres niveles de profundidad pública sin barrera.',
)

const nivelesPub = [
  {
    nivel: 'Nivel 1',
    titulo: 'Landing pública',
    desc: 'Cualquier compañero de ANSES entra a siempreapops y ve novedades, carousel y CTA "Afiliarme".',
    icon: '🌐',
  },
  {
    nivel: 'Nivel 2',
    titulo: '/noticias',
    desc: 'Listado completo de novedades del gremio, también sin login. Compartible por WhatsApp orgánico.',
    icon: '📰',
  },
  {
    nivel: 'Nivel 3',
    titulo: '/noticias/[id]',
    desc: 'Cada noticia individual con link directo. Los delegados las pueden difundir a no-afiliados con 1 toque.',
    icon: '🔗',
  },
]
for (let i = 0; i < nivelesPub.length; i++) {
  const n = nivelesPub[i]!
  const x = 0.6 + i * 4.15
  s.addShape('roundRect', {
    x,
    y: 2.9,
    w: 3.95,
    h: 3.6,
    fill: { color: COLOR.bg },
    line: { color: COLOR.cardRing, width: 1 },
    rectRadius: 0.1,
  })
  s.addShape('rect', {
    x,
    y: 2.9,
    w: 3.95,
    h: 0.08,
    fill: { color: COLOR.brandBlue },
    line: { type: 'none' },
  })
  s.addText(n.icon, {
    x: x + 0.3,
    y: 3.2,
    w: 1,
    h: 0.8,
    fontSize: 40,
    fontFace: FONT.regular,
  })
  s.addText(n.nivel, {
    x: x + 0.3,
    y: 4.1,
    w: 3.4,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: COLOR.brandBlue,
    fontFace: FONT.regular,
    charSpacing: 3,
  })
  s.addText(n.titulo, {
    x: x + 0.3,
    y: 4.4,
    w: 3.4,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: COLOR.inkText,
    fontFace: FONT.regular,
  })
  s.addText(n.desc, {
    x: x + 0.3,
    y: 4.95,
    w: 3.4,
    h: 1.4,
    fontSize: 12,
    color: COLOR.mutedText,
    fontFace: FONT.regular,
  })
}
// Cita inferior
s.addText(
  '"Cada noticia que la CD publica es contenido compartible que cualquier delegado puede mandar a sus contactos no-APOPS."',
  {
    x: 0.6,
    y: 6.7,
    w: 12.1,
    h: 0.5,
    fontSize: 13,
    italic: true,
    color: COLOR.mutedText,
    align: 'center',
    fontFace: FONT.regular,
  },
)
addFooter(s, 19, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 12 — Afiliación online con firma
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  '03 · AFILIACIÓN ONLINE',
  '3 pasos. Firma digital. PDF por mail.',
  'Sin papeles, sin presencia, con trazabilidad legal.',
)

const pasos = [
  {
    num: '01',
    titulo: 'Datos obligatorios',
    items: [
      'Edificio (selector del padrón)',
      'Apellido y nombre',
      'DNI',
      'Legajo',
      'Celular y email',
    ],
  },
  {
    num: '02',
    titulo: 'Datos opcionales',
    items: [
      'Domicilio',
      'Familia / adherentes',
      'CBU',
      'Datos del puesto',
      'Todo colapsable',
    ],
  },
  {
    num: '03',
    titulo: 'Resumen + firma',
    items: [
      'Vista completa de lo cargado',
      'Autorización descuento 3%',
      'Firma con el dedo',
      'PDF generado + enviado',
    ],
  },
]
for (let i = 0; i < pasos.length; i++) {
  const p = pasos[i]!
  const x = 0.6 + i * 4.15
  s.addShape('roundRect', {
    x,
    y: 2.85,
    w: 3.95,
    h: 3.5,
    fill: { color: COLOR.bgSoft },
    line: { color: COLOR.cardRing, width: 1 },
    rectRadius: 0.1,
  })
  s.addText(p.num, {
    x: x + 0.3,
    y: 3,
    w: 1.5,
    h: 0.8,
    fontSize: 36,
    bold: true,
    color: COLOR.brandBlue,
    fontFace: FONT.light,
  })
  s.addText(p.titulo, {
    x: x + 0.3,
    y: 3.85,
    w: 3.4,
    h: 0.5,
    fontSize: 16,
    bold: true,
    color: COLOR.inkText,
    fontFace: FONT.regular,
  })
  s.addText(
    p.items.map((t) => ({ text: t, options: { bullet: { code: '25AA' } } })),
    {
      x: x + 0.3,
      y: 4.4,
      w: 3.4,
      h: 1.85,
      fontSize: 12,
      color: COLOR.mutedText,
      fontFace: FONT.regular,
      paraSpaceAfter: 4,
      lineSpacing: 16,
    },
  )
}
// Resultado destacado
s.addShape('roundRect', {
  x: 0.6,
  y: 6.55,
  w: 12.1,
  h: 0.65,
  fill: { color: COLOR.brandBlue },
  line: { type: 'none' },
  rectRadius: 0.08,
})
s.addText(
  'El PDF firmado se envía automáticamente a 3 destinatarios: al aspirante, a la CD y al delegado del edificio.',
  {
    x: 0.6,
    y: 6.55,
    w: 12.1,
    h: 0.65,
    fontSize: 14,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    valign: 'middle',
    fontFace: FONT.regular,
  },
)
addFooter(s, 20, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 13 — Beneficios
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  '05 · BENEFICIOS',
  'Lo que gana el sindicato.',
  'Impacto concreto en operación, imagen y crecimiento.',
)
const beneficios = [
  { icon: '📞', label: 'Menos atención telefónica y presencial' },
  { icon: '📊', label: 'Métricas concretas de impacto comunicacional' },
  { icon: '📈', label: 'Captación de cotizantes ANSES no-APOPS' },
  { icon: '✨', label: 'Imagen institucional moderna' },
  { icon: '⚙️', label: 'Digitalización: afiliación, padrón, comunicación' },
  { icon: '🧭', label: 'Datos en vivo para la toma de decisiones' },
  { icon: '💸', label: 'Sin costos de Play Store ni App Store' },
  { icon: '🔄', label: 'Actualizaciones automáticas para todos' },
]
for (let i = 0; i < beneficios.length; i++) {
  const b = beneficios[i]!
  const col = i % 4
  const row = Math.floor(i / 4)
  const x = 0.6 + col * 3.13
  const y = 2.9 + row * 1.9
  s.addShape('roundRect', {
    x,
    y,
    w: 2.95,
    h: 1.7,
    fill: { color: COLOR.bgSoft },
    line: { color: COLOR.cardRing, width: 1 },
    rectRadius: 0.1,
  })
  s.addText(b.icon, {
    x: x + 0.2,
    y: y + 0.25,
    w: 0.7,
    h: 0.7,
    fontSize: 28,
    fontFace: FONT.regular,
  })
  s.addText(b.label, {
    x: x + 0.95,
    y: y + 0.3,
    w: 1.85,
    h: 1.2,
    fontSize: 12,
    bold: true,
    color: COLOR.inkText,
    fontFace: FONT.regular,
  })
}
addFooter(s, 21, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 14 — Diferencial
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  '05 · DIFERENCIAL',
  'No es una app de credencial digital.',
  'Es una infraestructura de comunicación bidireccional medible.',
)

const dif = [
  {
    num: '01',
    titulo: 'Dos públicos a la vez',
    desc: 'Afiliados con experiencia completa + comunidad ANSES con contenido público — captación incluida.',
  },
  {
    num: '02',
    titulo: 'Termómetro vivo',
    desc: 'La CD mide adopción, lectura, engagement de delegados. Ningún gremio tiene esto hoy.',
  },
  {
    num: '03',
    titulo: 'Delegado equipado',
    desc: 'Vista de edificio con filtros por gremio para identificar oportunidades de afiliación.',
  },
  {
    num: '04',
    titulo: 'Trazabilidad legal',
    desc: 'Afiliación online con firma digital embebida + PDF auditable + 3 destinatarios. Defensible.',
  },
]
for (let i = 0; i < dif.length; i++) {
  const d = dif[i]!
  const col = i % 2
  const row = Math.floor(i / 2)
  const x = 0.6 + col * 6.2
  const y = 2.85 + row * 1.95
  s.addText(d.num, {
    x,
    y,
    w: 1,
    h: 0.9,
    fontSize: 44,
    bold: true,
    color: COLOR.brandBlue,
    fontFace: FONT.light,
  })
  s.addText(d.titulo, {
    x: x + 1.1,
    y: y + 0.05,
    w: 5,
    h: 0.5,
    fontSize: 19,
    bold: true,
    color: COLOR.inkText,
    fontFace: FONT.regular,
  })
  s.addText(d.desc, {
    x: x + 1.1,
    y: y + 0.55,
    w: 5,
    h: 1.3,
    fontSize: 13,
    color: COLOR.mutedText,
    fontFace: FONT.regular,
  })
}
addFooter(s, 22, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 15 — Cómo se instala
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  '06 · INSTALACIÓN',
  'En menos de 10 segundos.',
  'PWA: sin Play Store ni App Store, directo desde el navegador.',
)

const plataformas = [
  {
    titulo: 'Android',
    icon: '🤖',
    pasos: [
      'Abrir Chrome en apops.vercel.app',
      'Tocar el banner "Instalar app" o el botón del header',
      'Confirmar',
      'Ícono APOPS en el home',
    ],
    tiempo: '~10s',
  },
  {
    titulo: 'iPhone / iPad',
    icon: '🍎',
    pasos: [
      'Abrir Safari en apops.vercel.app',
      'Tocar Compartir (cuadrado con flecha)',
      'Elegir "Agregar a pantalla de inicio"',
      'Confirmar "Agregar"',
    ],
    tiempo: '~30s',
  },
  {
    titulo: 'Computadora',
    icon: '💻',
    pasos: [
      'Abrir Chrome / Edge / Brave',
      'Ícono de instalación en la barra de URL',
      'Menú · "Instalar APOPS Siempre"',
      'Queda como app del sistema',
    ],
    tiempo: '~15s',
  },
]
for (let i = 0; i < plataformas.length; i++) {
  const p = plataformas[i]!
  const x = 0.6 + i * 4.15
  s.addShape('roundRect', {
    x,
    y: 2.85,
    w: 3.95,
    h: 4,
    fill: { color: COLOR.bg },
    line: { color: COLOR.cardRing, width: 1 },
    rectRadius: 0.1,
  })
  s.addText(p.icon, {
    x: x + 0.3,
    y: 3,
    w: 1,
    h: 0.8,
    fontSize: 36,
    fontFace: FONT.regular,
  })
  s.addText(p.titulo, {
    x: x + 1.4,
    y: 3.05,
    w: 2.3,
    h: 0.5,
    fontSize: 19,
    bold: true,
    color: COLOR.inkText,
    fontFace: FONT.regular,
  })
  s.addText(p.tiempo, {
    x: x + 1.4,
    y: 3.55,
    w: 2.3,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: COLOR.brandBlue,
    fontFace: FONT.regular,
  })
  s.addText(
    p.pasos.map((t, j) => ({
      text: `${j + 1}.  ${t}`,
      options: {},
    })),
    {
      x: x + 0.3,
      y: 4.05,
      w: 3.4,
      h: 2.65,
      fontSize: 12,
      color: COLOR.mutedText,
      fontFace: FONT.regular,
      paraSpaceAfter: 6,
      lineSpacing: 18,
    },
  )
}
// Actualización banner
s.addShape('roundRect', {
  x: 0.6,
  y: 7,
  w: 12.1,
  h: 0.3,
  fill: { color: COLOR.brandBlue, transparency: 90 },
  line: { type: 'none' },
  rectRadius: 0.05,
})
s.addText(
  '↻  Se actualiza sola. Cada vez que el usuario abre la app, el navegador descarga la última versión en background. Sin Update now, sin esperas.',
  {
    x: 0.6,
    y: 7,
    w: 12.1,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: COLOR.brandBlue,
    align: 'center',
    valign: 'middle',
    fontFace: FONT.regular,
  },
)
addFooter(s, 23, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 16 — Roadmap corto plazo
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  '07 · ROADMAP CORTO',
  'Próximas semanas.',
  'Funcionalidades con infra ya lista, falta configuración o terminar UI.',
)
const roadmapCorto = [
  {
    estado: 'INFRA LISTA',
    titulo: 'Notificaciones push reales al celular',
    desc: 'Service worker + VAPID deployados. Falta cargar 3 variables de entorno en el servidor.',
    color: COLOR.success,
  },
  {
    estado: 'INFRA LISTA',
    titulo: 'Email automático con PDF firmado',
    desc: 'Generador y envío codeados. Falta cuenta de servicio + verificación de dominio.',
    color: COLOR.success,
  },
  {
    estado: 'DISEÑO HECHO',
    titulo: 'Rol "Publicador de noticias"',
    desc: 'Para delegar la comunicación a Secretaría de Prensa sin acceso al padrón.',
    color: COLOR.amber,
  },
  {
    estado: 'PLANEADO',
    titulo: 'Tests end-to-end con Playwright',
    desc: 'Cobertura completa del flujo afiliado / delegado / admin.',
    color: COLOR.mutedText,
  },
]
for (let i = 0; i < roadmapCorto.length; i++) {
  const r = roadmapCorto[i]!
  const y = 2.85 + i * 0.95
  s.addShape('rect', {
    x: 0.6,
    y,
    w: 0.08,
    h: 0.75,
    fill: { color: r.color },
    line: { type: 'none' },
  })
  s.addText(r.estado, {
    x: 0.85,
    y: y + 0.05,
    w: 2,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: r.color,
    fontFace: FONT.regular,
    charSpacing: 3,
  })
  s.addText(r.titulo, {
    x: 2.9,
    y: y + 0.05,
    w: 9.5,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: COLOR.inkText,
    fontFace: FONT.regular,
  })
  s.addText(r.desc, {
    x: 2.9,
    y: y + 0.4,
    w: 9.5,
    h: 0.5,
    fontSize: 12,
    color: COLOR.mutedText,
    fontFace: FONT.regular,
  })
}
addFooter(s, 24, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 17 — Roadmap mediano/largo
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
addSlideHeader(
  s,
  '07 · ROADMAP MEDIANO/LARGO',
  'Lo que viene en próximos meses.',
  'Funcionalidades que requieren diseño + desarrollo nuevo.',
)
const roadmapLargo = [
  ['Delegados regionales', 'Rol con varios edificios bajo su cargo y vista por región'],
  ['Farmacia médica', 'Búsqueda y geolocalización en el mapa'],
  ['Beneficios y turismo', 'Directorio de comercios adheridos + reservas en complejos'],
  ['Encuestas', 'Realizar encuestas periódicas para poder hacer una lectura de lo que está pasando con los afiliados y delegados'],
  ['Autogestión adherentes', 'El titular agrega/edita familiares desde la app'],
  ['Tracking por pantalla', 'Qué le interesa más a cada perfil para mejorar contenido'],
  ['Votación interna', 'Asambleas digitales con identificación segura'],
  ['Asistente con IA', 'Chatbot para consultas frecuentes (días de pago, trámites)'],
  ['Integración APIs ANSES', 'Validación automática sin cargar Excel mensual'],
  ['Regalos', 'Notificaciones automáticas cuando se realiza algún tipo de regalo: día de la madre, padres, etc.'],
]
for (let i = 0; i < roadmapLargo.length; i++) {
  const [titulo, desc] = roadmapLargo[i]!
  const col = i % 2
  const row = Math.floor(i / 2)
  const x = 0.6 + col * 6.2
  const y = 2.85 + row * 0.85
  s.addShape('ellipse', {
    x: x,
    y: y + 0.15,
    w: 0.4,
    h: 0.4,
    fill: { color: COLOR.brandBlue, transparency: 85 },
    line: { color: COLOR.brandBlue, width: 1 },
  })
  s.addText((i + 1).toString(), {
    x,
    y: y + 0.18,
    w: 0.4,
    h: 0.35,
    fontSize: 11,
    bold: true,
    color: COLOR.brandBlue,
    align: 'center',
    fontFace: FONT.regular,
  })
  s.addText(titulo!, {
    x: x + 0.5,
    y: y,
    w: 5.6,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: COLOR.inkText,
    fontFace: FONT.regular,
  })
  s.addText(desc!, {
    x: x + 0.5,
    y: y + 0.35,
    w: 5.6,
    h: 0.4,
    fontSize: 11,
    color: COLOR.mutedText,
    fontFace: FONT.regular,
  })
}
addFooter(s, 25, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 18 — Cita / cierre conceptual
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.navyDeep }
s.addShape('ellipse', {
  x: W / 2 - 3,
  y: H / 2 - 3,
  w: 6,
  h: 6,
  fill: { color: COLOR.brandBlue, transparency: 92 },
  line: { type: 'none' },
})
s.addText('"', {
  x: 0.7,
  y: 1.5,
  w: 2,
  h: 1.5,
  fontSize: 120,
  bold: true,
  color: COLOR.brandTeal,
  fontFace: FONT.light,
})
s.addText(
  'Esta no es una app de moda ni un gadget. Es la infraestructura digital que el gremio necesita para los próximos 10 años.',
  {
    x: 1.5,
    y: 2.8,
    w: 11,
    h: 2,
    fontSize: 32,
    bold: true,
    color: 'FFFFFF',
    fontFace: FONT.light,
    italic: true,
  },
)
s.addText(
  'Comunicación directa al afiliado · Visibilidad para captar 11.000 no-APOPS · Datos en vivo para decidir · Trámites digitales que ANSES ya va a exigir.',
  {
    x: 1.5,
    y: 5,
    w: 11,
    h: 1,
    fontSize: 15,
    color: 'CBD5E1',
    fontFace: FONT.regular,
  },
)
s.addShape('rect', {
  x: 1.5,
  y: 6.1,
  w: 1.2,
  h: 0.05,
  fill: { color: COLOR.brandTeal },
  line: { type: 'none' },
})
s.addText('La base ya está. El próximo paso es decidir el rollout.', {
  x: 1.5,
  y: 6.25,
  w: 11,
  h: 0.5,
  fontSize: 13,
  color: COLOR.brandTeal,
  bold: true,
  fontFace: FONT.regular,
})
addFooter(s, 26, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// SLIDE 19 — Q&A / Cierre
// ─────────────────────────────────────────────────────────────────────

s = pres.addSlide()
s.background = { color: COLOR.bg }
s.addShape('ellipse', {
  x: -3,
  y: H - 3.5,
  w: 6,
  h: 6,
  fill: { color: COLOR.brandBlue, transparency: 92 },
  line: { type: 'none' },
})
s.addText('GRACIAS', {
  x: 0.7,
  y: 1.8,
  w: 12,
  h: 1.5,
  fontSize: 72,
  bold: true,
  color: COLOR.inkText,
  fontFace: FONT.light,
  charSpacing: 6,
})
s.addText('Preguntas, comentarios, próximos pasos.', {
  x: 0.7,
  y: 3.2,
  w: 12,
  h: 0.6,
  fontSize: 22,
  color: COLOR.mutedText,
  fontFace: FONT.light,
})

// Contacto
s.addShape('rect', {
  x: 0.7,
  y: 4.3,
  w: 0.08,
  h: 1.6,
  fill: { color: COLOR.brandBlue },
  line: { type: 'none' },
})
s.addText('Contacto', {
  x: 1,
  y: 4.3,
  w: 6,
  h: 0.4,
  fontSize: 12,
  bold: true,
  color: COLOR.brandBlue,
  fontFace: FONT.regular,
  charSpacing: 3,
})
s.addText(
  [
    {
      text: 'Saady Pacheco',
      options: { fontSize: 18, bold: true, color: COLOR.inkText, breakLine: true },
    },
    {
      text: 'saady@apops.org.ar  ·  +54 9 11 5544-8300',
      options: { fontSize: 13, color: COLOR.mutedText, breakLine: true },
    },
    {
      text: '\nApp en vivo: ',
      options: { fontSize: 13, color: COLOR.mutedText },
    },
    {
      text: 'https://apops.vercel.app',
      options: { fontSize: 13, color: COLOR.brandBlue, bold: true, breakLine: true },
    },
    {
      text: 'Demo público: ',
      options: { fontSize: 13, color: COLOR.mutedText },
    },
    {
      text: 'https://apops.vercel.app/software',
      options: { fontSize: 13, color: COLOR.brandBlue, bold: true },
    },
  ],
  {
    x: 1,
    y: 4.65,
    w: 11,
    h: 2,
    fontFace: FONT.regular,
  },
)
addFooter(s, 27, SLIDES_TOTAL)

// ─────────────────────────────────────────────────────────────────────
// Guardar
// ─────────────────────────────────────────────────────────────────────

const outFile = 'Presentacion-APOPS-Siempre.pptx'
pres.writeFile({ fileName: outFile }).then((p: string) => {
  console.log(`✓ Presentación generada: ${p}`)
  console.log(`  ${SLIDES_TOTAL} slides · Abrila con PowerPoint, Keynote o Google Slides`)
})
