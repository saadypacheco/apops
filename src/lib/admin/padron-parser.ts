import * as XLSX from 'xlsx'
import type {
  FatalError,
  PadronRow,
  ParseResult,
  Periodo,
  Sexo,
  SoftError,
} from '@/types/padron'

// Parser puro del .xlsx del padrón ANSES. Sin dependencias de Next ni Supabase.
// Toma un buffer (server o test), devuelve filas validadas + errores.
//
// Layout esperado del Excel:
//   Fila 1, celda A1: "PADRON GENERAL - COTIZANTES DE JULIO 2016"
//   Fila 2: headers
//   Fila 3+: datos
//
// Si el ANSES cambia el layout (ej. agrega filas de comentario antes de los
// headers), este parser falla con error claro. La fix es ajustar acá.

// =====================================================================
// Mapeo de headers → keys del modelo. Las keys del LHS están normalizadas
// (lowercase, sin tildes, espacios colapsados). Cualquier columna no listada
// se ignora silenciosamente.
// =====================================================================

type ColumnKey =
  | 'legajo'
  | 'nombre'
  | 'fecha_ingreso'
  | 'fecha_nacimiento'
  | 'dni'
  | 'cuil'
  | 'categoria'
  | 'lugar_trabajo_rrhh'
  | 'lugar_trabajo_padron'
  | 'lugar_trabajo_relevamiento'
  | 'fecha_actualizacion_delegados'
  | 'afiliado_ate'
  | 'afiliado_apops'
  | 'afiliado_sec'
  | 'afiliado_upcn'
  | 'afiliado_secasfpi'
  | 'representante'
  | 'periodo_mandato'
  | 'provincia'
  | 'regional'
  | 'sexo'
  | 'tipo_planta'
  | 'vence_mandato_30dias'
  | 'cotiza_papel'
  | 'fecha_baja_excel'

const HEADER_MAP: Record<string, ColumnKey> = {
  legajo: 'legajo',
  nombre: 'nombre',
  fecha_ingreso: 'fecha_ingreso',
  'fecha ingreso': 'fecha_ingreso',
  fecha_nac: 'fecha_nacimiento',
  'fecha nac': 'fecha_nacimiento',
  dni: 'dni',
  cuil: 'cuil',
  cat: 'categoria',
  categoria: 'categoria',
  'lugar de trabajo (segun rrhh)': 'lugar_trabajo_rrhh',
  'lugar de trabajo (segun padron cotizantes)': 'lugar_trabajo_padron',
  'lugar de trabajo (segun relevamiento delegados)':
    'lugar_trabajo_relevamiento',
  'fecha ultima actualizacion (informacion delegados)':
    'fecha_actualizacion_delegados',
  ate: 'afiliado_ate',
  apops: 'afiliado_apops',
  sec: 'afiliado_sec',
  upcn: 'afiliado_upcn',
  secasfpi: 'afiliado_secasfpi',
  representante: 'representante',
  'periodo del mandato': 'periodo_mandato',
  provincia: 'provincia',
  regionales: 'regional',
  regional: 'regional',
  sexo: 'sexo',
  'tipo planta': 'tipo_planta',
  'vence mandato durante los proximos 30 dias': 'vence_mandato_30dias',
  'vence mandato durante los proximos 30 dias ?': 'vence_mandato_30dias',
  '¿vence mandato durante los proximos 30 dias?': 'vence_mandato_30dias',
  'cotiza solo en papel': 'cotiza_papel',
  'fecha baja': 'fecha_baja_excel',
  'fecha de baja': 'fecha_baja_excel',
  fecha_baja: 'fecha_baja_excel',
}

// Headers cuya ausencia aborta la carga entera. Legajo es el ID primario;
// nombre es necesario para mostrar en cualquier UI. DNI no entra porque
// es opcional a nivel fila (~0.1% del padrón ANSES viene sin DNI).
const REQUIRED_COLUMNS: ColumnKey[] = ['legajo', 'nombre']

// =====================================================================
// Helpers de normalización
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

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

export function parsePeriodo(a1: string): Periodo | null {
  // Busca un mes + año en cualquier parte del string. Tolerante a prefijos
  // ("PADRON GENERAL - COTIZANTES DE JULIO 2016").
  const match = a1.match(/([A-Za-záéíóúñÁÉÍÓÚÑ]{4,})\s+(\d{4})/)
  if (!match || !match[1] || !match[2]) return null
  const mesRaw = normalize(match[1])
  const year = parseInt(match[2], 10)
  const month = MESES[mesRaw]
  if (!month || year < 2000 || year > 2100) return null
  return {
    label: `${mesRaw.toUpperCase()} ${year}`,
    year,
    month,
  }
}

function toBoolFlag(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const s = String(v).trim().toLowerCase()
  if (s === '' || s === '0' || s === 'no' || s === 'false' || s === 'n') {
    return false
  }
  return true
}

