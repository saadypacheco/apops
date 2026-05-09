import { createAdminClient } from '@/lib/supabase/admin'
import type { AfiliadoSession, Rol } from '@/lib/auth/role'
import type {
  DestinatarioCandidato,
  HiloResumen,
} from '@/types/notificaciones'

// Queries de lectura para el sistema de notificaciones. Todas usan admin
// client (service_role) — la lógica de "qué puede ver cada uno" se hace
// en código TypeScript, no en RLS.

// =====================================================================
// Destinatarios disponibles para que un autor X envíe notificación
// según su rol:
//   - admin → todos los afiliados/delegados/admins
//   - delegado → admins + afiliados que él representa (cruce por nombre
//     en padron_cotizantes.representante)
//   - afiliado → todos los delegados + todos los admins
// =====================================================================
export async function getDestinatariosDisponibles(
  session: AfiliadoSession,
): Promise<DestinatarioCandidato[]> {
  const admin = createAdminClient()

  // Trae a todos los afiliados con datos mínimos
  const { data: todos } = await admin
    .from('afiliados')
    .select('id, nombre, dni, legajo, rol, tipo')
    .eq('estado', 'activo')
    .neq('id', session.afiliadoId) // no auto-envío

  const filas = (todos ?? []) as Array<{
    id: string
    nombre: string
    dni: string
    legajo: string | null
    rol: string
    tipo: string
  }>

  // admin ve a todos
  if (session.rol === 'admin') {
    return filas.map(toDestinatario)
  }

  // afiliado ve a admins + SU delegado (el que figura como `representante`
  // en su fila de padron_cotizantes). Si no tiene representante asignado,
  // solo ve a admins.
  if (session.rol === 'afiliado') {
    const { data: miPadron } = await admin
      .from('padron_cotizantes')
      .select('representante')
      .or(`dni.eq.${session.dni}${session.legajo ? `,legajo.eq.${session.legajo}` : ''}`)
      .maybeSingle()
    const miRepresentanteNombre = (miPadron as { representante: string | null } | null)
      ?.representante?.trim().toLowerCase() ?? null

    return filas
      .filter((f) => {
        if (f.rol === 'admin') return true
        if (f.rol === 'delegado' && miRepresentanteNombre) {
          return f.nombre.trim().toLowerCase() === miRepresentanteNombre
        }
        return false
      })
      .map(toDestinatario)
  }

  // delegado ve admins + sus cotizantes
  // Para los cotizantes representados, cruzamos por nombre normalizado
  // contra padron_cotizantes.representante.
  if (session.rol === 'delegado') {
    const adminsYDelegados = filas.filter(
      (f) => f.rol === 'admin' || f.rol === 'delegado',
    )
    // Sus cotizantes (afiliados con rol=afiliado cuyo padrón los tiene
    // como representados por este delegado)
    const target = session.nombre.trim().toLowerCase()
    const { data: padronRepresentados } = await admin
      .from('padron_cotizantes')
      .select('dni, legajo, representante')
      .not('representante', 'is', null)
    const dnisRepresentados = new Set(
      (padronRepresentados ?? [])
        .filter(
          (p) =>
            p.representante &&
            p.representante.trim().toLowerCase() === target,
        )
        .map((p) => p.dni),
    )
    const afiliadosRepresentados = filas.filter(
      (f) => f.rol === 'afiliado' && dnisRepresentados.has(f.dni),
    )
    const todos = [...adminsYDelegados, ...afiliadosRepresentados]
    // Sin duplicados por id
    const seen = new Set<string>()
    return todos
      .filter((f) => {
        if (seen.has(f.id)) return false
        seen.add(f.id)
        return true
      })
      .map(toDestinatario)
  }

  return []
}

function toDestinatario(f: {
  id: string
  nombre: string
  dni: string
  legajo: string | null
  rol: string
  tipo: string
}): DestinatarioCandidato {
  return {
    afiliadoId: f.id,
    nombre: f.nombre,
    dni: f.dni,
    legajo: f.legajo,
    rol: (f.rol as Rol) ?? 'afiliado',
    tipo: (f.tipo as 'activo' | 'jubilado') ?? 'activo',
  }
}

// =====================================================================
// Validación: ¿este autor puede enviarle al destinatario X?
// Usado por server action enviarNotificacion para filtrar antes de crear hilos.
// =====================================================================
export async function puedeEnviarA(
  session: AfiliadoSession,
  destinatarioId: string,
): Promise<boolean> {
  if (destinatarioId === session.afiliadoId) return false
  if (session.rol === 'admin') return true

  const candidatos = await getDestinatariosDisponibles(session)
  return candidatos.some((c) => c.afiliadoId === destinatarioId)
}

