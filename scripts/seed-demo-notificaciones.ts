// Seed de notificaciones demo realistas para la presentación al cliente.
//
// Crea ~10 hilos entre las cuentas demo (siempreapops, delegado.norte,
// delegado.sur) que muestran el circuito completo de comunicación:
//
//   CD → delegados (informativo, para que retransmitan)
//   delegados → afiliado (acción individual)
//   delegados → CD (consultas, escalación)
//
// Mezcla leídos / no leídos para que el tab Uso del dashboard tenga
// números reales con tasas distintas a 0% / 100%.
//
// Idempotente: primero borra hilos previos del seed (por combinación
// autor+destinatario+asunto), después recrea.
//
// Usage: npx tsx scripts/seed-demo-notificaciones.ts

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv(file: string) {
  const p = resolve(process.cwd(), file)
  if (!existsSync(p)) return
  const raw = readFileSync(p, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    process.env[k] = v
  }
}
loadEnv('.env.cloud')

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

const EMAILS = {
  cd: 'siempreapops@apops.org.ar',
  delegadoNorte: 'delegado.norte@apops.org.ar',
  delegadoSur: 'delegado.sur@apops.org.ar',
} as const

type ActorId = string

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

type SeedItem = {
  autor: ActorId
  destinatario: ActorId
  asunto: string
  mensaje: string
  /** Días atrás cuando se creó */
  hace: number
  /** ¿El destinatario lo leyó? */
  leido: boolean
  /** Si hay respuesta del destinatario al autor */
  respuesta?: string
}

async function getActorIds(): Promise<{
  cd: string
  norte: string
  sur: string
}> {
  type Row = { id: string; email: string }
  const { data } = (await admin
    .from('afiliados')
    .select('id, email')
    .in('email', [EMAILS.cd, EMAILS.delegadoNorte, EMAILS.delegadoSur])) as {
    data: Row[] | null
  }
  const byEmail = new Map<string, string>()
  for (const r of data ?? []) byEmail.set(r.email, r.id)
  const cd = byEmail.get(EMAILS.cd)
  const norte = byEmail.get(EMAILS.delegadoNorte)
  const sur = byEmail.get(EMAILS.delegadoSur)
  if (!cd || !norte || !sur) {
    throw new Error(
      `No encontré las 3 cuentas demo. cd=${!!cd} norte=${!!norte} sur=${!!sur}`,
    )
  }
  return { cd, norte, sur }
}

function buildSeeds(ids: { cd: string; norte: string; sur: string }): SeedItem[] {
  const { cd, norte, sur } = ids
  return [
    // ─── CD → delegados (informativo para retransmitir) ───────────────
    {
      autor: cd,
      destinatario: norte,
      asunto: '🥽 Anteojos disponibles para retirar',
      mensaje:
        'Hola Lucía, te aviso que llegaron los anteojos de los compañeros de tu edificio. Pueden retirarlos en Viamonte 1654 de lunes a viernes de 9 a 17 hs. Por favor avisales y coordinamos por si necesitan turno. Gracias.',
      hace: 2,
      leido: true,
    },
    {
      autor: cd,
      destinatario: sur,
      asunto: '🌴 Trámite vacaciones — cierre 30/05',
      mensaje:
        'Hola Roberto, recordatorio: el plazo para presentar la solicitud de vacaciones en complejos turísticos del gremio cierra el viernes 30/05. Por favor pasale el aviso a tu sector — los formularios están en la sede y también podemos mandárselos por mail.',
      hace: 1,
      leido: false,
    },
    {
      autor: cd,
      destinatario: norte,
      asunto: '📅 Asamblea general — 25/05 18hs',
      mensaje:
        'Lucía, convocamos asamblea general para el viernes 25/05 a las 18hs en la sede del gremio. Orden del día: paritaria, balance del cuatrimestre, situación de jubilados. Por favor difundilo a tus representados.',
      hace: 5,
      leido: true,
    },
    {
      autor: cd,
      destinatario: sur,
      asunto: '📅 Asamblea general — 25/05 18hs',
      mensaje:
        'Roberto, convocamos asamblea general para el viernes 25/05 a las 18hs en la sede del gremio. Orden del día: paritaria, balance del cuatrimestre, situación de jubilados. Por favor difundilo a tus representados.',
      hace: 5,
      leido: true,
    },
    {
      autor: cd,
      destinatario: norte,
      asunto: '💰 Paritaria — nueva propuesta',
      mensaje:
        'Lucía, hoy la comisión negociadora presentó la nueva propuesta paritaria. Te resumo: incremento del 12% en dos tramos (julio y septiembre), bono por presentismo y revisión en noviembre. Necesitamos que pases este detalle a tu sector y nos juntes opiniones antes del miércoles para la próxima reunión.',
      hace: 0,
      leido: false,
    },

    // ─── Delegados → afiliado (acción individual, siempreapops como
    //    receptor cuando hace role-switch a afiliado) ───────────────────
    {
      autor: norte,
      destinatario: cd,
      asunto: '🥽 Tus anteojos ya llegaron',
      mensaje:
        'Hola, te aviso que tus anteojos llegaron a la sede. Podés pasar a buscarlos por Viamonte 1654 de lunes a viernes 9-17hs. Llevá tu DNI. Cualquier duda escribime.',
      hace: 1,
      leido: false,
    },
    {
      autor: sur,
      destinatario: cd,
      asunto: '🌴 Vacaciones confirmadas para enero',
      mensaje:
        'Hola, te aviso que tu solicitud de vacaciones en el complejo de Mar del Plata quedó confirmada para la semana del 15 al 22 de enero. Te llegará por mail el comprobante con los detalles. Felicitaciones.',
      hace: 3,
      leido: true,
      respuesta:
        '¡Genial, muchas gracias Roberto! Cualquier cosa te aviso si necesito algún ajuste. Saludos.',
    },
    {
      autor: norte,
      destinatario: cd,
      asunto: '🏨 Reserva turismo aprobada',
      mensaje:
        'Tu reserva en el complejo de Embalse, Córdoba, fue aprobada para la semana del 1 al 8 de febrero. La administración te va a enviar el voucher por mail en los próximos días. Saludos.',
      hace: 0,
      leido: false,
    },

    // ─── Delegados → CD (consultas / escalación) ──────────────────────
    {
      autor: norte,
      destinatario: cd,
      asunto: 'Consulta — situación en UDAI Once',
      mensaje:
        'Necesito coordinar una reunión con ustedes. Tenemos un problema con un compañero que está siendo presionado para renunciar y queremos ver cómo intervenir. ¿Cuándo podemos juntarnos?',
      hace: 2,
      leido: true,
      respuesta:
        'Recibido Lucía, vamos a coordinar una reunión esta semana. Te confirmo día y horario por la tarde. Mientras tanto, ¿podés mandar los detalles del caso por escrito?',
    },
    {
      autor: sur,
      destinatario: cd,
      asunto: 'Antigüedad de cotizante — consulta',
      mensaje:
        'Hola, un compañero del edificio me pregunta si la antigüedad anterior a su pase a planta permanente cuenta para el cómputo jubilatorio. ¿Me pueden orientar o derivar a quien corresponda?',
      hace: 0,
      leido: false,
    },
  ]
}

