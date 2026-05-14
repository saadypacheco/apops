import * as XLSX from 'xlsx'

// Parser puro del .xlsx de adherentes (familiares de cotizantes).
// Sin dependencias de Next ni Supabase. Es paralelo al padron-parser.ts
// pero con un schema mucho más simple (la data es interna del gremio).
//
// Layout esperado:
//   Fila 1: headers (no hay celda de período como en el padrón)
//   Fila 2+: datos
//
// Columnas reconocidas (case-insensitive, sin tildes):
//   Titular DNI / DNI Titular    (al menos una, sino fila inválida)
//   Titular Legajo / Legajo Titular
//   Nombre / Apellido y Nombre
//   DNI                          (del adherente, opcional para menores)
//   Vinculo / Parentesco         (conyuge | hijo | hija | padre | madre | hermano | hermana | otro)
//   Fecha Nacimiento / Fecha Nac
//   Numero Afiliado / N° Afiliado
//   Email / Correo
//   Telefono / Celular

export type AdherenteRow = {
  titular_dni: string | null
  titular_legajo: string | null
  nombre: string
  dni: string | null
  vinculo:
    | 'conyuge'
    | 'hijo'
    | 'hija'
    | 'padre'
    | 'madre'
    | 'hermano'
    | 'hermana'
    | 'otro'
  fecha_nacimiento: string | null
  numero_afiliado: string | null
  email: string | null
  telefono: string | null
}

export type AdherenteFatalError = {
  type:
    | 'workbook_invalid'
    | 'no_sheets'
    | 'no_rows'
    | 'headers_missing'
    | 'row_critical'
  message: string
  row?: number
}

export type AdherenteSoftError = {
  row: number
  column: string
  message: string
}

export type AdherenteParseResult =
  | {
      ok: true
      rows: AdherenteRow[]
      softErrors: AdherenteSoftError[]
    }
  | {
      ok: false
      error: string
      fatalErrors: AdherenteFatalError[]
      softErrors: AdherenteSoftError[]
    }

// =====================================================================
// Mapeo headers
// =====================================================================

type ColumnKey =
  | 'titular_dni'
  | 'titular_legajo'
  | 'nombre'
  | 'dni'
  | 'vinculo'
  | 'fecha_nacimiento'
  | 'numero_afiliado'
  | 'email'
  | 'telefono'

const HEADER_MAP: Record<string, ColumnKey> = {
  'titular dni': 'titular_dni',
  'dni titular': 'titular_dni',
  'titular legajo': 'titular_legajo',
  'legajo titular': 'titular_legajo',
  nombre: 'nombre',
  'apellido y nombre': 'nombre',
  'apellido nombre': 'nombre',
  dni: 'dni',
  vinculo: 'vinculo',
  parentesco: 'vinculo',
  fecha_nacimiento: 'fecha_nacimiento',
  'fecha nacimiento': 'fecha_nacimiento',
  'fecha nac': 'fecha_nacimiento',
  numero_afiliado: 'numero_afiliado',
  'numero afiliado': 'numero_afiliado',
  'n afiliado': 'numero_afiliado',
  'n° afiliado': 'numero_afiliado',
  email: 'email',
  correo: 'email',
  'correo electronico': 'email',
  telefono: 'telefono',
  celular: 'telefono',
  'tel': 'telefono',
}

const REQUIRED_COLUMNS: ColumnKey[] = ['nombre', 'vinculo']

// =====================================================================
// Helpers
// =====================================================================

