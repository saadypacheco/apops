'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAfiliado } from '@/lib/auth/role'

// Server actions del catálogo de beneficios (/admin/beneficios).
// Mismo patrón que actions-noticias: chequeo de rol admin + admin client
// (service_role) para bypassear RLS.

export type BeneficioFormState = {
  error?: string
  fieldErrors?: {
    titulo?: string
    resumen?: string
    detalle?: string
    link_externo?: string
  }
}

const beneficioSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres.')
    .max(120, 'El título no puede superar los 120 caracteres.'),
  resumen: z
    .string()
    .trim()
    .min(10, 'El resumen debe tener al menos 10 caracteres.')
    .max(400, 'El resumen no puede superar los 400 caracteres.'),
  detalle: z
    .string()
    .trim()
    .max(5000, 'El detalle es demasiado largo.')
    .optional()
    .or(z.literal('')),
  categoria: z.enum([
    'subsidio',
    'salud',
    'recreacion',
    'educacion',
    'legal',
    'capacitacion',
    'otro',
  ]),
  icono: z.string().trim().max(8).optional().or(z.literal('')),
  destaque: z.string().trim().max(30).optional().or(z.literal('')),
  link_externo: z
    .string()
    .trim()
    .url('El link tiene que ser una URL válida (https://…).')
    .optional()
    .or(z.literal('')),
  orden: z.coerce.number().int().min(0).max(9999),
  publicado: z.coerce.boolean().optional(),
  proximamente: z.coerce.boolean().optional(),
})

async function requireAdmin(): Promise<
  { ok: true; afiliadoId: string } | { ok: false; error: string }
> {
  const session = await getCurrentAfiliado()
  if (!session || session.rol !== 'admin') {
    return { ok: false, error: 'No tenés permisos.' }
  }
  return { ok: true, afiliadoId: session.afiliadoId }
}

function parseBody(formData: FormData) {
  return {
    titulo: (formData.get('titulo')?.toString() ?? '').trim(),
    resumen: (formData.get('resumen')?.toString() ?? '').trim(),
    detalle: (formData.get('detalle')?.toString() ?? '').trim(),
    categoria: (formData.get('categoria')?.toString() ?? 'otro').trim(),
    icono: (formData.get('icono')?.toString() ?? '').trim(),
    destaque: (formData.get('destaque')?.toString() ?? '').trim(),
    link_externo: (formData.get('link_externo')?.toString() ?? '').trim(),
    orden: formData.get('orden')?.toString() ?? '0',
    publicado: formData.get('publicado') === 'on',
    proximamente: formData.get('proximamente') === 'on',
  }
}

function toRow(data: z.infer<typeof beneficioSchema>) {
  return {
    titulo: data.titulo,
    resumen: data.resumen,
    detalle: data.detalle || null,
    categoria: data.categoria,
    icono: data.icono || null,
    destaque: data.destaque || null,
    link_externo: data.link_externo || null,
    orden: data.orden,
    publicado: data.publicado ?? true,
    proximamente: data.proximamente ?? false,
    updated_at: new Date().toISOString(),
  }
}

function fieldErrors(err: z.ZodError): BeneficioFormState {
  const fe = err.flatten().fieldErrors
  return {
    fieldErrors: {
      titulo: fe.titulo?.[0],
      resumen: fe.resumen?.[0],
      detalle: fe.detalle?.[0],
      link_externo: fe.link_externo?.[0],
    },
  }
}

export async function crearBeneficio(
  _prev: BeneficioFormState,
  formData: FormData,
): Promise<BeneficioFormState> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const parsed = beneficioSchema.safeParse(parseBody(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('beneficios')
    .insert(toRow(parsed.data))
    .select('id')
    .single()
  if (error || !data) {
    return { error: 'No pudimos crear el beneficio. Intentá de nuevo.' }
  }

  await admin.from('audit_log').insert({
    evento: 'beneficio_creado',
    afiliado_id: auth.afiliadoId,
    metadata: { beneficio_id: data.id, titulo: parsed.data.titulo },
  })

  revalidatePath('/admin/beneficios')
  revalidatePath('/beneficios')
  revalidatePath('/feed')
  redirect('/admin/beneficios?creado=1')
}

export async function editarBeneficio(
  _prev: BeneficioFormState,
  formData: FormData,
): Promise<BeneficioFormState> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const id = formData.get('id')?.toString() ?? ''
  if (!id) return { error: 'Beneficio inválido.' }

  const parsed = beneficioSchema.safeParse(parseBody(formData))
  if (!parsed.success) return fieldErrors(parsed.error)

  const admin = createAdminClient()
  const { error } = await admin
    .from('beneficios')
    .update(toRow(parsed.data))
    .eq('id', id)
  if (error) {
    return { error: 'No pudimos guardar los cambios. Intentá de nuevo.' }
  }

  await admin.from('audit_log').insert({
    evento: 'beneficio_editado',
    afiliado_id: auth.afiliadoId,
    metadata: { beneficio_id: id, titulo: parsed.data.titulo },
  })

  revalidatePath('/admin/beneficios')
  revalidatePath('/beneficios')
  revalidatePath('/feed')
  redirect('/admin/beneficios?editado=1')
}

type ToggleResult = { error?: string; success?: string }

export async function togglePublicadoBeneficio(
  _prev: ToggleResult,
  formData: FormData,
): Promise<ToggleResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const id = formData.get('id')?.toString() ?? ''
  if (!id) return { error: 'Beneficio inválido.' }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('beneficios')
    .select('publicado')
    .eq('id', id)
    .maybeSingle()
  if (!row) return { error: 'No encontramos el beneficio.' }

  const next = !(row as { publicado: boolean }).publicado
  const { error } = await admin
    .from('beneficios')
    .update({ publicado: next, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: 'No pudimos actualizar.' }

  revalidatePath('/admin/beneficios')
  revalidatePath('/beneficios')
  revalidatePath('/feed')
  return { success: next ? 'Publicado.' : 'Despublicado.' }
}

export async function eliminarBeneficio(
  _prev: ToggleResult,
  formData: FormData,
): Promise<ToggleResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const id = formData.get('id')?.toString() ?? ''
  if (!id) return { error: 'Beneficio inválido.' }

  const admin = createAdminClient()
  const { data: b } = await admin
    .from('beneficios')
    .select('titulo')
    .eq('id', id)
    .maybeSingle()

  const { error } = await admin.from('beneficios').delete().eq('id', id)
  if (error) return { error: 'No pudimos eliminar el beneficio.' }

  await admin.from('audit_log').insert({
    evento: 'beneficio_eliminado',
    afiliado_id: auth.afiliadoId,
    metadata: { beneficio_id: id, titulo: b?.titulo ?? null },
  })

  revalidatePath('/admin/beneficios')
  revalidatePath('/beneficios')
  revalidatePath('/feed')
  redirect('/admin/beneficios?eliminado=1')
}
