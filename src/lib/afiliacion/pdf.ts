import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import type { AfiliacionInput } from '@/types/afiliacion'

// Genera el PDF de la ficha de afiliación a partir del input validado
// del wizard. Layout sobrio en una sola columna A4: título, datos
// agrupados por sección, autorización del descuento, firma embedida
// como imagen. Pensado para que APOPS lo archive y el aspirante lo
// tenga como comprobante de lo que envió.

const A4 = { width: 595.28, height: 841.89 } as const
const MARGIN_X = 50
const COLOR_INK = rgb(0.13, 0.16, 0.22)
const COLOR_MUTED = rgb(0.45, 0.5, 0.58)
const COLOR_BRAND = rgb(0.12, 0.45, 0.7)
const COLOR_RULE = rgb(0.85, 0.87, 0.91)

type Group = {
  title: string
  rows: Array<[string, string | undefined | null]>
}

function fmtFecha(s: string | undefined): string {
  if (!s) return ''
  // s viene como 'YYYY-MM-DD' del input type=date
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return s
  return `${m[3]}/${m[2]}/${m[1]}`
}

function buildGroups(data: AfiliacionInput): Group[] {
  return [
    {
      title: 'Datos personales',
      rows: [
        ['Apellido y Nombre', data.apellidoNombre],
        ['Documento', `${data.tipoDocumento} ${data.numeroDocumento}`],
        ['Fecha de nacimiento', fmtFecha(data.fechaNacimiento)],
        ['Estado civil', data.estadoCivil],
      ],
    },
    {
      title: 'Contacto',
      rows: [
        ['Celular', data.celular],
        ['Teléfono', data.telefono],
        ['Email', data.email],
        ['CBU', data.cbu],
      ],
    },
    {
      title: 'Domicilio',
      rows: [
        [
          'Dirección',
          [data.domicilioCalle, data.domicilioNumero]
            .filter(Boolean)
            .join(' '),
        ],
        [
          'Piso / Depto',
          [data.domicilioPiso, data.domicilioDepto].filter(Boolean).join(' '),
        ],
        ['Localidad', data.domicilioLocalidad],
        ['Provincia', data.domicilioProvincia],
        ['Código postal', data.domicilioCp],
      ],
    },
    {
      title: 'Lugar de trabajo',
      rows: [
        ['Legajo', data.numeroLegajo],
        ['Edificio / UDAI', data.edificioUdai],
        ['Área', data.areaUdai],
        ['Gerencia', data.gerencia],
        ['Cargo / Función', data.cargoFuncion],
        ['Categoría', data.categoria],
        ['Tipo de planta', data.tipoPlanta],
      ],
    },
  ]
}

