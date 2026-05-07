import { createAdminClient } from '@/lib/supabase/admin'
import type { AfiliadoSession } from '@/lib/auth/role'

// Tipo unificado para las credenciales que se muestran en el carrusel.
// Una para el titular (datos de afiliados+padron) y una por cada adherente.
export type Credencial =
  | {
      tipo: 'titular'
      id: string
      nombre: string
      dni: string
      legajo: string | null
      numero_afiliado: string | null
      categoria: 'activo' | 'jubilado'
    }
  | {
      tipo: 'adherente'
      id: string
      nombre: string
      dni: string | null
      vinculo: string
      numero_afiliado: string | null
      email: string | null
      telefono: string | null
    }

// Devuelve [credencial del titular, ...credenciales de adherentes].
// El titular siempre va primero, los adherentes en orden de vínculo
// (cónyuge → hijos → padres → otros).
export async function getCredencialesParaTitular(
  afiliado: AfiliadoSession,
): Promise<Credencial[]> {
  const admin = createAdminClient()

  // Adherentes vinculados por DNI o por legajo del titular
  const filters: string[] = [`titular_dni.eq.${afiliado.dni}`]
  if (afiliado.legajo) {
    filters.push(`titular_legajo.eq.${afiliado.legajo}`)
  }

  const { data: adherentesRaw } = await admin
    .from('padron_adherentes')
    .select(
      'id, nombre, dni, vinculo, numero_afiliado, email, telefono',
    )
    .or(filters.join(','))

  const adherentes = adherentesRaw ?? []

  // Orden de aparición: cónyuge primero, después hijos/hijas, padres, otros
  const ordenVinculo: Record<string, number> = {
    conyuge: 0,
    hijo: 1,
    hija: 1,
    padre: 2,
    madre: 2,
    hermano: 3,
    hermana: 3,
    otro: 4,
  }
  adherentes.sort(
    (a, b) =>
      (ordenVinculo[a.vinculo] ?? 99) - (ordenVinculo[b.vinculo] ?? 99),
  )

  // Número de afiliado del titular: por ahora reusamos su legajo (no tenemos
  // columna dedicada). En iteración futura puede salir de afiliados.numero_afiliado.
  const titular: Credencial = {
    tipo: 'titular',
    id: afiliado.afiliadoId,
    nombre: afiliado.nombre,
    dni: afiliado.dni,
    legajo: afiliado.legajo,
    numero_afiliado: afiliado.legajo,
    categoria: afiliado.tipo,
  }

  return [
    titular,
    ...adherentes.map(
      (a): Credencial => ({
        tipo: 'adherente',
        id: a.id,
        nombre: a.nombre,
        dni: a.dni,
        vinculo: a.vinculo,
        numero_afiliado: a.numero_afiliado,
        email: a.email,
        telefono: a.telefono,
      }),
    ),
  ]
}

// Lookup público (sin auth) de la credencial de un adherente por su id.
// Usado por /credencial-publica/[id]. NO expone datos del titular más allá
// del nombre del vínculo.
export async function getCredencialAdherentePublica(
  adherenteId: string,
): Promise<{
  nombre: string
  dni: string | null
  vinculo: string
  numero_afiliado: string | null
} | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('padron_adherentes')
    .select('nombre, dni, vinculo, numero_afiliado')
    .eq('id', adherenteId)
    .maybeSingle()
  return data
}