async function deleteIfExists(item: SeedItem): Promise<void> {
  await admin
    .from('hilos_notificacion')
    .delete()
    .eq('autor_id', item.autor)
    .eq('destinatario_id', item.destinatario)
    .eq('asunto', item.asunto)
}

async function insertHilo(item: SeedItem): Promise<void> {
  const createdAt = daysAgo(item.hace)
  // Si hay respuesta, ultimo_mensaje_at es más reciente que created_at
  const ultimoAt = item.respuesta
    ? daysAgo(Math.max(0, item.hace - 1))
    : createdAt

  const { data: hilo, error: hiloErr } = await admin
    .from('hilos_notificacion')
    .insert({
      autor_id: item.autor,
      destinatario_id: item.destinatario,
      asunto: item.asunto,
      leido_destinatario: item.leido,
      // Si destinatario respondió, autor tiene algo nuevo que ver
      leido_autor: !item.respuesta,
      created_at: createdAt,
      ultimo_mensaje_at: ultimoAt,
    })
    .select('id')
    .single()

  if (hiloErr || !hilo) {
    throw new Error(`Insert hilo "${item.asunto}": ${hiloErr?.message}`)
  }

  // Mensaje inicial del autor
  const { error: msg1Err } = await admin.from('mensajes_notificacion').insert({
    hilo_id: hilo.id,
    autor_id: item.autor,
    mensaje: item.mensaje,
    created_at: createdAt,
  })
  if (msg1Err) {
    throw new Error(`Insert mensaje inicial: ${msg1Err.message}`)
  }

  // Respuesta opcional del destinatario
  if (item.respuesta) {
    await admin.from('mensajes_notificacion').insert({
      hilo_id: hilo.id,
      autor_id: item.destinatario,
      mensaje: item.respuesta,
      created_at: ultimoAt,
    })
  }
}

async function bumpLastLogin(ids: { cd: string; norte: string; sur: string }) {
  // Sin esto los delegados quedan como "Nunca entraron" en el tab Uso
  // del dashboard CD aunque tengan hilos activos. Realista: simulamos que
  // entraron recientemente.
  await admin
    .from('afiliados')
    .update({ last_login_at: daysAgo(0) })
    .eq('id', ids.cd)
  await admin
    .from('afiliados')
    .update({ last_login_at: daysAgo(2) })
    .eq('id', ids.norte)
  await admin
    .from('afiliados')
    .update({ last_login_at: daysAgo(5) })
    .eq('id', ids.sur)
  console.log('✓ last_login_at actualizado para las 3 cuentas demo\n')
}

async function main() {
  console.log(`Cloud: ${URL}\n`)

  const ids = await getActorIds()
  console.log('Actores identificados:')
  console.log(`  CD (siempreapops):    ${ids.cd.slice(0, 8)}...`)
  console.log(`  Delegado Norte:        ${ids.norte.slice(0, 8)}...`)
  console.log(`  Delegado Sur:          ${ids.sur.slice(0, 8)}...\n`)

  await bumpLastLogin(ids)

  const seeds = buildSeeds(ids)
  console.log(`Insertando ${seeds.length} hilos demo...\n`)

  let inserted = 0
  for (const item of seeds) {
    try {
      await deleteIfExists(item)
      await insertHilo(item)
      const direccion =
        item.autor === ids.cd
          ? 'CD →'
          : item.autor === ids.norte
            ? 'Norte →'
            : 'Sur →'
      const dest =
        item.destinatario === ids.cd
          ? 'CD'
          : item.destinatario === ids.norte
            ? 'Norte'
            : 'Sur'
      const flags = [
        item.leido ? '✓leído' : '○no-leído',
        item.respuesta ? '↩respondido' : '',
      ]
        .filter(Boolean)
        .join(' ')
      console.log(`  ${direccion} ${dest.padEnd(6)} ${flags.padEnd(20)} ${item.asunto}`)
      inserted++
    } catch (err) {
      console.error(`  ❌ ${item.asunto}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\n✓ ${inserted} hilos insertados.`)
  console.log(`\nTip: entrá como siempreapops, hacé role-switch a delegado/afiliado`)
  console.log(`para ver los hilos desde cada perspectiva.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
