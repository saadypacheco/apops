// Tipos del importador de padrón ANSES (.xlsx).
// El parser vive en src/lib/admin/padron-parser.ts (puro, testeable).
// La server action en src/lib/admin/actions-padron.ts (orquesta).

export type Periodo = {
  /** Etiqueta humana extraída de A1, ej "JULIO 2016". */
  label: string
  year: number
  /** 1-12 */
  month: number
}

export type Sexo = 'Varón' | 'Mujer' | 'Otro'

/**
 * Una fila del padrón ya validada y normalizada. Mapea ~1:1 a columnas de
 * padron_cotizantes. La columna `fecha_baja_excel` NO va a esa tabla — la usa
 * la server action durante el re-link para setear afiliados.fecha_baja.
 */
export type PadronRow = {
  // Identidad — legajo es el identificador primario (decisión cliente).
  // DNI es informativo y puede faltar (~0.1% del padrón ANSES viene con DNI vacío).
  legajo: string
  dni: string | null
  nombre: string

  // Otros documentos
  cuil: string | null

  // Fechas — ISO YYYY-MM-DD
  fecha_ingreso: string | null
  fecha_nacimiento: string | null
  fecha_actualizacion_delegados: string | null

  // Categoría y planta
  categoria: number | null
  tipo_planta: 'PP' | 'PT' | null

  // Lugar de trabajo
  lugar_trabajo_padron: string | null
  lugar_trabajo_relevamiento: string | null
  lugar_trabajo_rrhh: string | null

  // Gremios
  afiliado_apops: boolean
  afiliado_ate: boolean
  afiliado_sec: boolean
  afiliado_upcn: boolean
  afiliado_secasfpi: boolean
  cotiza_papel: boolean

  // Otros
  sexo: Sexo | null
  provincia: string | null
  regional: string | null
  representante: string | null
  periodo_mandato: string | null
  vence_mandato_30dias: boolean | null

  // Fecha de baja del cotizante según el Excel. NO se persiste en
  // padron_cotizantes — la server action la usa para popular afiliados.fecha_baja
  // si el DNI matchea un afiliado existente.
  fecha_baja_excel: string | null
}

/** Error que rompe toda la carga (header faltante, A1 ilegible). */
export type FatalError = {
  type:
    | 'workbook_invalid'
    | 'no_sheets'
    | 'a1_empty'
    | 'period_unparseable'
    | 'headers_missing'
    | 'row_critical'
  message: string
  /** Si aplica: fila del Excel 1-indexed. */
  row?: number
}

/** Error en una fila que NO aborta la carga — la fila pasa con campos nulleados. */
export type SoftError = {
  /** Fila del Excel 1-indexed. */
  row: number
  column: string
  message: string
}

export type ParseSuccess = {
  ok: true
  periodo: Periodo
  rows: PadronRow[]
  softErrors: SoftError[]
}

export type ParseFailure = {
  ok: false
  error: string
  fatalErrors: FatalError[]
  softErrors: SoftError[]
}

export type ParseResult = ParseSuccess | ParseFailure

// =====================================================================
// Estado del form server action (compatible con useFormState)
// =====================================================================

export type SubirPadronTotals = {
  filas: number
  apops: number
  ate: number
  upcn: number
  secasfpi: number
  papel: number
  delegados: number
  plantaPerm: number
  plantaTrans: number
}

export type SubirPadronSuccess = {
  snapshotId: string
  periodo: Periodo
  totals: SubirPadronTotals
  /** Cuántos afiliados quedaron en baja por desaparecer del padrón. */
  bajasAutomaticas: number
  /** Cuántos afiliados quedaron sin padron_id por no matchear (no se dieron de baja). */
  afiliadosSinMatch: number
  softErrors: SoftError[]
}

export type SubirPadronNeedsConfirmation = {
  periodo: Periodo
  snapshotExistente: {
    id: string
    importado_at: string
    total_filas: number
  }
}

export type SubirPadronState = {
  success?: SubirPadronSuccess
  needsConfirmation?: SubirPadronNeedsConfirmation
  error?: string
  fatalErrors?: FatalError[]
  softErrors?: SoftError[]
}
