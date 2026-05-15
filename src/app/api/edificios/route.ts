import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Lista única de edificios del padrón actual, ordenados alfabéticamente.
// Usado por el combo en el formulario público de afiliación para que el
// aspirante elija su lugar de trabajo de un listado real, no escriba
// texto libre que después no matchea con padrón.
//
// Endpoint público (la página /afiliarse es anon). Read-only. Sin
// parámetros sensibles. No requiere autenticación.

// Cache en build: 1 hora. El padrón se carga mensualmente; un cache
// agresivo está OK y reduce carga sobre Supabase. Vercel sirve la
// respuesta cacheada hasta que se regenere.
export const revalidate = 3600

type Row = {
  lugar_trabajo_padron: string | null
  lugar_trabajo_rrhh: string | null
}

export async function GET() {
  const admin = createAdminClient()

  const { data, error } = (await admin
    .from('padron_cotizantes_actual')
    .select('lugar_trabajo_padron, lugar_trabajo_rrhh')) as {
    data: Row[] | null
    error: { message: string } | null
  }

  if (error) {
    return NextResponse.json(
      { edificios: [], error: error.message },
      { status: 500 },
    )
  }

  const set = new Set<string>()
  for (const r of data ?? []) {
    const v = (r.lugar_trabajo_padron ?? r.lugar_trabajo_rrhh ?? '').trim()
    if (v) set.add(v)
  }
  const edificios = Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))

  return NextResponse.json({ edificios })
}