// =====================================================================
// Hilos donde el usuario participa (sea autor o destinatario), ordenados
// por último mensaje. Pensado para la página /notificaciones.
// =====================================================================
export async function getHilosDelUsuario(
  afiliadoId: string,
): Promise<HiloResumen[]> {
  const admin = createAdminClient()

  type HiloRow = {
    id: string
    autor_id: string
    destinatario_id: string
    asunto: string
    ultimo_mensaje_at: string
    leido_destinatario: boolean
    leido_autor: boolean
  }

  const { data: hilos } = await admin
    .from('hilos_notificacion')
    .select(
      'id, autor_id, destinatario_id, asunto, ultimo_mensaje_at, leido_destinatario, leido_autor',
    )
    .or(`autor_id.eq.${afiliadoId},destinatario_id.eq.${afiliadoId}`)
    .order('ultimo_mensaje_at', { ascending: false })
    .limit(100)

  const filas = (hilos ?? []) as HiloRow[]
  if (filas.length === 0) return []

  // Lookup batch de las contrapartes (la otra persona del hilo)
  const contraparteIds = Array.from(
    new Set(
      filas.map((h) =>
        h.autor_id === afiliadoId ? h.destinatario_id : h.autor_id,
      ),
    ),
  )
  const { data: personas } = await admin
    .from('afiliados')
    .select('id, nombre, rol')
    .in('id', contraparteIds)
  const personaById = new Map(
    ((personas ?? []) as Array<{ id: string; nombre: string; rol: string }>).map(
      (p) => [p.id, p],
    ),
  )

  // Lookup batch del último mensaje de cada hilo (preview)
  const hiloIds = filas.map((h) => h.id)
  type MensajeRow = { hilo_id: string; mensaje: string; created_at: string }
  const { data: mensajesUltimos } = await admin
    .from('mensajes_notificacion')
    .select('hilo_id, mensaje, created_at')
    .in('hilo_id', hiloIds)
    .order('created_at', { ascending: false })

  const previewByHilo = new Map<string, string>()
  for (const m of (mensajesUltimos ?? []) as MensajeRow[]) {
    if (!previewByHilo.has(m.hilo_id)) {
      // Trim a 100 chars
      const preview =
        m.mensaje.length > 100 ? m.mensaje.slice(0, 100) + '…' : m.mensaje
      previewByHilo.set(m.hilo_id, preview)
    }
  }

  return filas.map((h) => {
    const yoSoyAutor = h.autor_id === afiliadoId
    const contraparteId = yoSoyAutor ? h.destinatario_id : h.autor_id
    const contraparte = personaById.get(contraparteId)
    const leidoPorMi = yoSoyAutor ? h.leido_autor : h.leido_destinatario
    return {
      id: h.id,
      asunto: h.asunto,
      ultimoMensajeAt: h.ultimo_mensaje_at,
      yoSoyAutor,
      contraparteNombre: contraparte?.nombre ?? 'Usuario eliminado',
      contraparteRol: (contraparte?.rol as Rol) ?? 'afiliado',
      leidoPorMi,
      ultimoMensajePreview: previewByHilo.get(h.id) ?? '',
    }
  })
}

// =====================================================================
// Vista de un hilo específico con todos sus mensajes. Valida que el
// usuario actual sea autor o destinatario.
// =====================================================================
export async function getHiloConMensajes(
  hiloId: string,
  afiliadoId: string,
): Promise<{
  hilo: {
    id: string
    asunto: string
    autorId: string
    destinatarioId: string
    yoSoyAutor: boolean
    contraparteNombre: string
    contraparteRol: Rol
  }
  mensajes: Array<{
    id: string
    autorId: string
    autorEsYo: boolean
    autorNombre: string
    mensaje: string
    createdAt: string
  }>
} | null> {
  const admin = createAdminClient()

  const { data: hilo } = await admin
    .from('hilos_notificacion')
    .select('id, autor_id, destinatario_id, asunto')
    .eq('id', hiloId)
    .maybeSingle()
  if (!hilo) return null

  // Validar que el usuario es parte del hilo
  if (hilo.autor_id !== afiliadoId && hilo.destinatario_id !== afiliadoId) {
    return null
  }

  const yoSoyAutor = hilo.autor_id === afiliadoId
  const contraparteId = yoSoyAutor ? hilo.destinatario_id : hilo.autor_id

  // Datos de las 2 personas del hilo (yo + contraparte)
  const { data: personas } = await admin
    .from('afiliados')
    .select('id, nombre, rol')
    .in('id', [hilo.autor_id, hilo.destinatario_id])
  const personaById = new Map(
    ((personas ?? []) as Array<{ id: string; nombre: string; rol: string }>).map(
      (p) => [p.id, p],
    ),
  )

  // Mensajes del hilo
  const { data: mensajesData } = await admin
    .from('mensajes_notificacion')
    .select('id, autor_id, mensaje, created_at')
    .eq('hilo_id', hiloId)
    .order('created_at', { ascending: true })

  const mensajes = (
    (mensajesData ?? []) as Array<{
      id: string
      autor_id: string
      mensaje: string
      created_at: string
    }>
  ).map((m) => ({
    id: m.id,
    autorId: m.autor_id,
    autorEsYo: m.autor_id === afiliadoId,
    autorNombre: personaById.get(m.autor_id)?.nombre ?? '?',
    mensaje: m.mensaje,
    createdAt: m.created_at,
  }))

  const contraparte = personaById.get(contraparteId)
  return {
    hilo: {
      id: hilo.id,
      asunto: hilo.asunto,
      autorId: hilo.autor_id,
      destinatarioId: hilo.destinatario_id,
      yoSoyAutor,
      contraparteNombre: contraparte?.nombre ?? '?',
      contraparteRol: (contraparte?.rol as Rol) ?? 'afiliado',
    },
    mensajes,
  }
}

// =====================================================================
// Contador de hilos no leídos por el usuario (para el badge de la campana)
// =====================================================================
export async function contarNoLeidos(afiliadoId: string): Promise<number> {
  const admin = createAdminClient()
  // Usuario tiene un hilo "no leído" si:
  //   - es autor y leido_autor=false (alguien le respondió)
  //   - es destinatario y leido_destinatario=false (le mandaron algo nuevo)
  const { count: c1 } = await admin
    .from('hilos_notificacion')
    .select('id', { count: 'exact', head: true })
    .eq('autor_id', afiliadoId)
    .eq('leido_autor', false)

  const { count: c2 } = await admin
    .from('hilos_notificacion')
    .select('id', { count: 'exact', head: true })
    .eq('destinatario_id', afiliadoId)
    .eq('leido_destinatario', false)

  return (c1 ?? 0) + (c2 ?? 0)
}