function normalize(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toTrimString(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s
}

function parseFechaCell(v: unknown): { value: string | null; soft?: string } {
  if (v === null || v === undefined || v === '') return { value: null }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return { value: null, soft: 'Fecha inválida.' }
    const y = v.getUTCFullYear()
    const m = String(v.getUTCMonth() + 1).padStart(2, '0')
    const d = String(v.getUTCDate()).padStart(2, '0')
    return { value: `${y}-${m}-${d}` }
  }
  const s = String(v).trim()
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    return { value: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}` }
  }
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const d = dmyMatch[1].padStart(2, '0')
    const m = dmyMatch[2].padStart(2, '0')
    let y = dmyMatch[3]
    if (y.length === 2) y = parseInt(y, 10) > 50 ? `19${y}` : `20${y}`
    return { value: `${y}-${m}-${d}` }
  }
  return { value: null, soft: `Fecha ilegible "${s}".` }
}

function parseDni(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  const raw =
    typeof v === 'number'
      ? String(Math.trunc(v))
      : String(v).replace(/\./g, '').trim()
  return /^[0-9]{7,8}$/.test(raw) ? raw : null
}

function parseVinculo(v: unknown): AdherenteRow['vinculo'] | null {
  const s = normalize(v)
  if (!s) return null
  if (/^c[óo]nyuge$|^esposa?$|^esposo$/.test(s)) return 'conyuge'
  if (s === 'hijo') return 'hijo'
  if (s === 'hija') return 'hija'
  if (s === 'padre') return 'padre'
  if (s === 'madre') return 'madre'
  if (s === 'hermano') return 'hermano'
  if (s === 'hermana') return 'hermana'
  if (s === 'otro' || s === 'otra' || s === 'otros') return 'otro'
  return null
}

function parseEmail(v: unknown): string | null {
  const s = toTrimString(v)
  if (!s) return null
  if (!s.includes('@')) return null
  return s.toLowerCase()
}

// =====================================================================
// Parser principal
// =====================================================================

export function parseXlsxAdherentes(
  buffer: ArrayBuffer | Uint8Array | Buffer,
): AdherenteParseResult {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  } catch (e) {
    return {
      ok: false,
      error: 'El archivo no parece ser un Excel válido.',
      fatalErrors: [
        {
          type: 'workbook_invalid',
          message: e instanceof Error ? e.message : String(e),
        },
      ],
      softErrors: [],
    }
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return {
      ok: false,
      error: 'El Excel no tiene hojas.',
      fatalErrors: [{ type: 'no_sheets', message: 'SheetNames vacío.' }],
      softErrors: [],
    }
  }
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    return {
      ok: false,
      error: `No pude abrir la hoja "${sheetName}".`,
      fatalErrors: [
        { type: 'no_sheets', message: `Sheets["${sheetName}"] undefined.` },
      ],
      softErrors: [],
    }
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  })

  // Fila 1 = headers
  const headerRow = rows[0]
  if (!headerRow) {
    return {
      ok: false,
      error: 'No encontré la fila de headers (esperada en la fila 1).',
      fatalErrors: [{ type: 'headers_missing', message: 'Fila 1 vacía.' }],
      softErrors: [],
    }
  }
  const colIndex: Partial<Record<ColumnKey, number>> = {}
  headerRow.forEach((cell, idx) => {
    const key = HEADER_MAP[normalize(cell)]
    if (key && colIndex[key] === undefined) {
      colIndex[key] = idx
    }
  })

  const missing = REQUIRED_COLUMNS.filter((c) => colIndex[c] === undefined)
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Faltan columnas obligatorias: ${missing.join(', ')}.`,
      fatalErrors: [
        {
          type: 'headers_missing',
          message: `Faltan: ${missing.join(', ')}`,
        },
      ],
      softErrors: [],
    }
  }

  const dataRows = rows.slice(1)
  const parsed: AdherenteRow[] = []
  const fatalErrors: AdherenteFatalError[] = []
  const softErrors: AdherenteSoftError[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    if (!row) continue
    const excelRow = i + 2
    if (row.every((c) => c === null || c === undefined || c === '')) continue

    const get = (key: ColumnKey): unknown => {
      const idx = colIndex[key]
      return idx === undefined ? null : row[idx]
    }

    const titularDni = parseDni(get('titular_dni'))
    const titularLegajoRaw = toTrimString(get('titular_legajo'))
    const titularLegajo = titularLegajoRaw ? titularLegajoRaw.toUpperCase() : null

    if (!titularDni && !titularLegajo) {
      fatalErrors.push({
        type: 'row_critical',
        message: 'Falta DNI o legajo del titular — no se puede vincular.',
        row: excelRow,
      })
      continue
    }

    const nombre = toTrimString(get('nombre'))
    if (!nombre) {
      fatalErrors.push({
        type: 'row_critical',
        message: 'Nombre del adherente vacío.',
        row: excelRow,
      })
      continue
    }

    const vinculo = parseVinculo(get('vinculo'))
    if (!vinculo) {
      fatalErrors.push({
        type: 'row_critical',
        message: `Vínculo inválido "${get('vinculo')}". Esperados: cónyuge, hijo, hija, padre, madre, hermano, hermana, otro.`,
        row: excelRow,
      })
      continue
    }

    const fechaNac = parseFechaCell(get('fecha_nacimiento'))
    if (fechaNac.soft) {
      softErrors.push({
        row: excelRow,
        column: 'fecha_nacimiento',
        message: fechaNac.soft,
      })
    }

    parsed.push({
      titular_dni: titularDni,
      titular_legajo: titularLegajo,
      nombre,
      dni: parseDni(get('dni')),
      vinculo,
      fecha_nacimiento: fechaNac.value,
      numero_afiliado: toTrimString(get('numero_afiliado')),
      email: parseEmail(get('email')),
      telefono: toTrimString(get('telefono')),
    })
  }

  if (fatalErrors.length > 0) {
    return {
      ok: false,
      error: `Hay ${fatalErrors.length} fila(s) con errores críticos. Corregí el Excel y reintentá.`,
      fatalErrors,
      softErrors,
    }
  }

  return { ok: true, rows: parsed, softErrors }
}
