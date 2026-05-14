'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAfiliado } from '@/lib/auth/role'
import {
  parseXlsxAdherentes,
  type AdherenteFatalError,
  type AdherenteRow,
  type AdherenteSoftError,
} from '@/lib/admin/adherentes-parser'

// Server action de carga de adherentes (familiares). Paralelo a subirPadron
// pero más simple porque la data es interna del gremio: cada carga reemplaza
// el batch anterior (modo full-replace) o se acumula (modo append) según el
// flag del form.

const BATCH_SIZE = 500

async function requireAdmin(): Promise<
  { ok: true; afiliadoId: string } | { ok: false; error: string }
> {
  const session = await getCurrentAfiliado()
  if (!session || session.rol !== 'admin') {
    return { ok: false, error: 'No tenés permisos.' }
  }
  return { ok: true, afiliadoId: session.afiliadoId }
}

export type SubirAdherentesState = {
  success?: {
    insertados: number
    titularesConAdherentes: number
    modo: 'reemplazo' | 'agregar'
    softErrors: AdherenteSoftError[]
    archivoNombre: string
  }
  error?: string
  fatalErrors?: AdherenteFatalError[]
  softErrors?: AdherenteSoftError[]
}

export async function subirAdherentes(
  _prev: SubirAdherentesState,
  formData: FormData,
): Promise<SubirAdherentesState> {
  const traceId = Math.random().toString(36).slice(2, 8)
  const log = (step: string, data: Record<string, unknown> = {}) =>
    console.log(`[ADHERENTES_IMPORT ${traceId}] ${step}`, data)

  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const file = formData.get('archivo')
  if (!file || !(file instanceof File)) {
    return { error: 'Adjuntá un archivo .xlsx.' }
  }
  const modo: 'reemplazo' | 'agregar' =
    formData.get('modo') === 'agregar' ? 'agregar' : 'reemplazo'
  log('inicio', { archivo: file.name, size: file.size, modo })

  // 1. Parse
  const buffer = new Uint8Array(await file.arrayBuffer())
  const parsed = parseXlsxAdherentes(buffer)
  if (!parsed.ok) {
    log('parse_failed', {
      error: parsed.error,
      fatalCount: parsed.fatalErrors.length,
    })
    return {
      error: parsed.error,
      fatalErrors: parsed.fatalErrors,
      softErrors: parsed.softErrors,
    }
  }
  const rows = parsed.rows
  log('parsed', { filas: rows.length, soft: parsed.softErrors.length })

  const admin = createAdminClient()

  // 2. Si modo=reemplazo, borrar todos los adherentes anteriores. Si es
  //    agregar, simplemente sumamos los nuevos.
  // Usamos un source_batch generado por carga para trazabilidad.
  const sourceBatch = crypto.randomUUID()

  if (modo === 'reemplazo') {
    log('borrando_todos')
    const { error: delErr } = await admin
      .from('padron_adherentes')
      .delete()
      .not('id', 'is', null) // truco para evitar "DELETE requires WHERE"
    if (delErr) {
      return { error: `No pudimos borrar adherentes previos: ${delErr.message}` }
    }
  }

  // 3. INSERT en batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((r: AdherenteRow) => ({
      ...r,
      source_batch: sourceBatch,
    }))
    const { error } = await admin.from('padron_adherentes').insert(batch)
    if (error) {
      log('batch_insert_failed', { batchStart: i, msg: error.message })
      return {
        error: `Falló inserción en fila ${i + 1}: ${error.message}`,
      }
    }
  }
  log('inserts_done', { total: rows.length })

  // 4. Contar titulares únicos
  const titularesSet = new Set<string>()
  for (const r of rows) {
    if (r.titular_dni) titularesSet.add(`d:${r.titular_dni}`)
    else if (r.titular_legajo) titularesSet.add(`l:${r.titular_legajo}`)
  }

  // 5. Audit
  await admin.from('audit_log').insert({
    evento: 'adherentes_importados',
    afiliado_id: auth.afiliadoId,
    user_agent: headers().get('user-agent'),
    metadata: {
      source_batch: sourceBatch,
      total: rows.length,
      modo,
      titulares: titularesSet.size,
      archivo: file.name,
    },
  })

  revalidatePath('/admin')
  revalidatePath('/admin/adherentes')

  return {
    success: {
      insertados: rows.length,
      titularesConAdherentes: titularesSet.size,
      modo,
      softErrors: parsed.softErrors,
      archivoNombre: file.name,
    },
  }
}
