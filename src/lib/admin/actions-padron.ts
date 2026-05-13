'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAfiliado } from '@/lib/auth/role'
import { parseXlsxPadron } from '@/lib/admin/padron-parser'
import type {
  PadronRow,
  SoftError,
  SubirPadronState,
  SubirPadronTotals,
} from '@/types/padron'

// Server action de carga del padrón ANSES (.xlsx).
//
// Flujo:
//   1. Verificar rol admin.
//   2. Tomar el archivo del FormData.
//   3. Parsear (parser puro en padron-parser.ts).
//   4. Si el período ya existe y force !== 'true' → needsConfirmation.
//   5. Si force=true y existe → DELETE snapshot existente (cascade limpia rows).
//   6. INSERT padron_snapshots con totales en 0.
//   7. INSERT padron_cotizantes en batches de 500.
//   8. Re-link afiliados (auto-baja por desaparición).
//   9. UPDATE totales del snapshot.
//   10. audit_log + revalidate paths.

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

function extractIp(): string | null {
  const h = headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return h.get('x-real-ip')
}

// Deduplica filas por legajo dentro del mismo snapshot (constraint
// UNIQUE(legajo, snapshot_id) rechazaría la segunda al insertar). Conserva
// la primera ocurrencia y acumula un soft error.
function dedupByLegajo(
  rows: PadronRow[],
): { unique: PadronRow[]; soft: SoftError[] } {
  const seen = new Set<string>()
  const unique: PadronRow[] = []
  const soft: SoftError[] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r) continue
    if (seen.has(r.legajo)) {
      soft.push({
        row: i + 3,
        column: 'Legajo',
        message: `Legajo ${r.legajo} duplicado en el archivo. Conservamos la primera ocurrencia.`,
      })
      continue
    }
    seen.add(r.legajo)
    unique.push(r)
  }
  return { unique, soft }
}

function calcTotals(
  rows: PadronRow[],
): Omit<SubirPadronTotals, 'filas'> & { filas: number } {
  return {
    filas: rows.length,
    apops: rows.filter((r) => r.afiliado_apops).length,
    ate: rows.filter((r) => r.afiliado_ate).length,
    upcn: rows.filter((r) => r.afiliado_upcn).length,
    secasfpi: rows.filter((r) => r.afiliado_secasfpi).length,
    papel: rows.filter((r) => r.cotiza_papel).length,
    delegados: rows.filter((r) => !!r.fecha_actualizacion_delegados).length,
    plantaPerm: rows.filter((r) => r.tipo_planta === 'PP').length,
    plantaTrans: rows.filter((r) => r.tipo_planta === 'PT').length,
  }
}

// =====================================================================
// subirPadron — entry point
// =====================================================================