const AUTORIZACION_TEXT =
  'Autorizo a la Administración Nacional de Seguridad Social a que del ' +
  'importe total mensual que percibo, se me descuente el 3% en calidad ' +
  'de afiliado/a a esta Asociación Sindical (APOPS). Declaro que los ' +
  'datos expuestos son fieles y veraces.'

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const probe = current ? `${current} ${w}` : w
    if (font.widthOfTextAtSize(probe, size) <= maxWidth) {
      current = probe
    } else {
      if (current) lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function generateAfiliacionPdf(
  data: AfiliacionInput,
  opts?: { solicitudId?: string; createdAt?: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Ficha de afiliación — ${data.apellidoNombre}`)
  pdf.setAuthor('APOPS Siempre')
  pdf.setCreator('apops.vercel.app')

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let page = pdf.addPage([A4.width, A4.height])
  const usableWidth = A4.width - MARGIN_X * 2
  let y = A4.height - 60

  function nextPageIfNeeded(neededHeight: number) {
    if (y - neededHeight < 60) {
      page = pdf.addPage([A4.width, A4.height])
      y = A4.height - 60
    }
  }

  // ─── Header ─────────────────────────────────────────────────────────
  page.drawText('APOPS Siempre', {
    x: MARGIN_X,
    y,
    size: 18,
    font: fontBold,
    color: COLOR_BRAND,
  })
  page.drawText('Ficha de afiliación', {
    x: MARGIN_X,
    y: y - 22,
    size: 14,
    font: fontBold,
    color: COLOR_INK,
  })

  const fechaTxt = opts?.createdAt
    ? new Date(opts.createdAt).toLocaleString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('es-AR')
  page.drawText(`Recibida: ${fechaTxt}`, {
    x: MARGIN_X,
    y: y - 40,
    size: 9,
    font,
    color: COLOR_MUTED,
  })
  if (opts?.solicitudId) {
    page.drawText(`Ref: ${opts.solicitudId.slice(0, 8).toUpperCase()}`, {
      x: MARGIN_X + 200,
      y: y - 40,
      size: 9,
      font,
      color: COLOR_MUTED,
    })
  }

  y -= 60
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: A4.width - MARGIN_X, y },
    thickness: 0.6,
    color: COLOR_RULE,
  })
  y -= 22

  // ─── Grupos de datos ────────────────────────────────────────────────
  const groups = buildGroups(data)
  for (const group of groups) {
    const filled = group.rows.filter(([, v]) => v && String(v).trim() !== '')
    if (filled.length === 0) continue

    nextPageIfNeeded(20 + filled.length * 14 + 10)

    page.drawText(group.title.toUpperCase(), {
      x: MARGIN_X,
      y,
      size: 9,
      font: fontBold,
      color: COLOR_BRAND,
    })
    y -= 14

    for (const [label, valueRaw] of filled) {
      const value = String(valueRaw).trim()
      page.drawText(`${label}:`, {
        x: MARGIN_X,
        y,
        size: 10,
        font,
        color: COLOR_MUTED,
      })
      const valLines = wrapText(value, fontBold, 10, usableWidth - 130)
      let yVal = y
      for (const ln of valLines) {
        page.drawText(ln, {
          x: MARGIN_X + 130,
          y: yVal,
          size: 10,
          font: fontBold,
          color: COLOR_INK,
        })
        yVal -= 12
      }
      y = Math.min(y - 14, yVal - 2)
    }
    y -= 8
  }

  // ─── Familiares (si los hay) ────────────────────────────────────────
  if (data.familiares && data.familiares.length > 0) {
    nextPageIfNeeded(20 + data.familiares.length * 14)
    page.drawText('FAMILIARES', {
      x: MARGIN_X,
      y,
      size: 9,
      font: fontBold,
      color: COLOR_BRAND,
    })
    y -= 14
    for (const f of data.familiares) {
      const line = [
        f.apellidoNombre,
        f.parentesco ? `(${f.parentesco})` : '',
        f.tipoDoc && f.numeroDoc ? `${f.tipoDoc} ${f.numeroDoc}` : '',
        f.fechaNac ? `· nac. ${fmtFecha(f.fechaNac)}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      page.drawText(`• ${line}`, {
        x: MARGIN_X + 8,
        y,
        size: 10,
        font,
        color: COLOR_INK,
      })
      y -= 14
    }
    y -= 8
  }

  // ─── Autorización ────────────────────────────────────────────────────
  nextPageIfNeeded(80)
  page.drawText('AUTORIZACIÓN', {
    x: MARGIN_X,
    y,
    size: 9,
    font: fontBold,
    color: COLOR_BRAND,
  })
  y -= 14
  const autLines = wrapText(AUTORIZACION_TEXT, font, 10, usableWidth)
  for (const ln of autLines) {
    page.drawText(ln, {
      x: MARGIN_X,
      y,
      size: 10,
      font,
      color: COLOR_INK,
    })
    y -= 13
  }
  y -= 10

  // ─── Firma ───────────────────────────────────────────────────────────
  nextPageIfNeeded(120)
  page.drawText('FIRMA', {
    x: MARGIN_X,
    y,
    size: 9,
    font: fontBold,
    color: COLOR_BRAND,
  })
  y -= 12

  // firmaPng viene como dataURL 'data:image/png;base64,XXX'
  const base64 = data.firmaPng.replace(/^data:image\/png;base64,/, '')
  try {
    const bytes = Uint8Array.from(Buffer.from(base64, 'base64'))
    const png = await pdf.embedPng(bytes)
    const maxFirmaW = 240
    const scale = Math.min(maxFirmaW / png.width, 80 / png.height)
    const w = png.width * scale
    const h = png.height * scale
    page.drawImage(png, {
      x: MARGIN_X,
      y: y - h,
      width: w,
      height: h,
    })
    y -= h + 4
  } catch {
    page.drawText('(no se pudo embeber la firma)', {
      x: MARGIN_X,
      y: y - 14,
      size: 9,
      font,
      color: COLOR_MUTED,
    })
    y -= 20
  }

  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: MARGIN_X + 240, y },
    thickness: 0.8,
    color: COLOR_INK,
  })
  page.drawText(data.apellidoNombre, {
    x: MARGIN_X,
    y: y - 12,
    size: 9,
    font,
    color: COLOR_MUTED,
  })

  return pdf.save()
}