/** Como toBoolFlag pero devuelve null si la celda está vacía (para campos opcionales nullable). */
function toBoolOrNull(v: unknown): boolean | null {
  if (v === null || v === undefined || v === '') return null
  return toBoolFlag(v)
}

function toTrimString(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s
}

function parseSexo(v: unknown): { value: Sexo | null; soft?: string } {
  const s = normalize(v)
  if (!s) return { value: null }
  if (/^(v|var(o|ó)n|m|masculino)$/.test(s)) return { value: 'Varón' }
  if (/^(f|mujer|femenino)$/.test(s)) return { value: 'Mujer' }
  // Cualquier otro valor con contenido → "Otro" + soft warning
  return {
    value: 'Otro',
    soft: `Sexo no reconocido "${String(v)}", normalizado a "Otro".`,
  }
}

function parseTipoPlanta(v: unknown): {
  value: 'PP' | 'PT' | null
  soft?: string
} {
  const s = normalize(v).toUpperCase()
  if (!s) return { value: null }
  if (s === 'PP' || s === 'PLANTA PERMANENTE') return { value: 'PP' }
  if (s === 'PT' || s === 'PLANTA TRANSITORIA') return { value: 'PT' }
  return {
    value: null,
    soft: `Tipo Planta no reconocido "${String(v)}".`,
  }
}

function parseFechaCell(v: unknown): { value: string | null; soft?: string } {
  if (v === null || v === undefined || v === '') return { value: null }

  // xlsx con cellDates:true devuelve Date directamente para fechas reales
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return { value: null, soft: 'Fecha inválida.' }
    // Excel a veces interpreta el TZ offset; nos quedamos con la fecha YYYY-MM-DD
    // tal cual aparece en la celda (sin shift por timezone).
    const y = v.getUTCFullYear()
    const m = String(v.getUTCMonth() + 1).padStart(2, '0')
    const d = String(v.getUTCDate()).padStart(2, '0')
    return { value: `${y}-${m}-${d}` }
  }

  // Strings: tolerar dd/mm/yyyy o yyyy-mm-dd
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

function parseCategoria(v: unknown): {
  value: number | null
  soft?: string
} {
  if (v === null || v === undefined || v === '') return { value: null }
  const n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10)
  if (isNaN(n)) return { value: null, soft: `Categoría ilegible "${v}".` }
  if (n < 0 || n > 32767) {
    return { value: null, soft: `Categoría fuera de rango "${v}".` }
  }
  return { value: n }
}

function parseDni(v: unknown): { value: string | null; error?: string } {
  if (v === null || v === undefined || v === '') {
    return { value: null, error: 'DNI vacío.' }
  }
  // ANSES a veces devuelve DNI como número (sin puntos) o string. Normalizar.
  const raw =
    typeof v === 'number' ? String(Math.trunc(v)) : String(v).replace(/\./g, '').trim()
  if (!/^[0-9]{7,8}$/.test(raw)) {
    return { value: null, error: `DNI inválido "${v}".` }
  }
  return { value: raw }
}

function parseCuil(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  const raw =
    typeof v === 'number' ? String(Math.trunc(v)) : String(v).replace(/[-\s]/g, '').trim()
  // CUIL: 11 dígitos. Si no matchea, lo guardamos crudo (no es campo crítico).
  return /^[0-9]{11}$/.test(raw) ? raw : raw || null
}

// =====================================================================
// Parser principal
// =====================================================================

