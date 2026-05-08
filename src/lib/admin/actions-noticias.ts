'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAfiliado } from '@/lib/auth/role'
import { noticiaFormSchema, type NoticiaFormState } from '@/types/noticias'

// Server actions para gestión de novedades desde /admin/novedades.
// Todas chequean rol admin y bypassean RLS via service_role.

async function requireAdmin(): Promise<
  { ok: true; afiliadoId: string } | { ok: false; error: string }
> {
  const session = await getCurrentAfiliado()
  if (!session || session.rol !== 'admin') {
    return { ok: false, error: 'No tenés permisos.' }
  }
  return { ok: true, afiliadoId: session.afiliadoId }
}

function parseFormBody(formData: FormData) {
  return {
    titulo: (formData.get('titulo')?.toString() ?? '').trim(),
    resumen: (formData.get('resumen')?.toString() ?? '').trim(),
    contenido: (formData.get('contenido')?.toString() ?? '').trim(),
    autor: (formData.get('autor')?.toString() ?? '').trim(),
    destacada: formData.get('destacada') === 'on',
    publicada: formData.get('publicada') === 'on',
  }
}

// =====================================================================
// crearNoticia
// =====================================================================

export async function crearNoticia(
  _prev: NoticiaFormState,
  formData: FormData,
): Promise<NoticiaFormState> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const raw = parseFormBody(formData)
  const parsed = noticiaFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        titulo: fe.titulo?.[0],
        resumen: fe.resumen?.[0],
        contenido: fe.contenido?.[0],
        autor: fe.autor?.[0],
      },
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('noticias')
    .insert({
      titulo: parsed.data.titulo,
      resumen: parsed.data.resumen,
      contenido: parsed.data.contenido || null,
      autor: parsed.data.autor || null,
      destacada: parsed.data.destacada ?? false,
      publicada: parsed.data.publicada ?? true,
      publicada_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error || !data) {
    return { error: 'No pudimos crear la noticia. Intentá de nuevo.' }
  }

  await admin.from('audit_log').insert({
    evento: 'noticia_creada',
    afiliado_id: auth.afiliadoId,
    metadata: { noticia_id: data.id, titulo: parsed.data.titulo },
  })

  revalidatePath('/admin/novedades')
  revalidatePath('/novedades')
  revalidatePath('/noticias')
  revalidatePath('/')
  redirect('/admin/novedades?creada=1')
}

// =====================================================================
// editarNoticia
// =====================================================================

export async function editarNoticia(
  _prev: NoticiaFormState,
  formData: FormData,
): Promise<NoticiaFormState> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const id = formData.get('id')?.toString() ?? ''
  if (!id) return { error: 'Noticia inválida.' }

  const raw = parseFormBody(formData)
  const parsed = noticiaFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        titulo: fe.titulo?.[0],
        resumen: fe.resumen?.[0],
        contenido: fe.contenido?.[0],
        autor: fe.autor?.[0],
      },
    }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('noticias')
    .update({
      titulo: parsed.data.titulo,
      resumen: parsed.data.resumen,
      contenido: parsed.data.contenido || null,
      autor: parsed.data.autor || null,
      destacada: parsed.data.destacada ?? false,
      publicada: parsed.data.publicada ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) {
    return { error: 'No pudimos guardar los cambios. Intentá de nuevo.' }
  }

  await admin.from('audit_log').insert({
    evento: 'noticia_editada',
    afiliado_id: auth.afiliadoId,
    metadata: { noticia_id: id, titulo: parsed.data.titulo },
  })

  revalidatePath('/admin/novedades')
  revalidatePath('/novedades')
  revalidatePath('/noticias')
  revalidatePath('/')
  redirect('/admin/novedades?editada=1')
}

// =====================================================================
// Toggles rápidos (publicada / destacada)
// =====================================================================

type ToggleResult = { error?: string; success?: string }

async function toggleFlag(
  formData: FormData,
  field: 'publicada' | 'destacada',
): Promise<ToggleResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const id = formData.get('id')?.toString() ?? ''
  if (!id) return { error: 'Noticia inválida.' }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('noticias')
    .select(`id, ${field}`)
    .eq('id', id)
    .maybeSingle()
  if (!row) return { error: 'No encontramos la noticia.' }

  const current = (row as Record<string, unknown>)[field] as boolean
  const next = !current

  const updatedAt = new Date().toISOString()
  const updateBuilder = admin.from('noticias')
  const { error } =
    field === 'publicada'
      ? await updateBuilder.update({ publicada: next, updated_at: updatedAt }).eq('id', id)
      : await updateBuilder.update({ destacada: next, updated_at: updatedAt }).eq('id', id)
  if (error) return { error: 'No pudimos actualizar.' }

  await admin.from('audit_log').insert({
    evento:
      field === 'publicada'
        ? next
          ? 'noticia_publicada'
          : 'noticia_despublicada'
        : next
          ? 'noticia_destacada'
          : 'noticia_no_destacada',
    afiliado_id: auth.afiliadoId,
    metadata: { noticia_id: id },
  })

  revalidatePath('/admin/novedades')
  revalidatePath('/novedades')
  revalidatePath('/noticias')
  revalidatePath('/')

  return {
    success:
      field === 'publicada'
        ? next
          ? 'Publicada.'
          : 'Despublicada.'
        : next
          ? 'Marcada como destacada.'
          : 'Sin destacar.',
  }
}

export async function togglePublicada(
  _prev: ToggleResult,
  formData: FormData,
): Promise<ToggleResult> {
  return toggleFlag(formData, 'publicada')
}

export async function toggleDestacada(
  _prev: ToggleResult,
  formData: FormData,
): Promise<ToggleResult> {
  return toggleFlag(formData, 'destacada')
}

// =====================================================================
// eliminarNoticia — borrado real (DELETE) desde /admin/novedades/[id]
// =====================================================================
//
// Considerar: por ahora hacemos DELETE real (no soft-delete). Si en el
// futuro se quiere recuperar noticias borradas, agregar columna deleted_at
// y filtrar en SELECT. Hoy con "despublicar" se cubre el 90% de casos
// (oculta del público pero la noticia sigue existiendo).

export async function eliminarNoticia(
  _prev: ToggleResult,
  formData: FormData,
): Promise<ToggleResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const id = formData.get('id')?.toString() ?? ''
  if (!id) return { error: 'Noticia inválida.' }

  const admin = createAdminClient()

  // Capturar título antes de borrar para audit
  const { data: noticia } = await admin
    .from('noticias')
    .select('titulo')
    .eq('id', id)
    .maybeSingle()

  const { error } = await admin.from('noticias').delete().eq('id', id)
  if (error) return { error: 'No pudimos eliminar la noticia.' }

  await admin.from('audit_log').insert({
    evento: 'noticia_eliminada',
    afiliado_id: auth.afiliadoId,
    metadata: { noticia_id: id, titulo: noticia?.titulo ?? null },
  })

  revalidatePath('/admin/novedades')
  revalidatePath('/novedades')
  revalidatePath('/noticias')
  revalidatePath('/')
  redirect('/admin/novedades?eliminada=1')
}