export async function subirPadron(
  _prev: SubirPadronState,
  formData: FormData,
): Promise<SubirPadronState> {
  const traceId = Math.random().toString(36).slice(2, 8)
  const log = (step: string, data: Record<string, unknown> = {}) =>
    console.log(`[PADRON_IMPORT ${traceId}] ${step}`, data)

  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const file = formData.get('archivo')
  if (!file || !(file instanceof File)) {
    return { error: 'Adjuntá un archivo .xlsx.' }
  }
  const force = formData.get('force') === 'true'
  log('inicio', { archivo: file.name, size: file.size, force })

  // 1. Parse
  const buffer = new Uint8Array(await file.arrayBuffer())
  const parsed = parseXlsxPadron(buffer)
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
  const { periodo, rows: rawRows, softErrors: parseSoft } = parsed

  // 2. Dedup
  const { unique: rows, soft: dedupSoft } = dedupByLegajo(rawRows)
  const allSoft = [...parseSoft, ...dedupSoft]
  log('parsed', {
    periodo: periodo.label,
    filasRaw: rawRows.length,
    filasUnique: rows.length,
    softCount: allSoft.length,
  })

  const admin = createAdminClient()

  // 3. ¿Ya existe snapshot para ese período?
  const { data: existing } = await admin
    .from('padron_snapshots')
    .select('id, importado_at, total_filas')
    .eq('periodo_year', periodo.year)
    .eq('periodo_month', periodo.month)
    .maybeSingle()

  if (existing && !force) {
    log('needs_confirmation', { existingId: existing.id })
    return {
      needsConfirmation: {
        periodo,
        snapshotExistente: {
          id: existing.id,
          importado_at: existing.importado_at,
          total_filas: existing.total_filas,
        },
      },
      softErrors: allSoft,
    }
  }

  if (existing && force) {
    log('deleting_existing', { id: existing.id })
    const del = await admin
      .from('padron_snapshots')
      .delete()
      .eq('id', existing.id)
    if (del.error) {
      return { error: `No pudimos borrar el snapshot existente: ${del.error.message}` }
    }
  }

  // 4. Crear nuevo snapshot (totales en 0; los actualizamos al final)
  const insertSnapshot = await admin
    .from('padron_snapshots')
    .insert({
      periodo_label: periodo.label,
      periodo_year: periodo.year,
      periodo_month: periodo.month,
      archivo_nombre: file.name,
      importado_por: auth.afiliadoId,
      total_filas: 0,
    })
    .select('id')
    .single()
  if (insertSnapshot.error || !insertSnapshot.data) {
    log('snapshot_insert_failed', { msg: insertSnapshot.error?.message })
    return { error: 'No pudimos crear el snapshot.' }
  }
  const snapshotId = insertSnapshot.data.id
  log('snapshot_creado', { snapshotId })

  // 5. INSERT padron_cotizantes en batches. Si algún batch falla, borramos
  //    el snapshot completo (ON DELETE CASCADE limpia las filas ya insertadas).
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
      padron_snapshot_id: snapshotId,
      dni: r.dni,
      legajo: r.legajo,
      nombre: r.nombre,
      cuil: r.cuil,
      fecha_ingreso: r.fecha_ingreso,
      fecha_nacimiento: r.fecha_nacimiento,
      fecha_actualizacion_delegados: r.fecha_actualizacion_delegados,
      categoria: r.categoria,
      tipo_planta: r.tipo_planta,
      lugar_trabajo_padron: r.lugar_trabajo_padron,
      lugar_trabajo_relevamiento: r.lugar_trabajo_relevamiento,
      lugar_trabajo_rrhh: r.lugar_trabajo_rrhh,
      afiliado_apops: r.afiliado_apops,
      afiliado_ate: r.afiliado_ate,
      afiliado_sec: r.afiliado_sec,
      afiliado_upcn: r.afiliado_upcn,
      afiliado_secasfpi: r.afiliado_secasfpi,
      cotiza_papel: r.cotiza_papel,
      sexo: r.sexo,
      provincia: r.provincia,
      regional: r.regional,
      representante: r.representante,
      periodo_mandato: r.periodo_mandato,
      vence_mandato_30dias: r.vence_mandato_30dias,
      source_batch: snapshotId, // legacy NOT NULL column del schema viejo
    }))
    const ins = await admin.from('padron_cotizantes').insert(batch)
    if (ins.error) {
      log('batch_insert_failed', {
        batchStart: i,
        size: batch.length,
        msg: ins.error.message,
      })
      await admin.from('padron_snapshots').delete().eq('id', snapshotId)
      return {
        error: `Falló la inserción en la fila ${i + 1}: ${ins.error.message}`,
      }
    }
  }
  log('inserts_done', { total: rows.length })

  // 6. Re-link afiliados + auto-baja
  //
  //    Reglas (acordadas con el cliente):
  //    - Afiliados con estado='activo' Y padron_id != NULL (estaban en padrón anterior):
  //        - si su DNI aparece en el nuevo snapshot → actualizar padron_id
  //          (y si la fila del Excel tiene fecha_baja, propagar a afiliados)
  //        - si su DNI NO aparece → AUTO-BAJA (fecha_baja=now, estado='baja', padron_id=null)
  //    - Afiliados con estado='activo' Y padron_id == NULL (vinieron por solicitud,
  //      no por padrón):
  //        - si su DNI ahora aparece en el padrón → linkearlos al row nuevo
  //        - si no → no-op (nunca estuvieron en padrón, no se dan de baja)
  //    - estado='baja' o 'bloqueado' → no se tocan.

  const { data: activeAfiliados } = await admin
    .from('afiliados')
    .select('id, dni, legajo, padron_id')
    .eq('estado', 'activo')

  let bajasAutomaticas = 0
  let afiliadosSinMatch = 0

  if (activeAfiliados && activeAfiliados.length > 0) {
    // Dos lookups del snapshot nuevo: por DNI (cuando lo tiene) y por legajo.
    // El re-link intenta DNI primero (afiliados.dni es NOT NULL y único) y
    // cae a legajo si el padrón nuevo no tiene DNI para esa persona.
    type SnapshotEntry = {
      newPadronId: string
      fechaBajaExcel: string | null
    }
    const byDni = new Map<string, SnapshotEntry>()
    const byLegajo = new Map<string, SnapshotEntry>()

    const { data: newRows } = await admin
      .from('padron_cotizantes')
      .select('id, dni, legajo')
      .eq('padron_snapshot_id', snapshotId)
    if (newRows) {
      const fechaBajaByLegajo = new Map<string, string | null>()
      rows.forEach((r) => fechaBajaByLegajo.set(r.legajo, r.fecha_baja_excel))
      newRows.forEach((nr) => {
        const entry: SnapshotEntry = {
          newPadronId: nr.id,
          fechaBajaExcel: nr.legajo
            ? fechaBajaByLegajo.get(nr.legajo) ?? null
            : null,
        }
        if (nr.dni) byDni.set(nr.dni, entry)
        if (nr.legajo) byLegajo.set(nr.legajo, entry)
      })
    }

    const ahora = new Date().toISOString()
    for (const af of activeAfiliados) {
      const match =
        byDni.get(af.dni) ?? (af.legajo ? byLegajo.get(af.legajo) : undefined)
      if (match) {
        // Apareció en el nuevo padrón → re-link.
        const update: {
          padron_id: string
          fecha_baja?: string
          estado?: 'baja'
        } = {
          padron_id: match.newPadronId,
        }
        if (match.fechaBajaExcel) {
          // El Excel marca baja explícita para esta persona.
          update.fecha_baja = match.fechaBajaExcel
          update.estado = 'baja'
          bajasAutomaticas++
        }
        await admin.from('afiliados').update(update).eq('id', af.id)
      } else if (af.padron_id) {
        // Estaba en el padrón anterior y desapareció → AUTO-BAJA.
        await admin
          .from('afiliados')
          .update({
            fecha_baja: ahora,
            estado: 'baja',
            padron_id: null,
          })
          .eq('id', af.id)
        bajasAutomaticas++
      } else {
        // Nunca tuvo padron_id, sigue sin matchear → contabilizar.
        afiliadosSinMatch++
      }
    }
  }
  log('relink_done', { bajasAutomaticas, afiliadosSinMatch })

  // 7. Update totales del snapshot
  const totals = calcTotals(rows)
  await admin
    .from('padron_snapshots')
    .update({
      total_filas: totals.filas,
      total_apops: totals.apops,
      total_ate: totals.ate,
      total_upcn: totals.upcn,
      total_secasfpi: totals.secasfpi,
      total_planta_perm: totals.plantaPerm,
      total_planta_trans: totals.plantaTrans,
      total_papel: totals.papel,
      total_delegados: totals.delegados,
    })
    .eq('id', snapshotId)

  // 8. Audit
  await admin.from('audit_log').insert({
    evento: 'padron_importado',
    afiliado_id: auth.afiliadoId,
    ip_address: extractIp(),
    user_agent: headers().get('user-agent'),
    metadata: {
      snapshot_id: snapshotId,
      periodo_label: periodo.label,
      total_filas: totals.filas,
      archivo: file.name,
      force,
      bajas_automaticas: bajasAutomaticas,
    },
  })
  log('audit_logged')

  // Las páginas de admin (padrón + dashboard) ven datos nuevos.
  revalidatePath('/admin')
  revalidatePath('/admin/padron')
  revalidatePath('/admin/dashboard')

  return {
    success: {
      snapshotId,
      periodo,
      totals,
      bajasAutomaticas,
      afiliadosSinMatch,
      softErrors: allSoft,
    },
  }
}
