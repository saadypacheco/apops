import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Parser y lookup del campo único "DNI o Legajo" del login v2.
// Decisión D3 (auth-v2.md): el front es un solo input; el server discrimina
// por regex. DNI = 7-8 dígitos exactos; cualquier otra cosa = legajo.

export type ParsedIdentifier =
  | { tipo: 'dni'; valor: string }
  | { tipo: 'legajo'; valor: string }

const DNI_REGEX = /^[0-9]{7,8}$/

export function parseIdentifier(input: string): ParsedIdentifier {
  const normalized = input.trim()
  if (DNI_REGEX.test(normalized)) {
    return { tipo: 'dni', valor: normalized }
  }
  // Legajo se normaliza en uppercase para que "l-1234" matchee "L-1234".
  // El padrón guarda los legajos como vienen del Excel (en general en upper),
  // así que normalizamos para robustez.
  return { tipo: 'legajo', valor: normalized.toUpperCase() }
}

export type AfiliadoRow = Database['public']['Tables']['afiliados']['Row']

// Busca un afiliado por DNI o por legajo según la forma del identifier.
// Requiere service_role (bypass RLS) porque al momento del login el usuario
// todavía no tiene sesión, y RLS de afiliados es self-only.
export async function findAfiliadoByIdentifier(
  identifier: string,
  client: SupabaseClient<Database>,
): Promise<AfiliadoRow | null> {
  const parsed = parseIdentifier(identifier)
  const column = parsed.tipo === 'dni' ? 'dni' : 'legajo'
  const { data } = await client
    .from('afiliados')
    .select('*')
    .eq(column, parsed.valor)
    .maybeSingle()
  return data
}