export function parseXlsxPadron(
  buffer: ArrayBuffer | Uint8Array | Buffer,
): ParseResult {
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

  // 1. Período de A1
  const a1 = rows[0]?.[0]
  if (a1 === null || a1 === undefined || String(a1).trim() === '') {
    return {
      ok: false,
      error:
        'La celda A1 está vacía. Esperamos algo como "PADRON GENERAL - COTIZANTES DE JULIO 2016".',
      fatalErrors: [{ type: 'a1_empty', message: 'A1 vacía.' }],
      softErrors: [],
    }
  }
  const periodo = parsePeriodo(String(a1))
  if (!periodo) {
    return {
      ok: false,
      error: `No pude leer el período de A1: "${a1}". Esperamos mes y año al final (ej "...DE JULIO 2016").`,
      fatalErrors: [
        {
          type: 'period_unparseable',
          message: `A1="${a1}"`,
        },
      ],
      softErrors: [],
    }
  }

  // 2. Headers en fila 2
  const headerRow = rows[1]
  if (!headerRow) {
    return {
      ok: false,
      error: 'No encontré la fila de headers (esperada en la fila 2).',
      fatalErrors: [{ type: 'headers_missing', message: 'Fila 2 vacía.' }],
      softErrors: [],
    }
  }

  // colIndex: key del modelo → índice de columna (number)
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

  // 3. Parse fila por fila
  const dataRows = rows.slice(2)
  const parsed: PadronRow[] = []
  const fatalErrors: FatalError[] = []
  const softErrors: SoftError[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    if (!row) continue
    const excelRow = i + 3 // 1-indexed; header está en 2, primer dato en 3

    // Skipear filas totalmente vacías (xlsx puede dejar trailing nulls)
    if (row.every((c) => c === null || c === undefined || c === '')) continue

    const get = (key: ColumnKey): unknown => {
      const idx = colIndex[key]
      return idx === undefined ? null : row[idx]
    }

    // Legajo: identificador primario. Sin legajo, la fila es crítica.
    const legajoRaw = toTrimString(get('legajo'))
    if (!legajoRaw) {
      fatalErrors.push({
        type: 'row_critical',
        message: 'Legajo vacío.',
        row: excelRow,
      })
      continue
    }
    const nombre = toTrimString(get('nombre'))
    if (!nombre) {
      fatalErrors.push({
        type: 'row_critical',
        message: `Nombre vacío (legajo ${legajoRaw}).`,
        row: excelRow,
      })
      continue
    }
    // DNI: opcional. Si viene pero está mal formado, soft error.
    const dniResult = parseDni(get('dni'))
    const dniRaw = get('dni')
    if (
      !dniResult.value &&
      dniRaw !== null &&
      dniRaw !== undefined &&
      dniRaw !== ''
    ) {
      softErrors.push({
        row: excelRow,
        column: 'dni',
        message: dniResult.error ?? `DNI inválido "${dniRaw}".`,
      })
    }

    const fechaIngreso = parseFechaCell(get('fecha_ingreso'))
    if (fechaIngreso.soft) {
      softErrors.push({
        row: excelRow,
        column: 'fecha_ingreso',
        message: fechaIngreso.soft,
      })
    }
    const fechaNac = parseFechaCell(get('fecha_nacimiento'))
    if (fechaNac.soft) {
      softErrors.push({
        row: excelRow,
        column: 'fecha_nacimiento',
        message: fechaNac.soft,
      })
    }
    const fechaActDel = parseFechaCell(get('fecha_actualizacion_delegados'))
    if (fechaActDel.soft) {
      softErrors.push({
        row: excelRow,
        column: 'fecha_actualizacion_delegados',
        message: fechaActDel.soft,
      })
    }
    const fechaBaja = parseFechaCell(get('fecha_baja_excel'))
    if (fechaBaja.soft) {
      softErrors.push({
        row: excelRow,
        column: 'fecha_baja',
        message: fechaBaja.soft,
      })
    }
    const cat = parseCategoria(get('categoria'))
    if (cat.soft) {
      softErrors.push({ row: excelRow, column: 'cat', message: cat.soft })
    }
    const tipoPlanta = parseTipoPlanta(get('tipo_planta'))
    if (tipoPlanta.soft) {
      softErrors.push({
        row: excelRow,
        column: 'tipo_planta',
        message: tipoPlanta.soft,
      })
    }
    const sexo = parseSexo(get('sexo'))
    if (sexo.soft) {
      softErrors.push({ row: excelRow, column: 'sexo', message: sexo.soft })
    }

    parsed.push({
      legajo: legajoRaw.toUpperCase(),
      dni: dniResult.value,
      nombre,
      cuil: parseCuil(get('cuil')),
      fecha_ingreso: fechaIngreso.value,
      fecha_nacimiento: fechaNac.value,
      fecha_actualizacion_delegados: fechaActDel.value,
      categoria: cat.value,
      tipo_planta: tipoPlanta.value,
      lugar_trabajo_padron: toTrimString(get('lugar_trabajo_padron')),
      lugar_trabajo_relevamiento: toTrimString(
        get('lugar_trabajo_relevamiento'),
      ),
      lugar_trabajo_rrhh: toTrimString(get('lugar_trabajo_rrhh')),
      afiliado_apops: toBoolFlag(get('afiliado_apops')),
      afiliado_ate: toBoolFlag(get('afiliado_ate')),
      afiliado_sec: toBoolFlag(get('afiliado_sec')),
      afiliado_upcn: toBoolFlag(get('afiliado_upcn')),
      afiliado_secasfpi: toBoolFlag(get('afiliado_secasfpi')),
      cotiza_papel: toBoolFlag(get('cotiza_papel')),
      sexo: sexo.value,
      provincia: toTrimString(get('provincia')),
      regional: toTrimString(get('regional')),
      representante: toTrimString(get('representante')),
      periodo_mandato: toTrimString(get('periodo_mandato')),
      vence_mandato_30dias: toBoolOrNull(get('vence_mandato_30dias')),
      fecha_baja_excel: fechaBaja.value,
    })
  }

  if (fatalErrors.length > 0) {
    return {
      ok: false,
      error: `Hay ${fatalErrors.length} fila(s) con errores críticos (DNI o nombre inválido). Corregí el Excel y reintentá.`,
      fatalErrors,
      softErrors,
    }
  }

  return {
    ok: true,
    periodo,
    rows: parsed,
    softErrors,
  }
}
