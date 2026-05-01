// Helper compartido entre Edge Functions para registrar eventos en audit_log.
// Runtime: Deno (Supabase Edge Functions).
//
// Uso desde una Edge Function:
//   import { logAuditEvent } from '../_shared/audit.ts'
//   await logAuditEvent({ evento: 'padron_validation_attempt', dni_intentado: '30000001', ip_address: '1.2.3.4' })
//
// La inserción usa service_role (bypassea RLS de audit_log). Si la
// inserción falla, se loguea el error pero NO se propaga: la auditoría
// es defensa en profundidad y no debe romper el flujo principal.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

// Eventos válidos según CHECK constraint de audit_log (migración 0012).
export type AuditEvento =
  | 'padron_validation_attempt'
  | 'padron_validation_success'
  | 'padron_validation_failure'
  | 'padron_validation_no_afiliacion'
  | 'magic_link_sent'
  | 'authentication_success'
  | 'authentication_failure'
  | 'logout'
  | 'pendiente_created'
  | 'pendiente_approved'
  | 'pendiente_rejected'
  | 'rate_limit_exceeded'

export interface AuditEventInput {
  evento: AuditEvento
  dni_intentado?: string | null
  afiliado_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown> | null
}

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  const supabase = getAdminClient()
  const { error } = await supabase.from('audit_log').insert({
    evento: input.evento,
    dni_intentado: input.dni_intentado ?? null,
    afiliado_id: input.afiliado_id ?? null,
    ip_address: input.ip_address ?? null,
    user_agent: input.user_agent ?? null,
    metadata: input.metadata ?? null,
  })

  if (error) {
    console.error('[audit] failed to insert audit_log row', {
      evento: input.evento,
      error: error.message,
    })
  }
}
