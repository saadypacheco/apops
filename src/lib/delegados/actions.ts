'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentAfiliado } from '@/lib/auth/role'
import { getEdificiosDelDelegado } from './whatsapp'

export type WhatsappGrupoState = { error?: string; success?: string }

const WHATSAPP_LINK_RE = /^https:\/\/(chat\.whatsapp\.com|wa\.me)\/[\w-]+$/

// Guarda (o borra) el link del grupo de WhatsApp de UN edificio. El link
// es del edificio, no del delegado: si otro delegado del mismo edificio ya
// cargó uno, este lo reemplaza. Solo puede tocarlo un delegado que
// represente a ese edificio.

export async function guardarWhatsappGrupo(
  _prev: WhatsappGrupoState,
  formData: FormData,
): Promise<WhatsappGrupoState> {
  const session = await getCurrentAfiliado()
  if (!session || session.rol !== 'delegado') {
    return { error: 'No tenés permisos.' }
  }

  const edificio = (formData.get('edificio')?.toString() ?? '').trim()
  if (!edificio) return { error: 'Falta el edificio.' }

  // El delegado solo puede tocar los edificios que representa.
  const misEdificios = await getEdificiosDelDelegado(session.nombre)
  const permitido = misEdificios.some(
    (e) => e.trim().toLowerCase() === edificio.toLowerCase(),
  )
  if (!permitido) {
    return { error: 'Ese edificio no está entre los que representás.' }
  }

  const link = (formData.get('link')?.toString() ?? '').trim()
  if (link && !WHATSAPP_LINK_RE.test(link)) {
    return {
      error:
        'El link tiene que ser de WhatsApp (https://chat.whatsapp.com/... o https://wa.me/...).',
    }
  }

  const admin = createAdminClient()

  if (!link) {
    const { error } = await admin
      .from('edificios_whatsapp')
      .delete()
      .eq('edificio', edificio)
    if (error) return { error: 'No pudimos borrar el link.' }
    revalidatePath('/perfil')
    return { success: 'Link eliminado.' }
  }

  const { error } = await admin.from('edificios_whatsapp').upsert(
    {
      edificio,
      link,
      cargado_por: session.afiliadoId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'edificio' },
  )
  if (error) return { error: 'No pudimos guardar el link. Intentá de nuevo.' }

  revalidatePath('/perfil')
  revalidatePath('/feed')
  return { success: 'Link guardado para todo el edificio.' }
}
