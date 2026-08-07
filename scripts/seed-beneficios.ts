// Carga el catálogo de beneficios vigentes del gremio, replicando lo
// publicado en https://apops.org.ar/beneficios.
//
// Usage: npx tsx scripts/seed-beneficios.ts
//
// Idempotente: hace upsert por título, así que re-correrlo actualiza los
// textos en vez de duplicar. Los beneficios que el admin haya creado a
// mano desde el panel no se tocan.

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv(file: string): boolean {
  const p = resolve(process.cwd(), file)
  if (!existsSync(p)) return false
  for (const line of readFileSync(p, 'utf-8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (!(k in process.env)) process.env[k] = v
  }
  return true
}

if (!loadEnv('.env.cloud')) loadEnv('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const db = createClient(url, key)

const SITIO = 'https://apops.org.ar/beneficios/'

const beneficios = [
  {
    titulo: 'Subsidio por matrimonio',
    resumen:
      'Los afiliados y afiliadas pueden acceder a un subsidio de hasta $400.000 por matrimonio.',
    categoria: 'subsidio',
    icono: '💍',
    destaque: '$400.000',
    link_externo: SITIO,
    orden: 10,
  },
  {
    titulo: 'Subsidio por nacimiento',
    resumen:
      'Para acompañar la llegada de un hijo/a, APOPS otorga un subsidio de $400.000 para cubrir los primeros gastos.',
    categoria: 'subsidio',
    icono: '👶',
    destaque: '$400.000',
    link_externo: SITIO,
    orden: 20,
  },
  {
    titulo: 'Bodas de plata',
    resumen:
      'Un reconocimiento para quienes cumplen 25 años de matrimonio. Merecen un premio.',
    categoria: 'subsidio',
    icono: '🥂',
    link_externo: SITIO,
    orden: 30,
  },
  {
    titulo: 'Óptica',
    resumen:
      'Cada afiliado y su grupo familiar primario puede acceder a un par de lentes recetados sin costo.',
    categoria: 'salud',
    icono: '👓',
    destaque: 'Sin costo',
    link_externo: SITIO,
    orden: 40,
  },
  {
    // Primer beneficio de la app: es el de uso más cotidiano.
    titulo: 'Cobertura en farmacias',
    resumen:
      'Los afiliados/as y su grupo familiar primario cuentan con 35% de cobertura en medicamentos en farmacias adheridas al convenio en todo el país.',
    categoria: 'salud',
    icono: '💊',
    destaque: '35% de cobertura',
    link_externo: 'https://apops.org.ar/mapa-de-farmacias-adheridas/',
    orden: 1,
  },
  {
    titulo: 'Orientación psicológica',
    resumen:
      'Orientación y acompañamiento psicológico, con escucha profesional y contención para situaciones personales o laborales.',
    categoria: 'salud',
    icono: '🧠',
    link_externo: SITIO,
    orden: 60,
  },
  {
    titulo: '50% off en Sport Club',
    resumen:
      '50% de descuento en Sport Club y cientos de beneficios en comercios, a través del convenio con APOPS.',
    categoria: 'recreacion',
    icono: '🏋️',
    destaque: '50% OFF',
    link_externo: SITIO,
    orden: 70,
  },
  {
    titulo: 'Turismo — hoteles con tarifas promocionales',
    resumen:
      'Vacaciones accesibles gracias a tarifas promocionales en hoteles de Mar del Plata, Salta, Federación y más destinos.',
    categoria: 'recreacion',
    icono: '🏖️',
    link_externo: 'https://apops.org.ar/turismo/',
    orden: 80,
  },
  {
    titulo: 'Mochila escolar para hijos/as de afiliados',
    resumen:
      'Cada temporada escolar APOPS acompaña a las familias con una mochila completa con artículos escolares.',
    categoria: 'educacion',
    icono: '🎒',
    link_externo: SITIO,
    orden: 90,
  },
  {
    titulo: 'Asesoramiento legal',
    resumen:
      'Asesoramiento legal especializado en temas laborales, previsionales y gremiales para afiliados y afiliadas.',
    categoria: 'legal',
    icono: '⚖️',
    link_externo: SITIO,
    orden: 100,
  },
  {
    titulo: 'Capacitaciones',
    resumen:
      'Estamos preparando el calendario de cursos y formación para afiliados. Muy pronto vas a poder inscribirte desde acá.',
    categoria: 'capacitacion',
    icono: '🎓',
    proximamente: true,
    orden: 110,
  },
] as const

// Títulos que cambiaron después de la carga inicial. El upsert matchea
// por título, así que sin esto un renombre crearía un duplicado en vez de
// actualizar la fila existente.
const RENOMBRES: Array<{ de: string; a: string }> = [
  { de: 'Mapa de farmacias adheridas', a: 'Cobertura en farmacias' },
]

async function main() {
  console.log(`📋 Beneficios a cargar: ${beneficios.length}`)

  for (const r of RENOMBRES) {
    const { data: viejo } = await db
      .from('beneficios')
      .select('id')
      .eq('titulo', r.de)
      .maybeSingle()
    if (!viejo) continue

    const { data: nuevo } = await db
      .from('beneficios')
      .select('id')
      .eq('titulo', r.a)
      .maybeSingle()

    if (nuevo) {
      // Ya existe con el nombre nuevo: el viejo sobra.
      await db.from('beneficios').delete().eq('id', viejo.id)
      console.log(`♻️  "${r.de}" eliminado (duplicaba a "${r.a}")`)
    } else {
      await db.from('beneficios').update({ titulo: r.a }).eq('id', viejo.id)
      console.log(`♻️  "${r.de}" → "${r.a}"`)
    }
  }

  let creados = 0
  let actualizados = 0

  for (const b of beneficios) {
    const { data: existente } = await db
      .from('beneficios')
      .select('id')
      .eq('titulo', b.titulo)
      .maybeSingle()

    const fila = {
      titulo: b.titulo,
      resumen: b.resumen,
      categoria: b.categoria,
      icono: b.icono,
      destaque: 'destaque' in b ? b.destaque : null,
      link_externo: 'link_externo' in b ? b.link_externo : null,
      proximamente: 'proximamente' in b ? b.proximamente : false,
      orden: b.orden,
      publicado: true,
      updated_at: new Date().toISOString(),
    }

    if (existente) {
      const { error } = await db
        .from('beneficios')
        .update(fila)
        .eq('id', existente.id)
      if (error) throw error
      actualizados++
    } else {
      const { error } = await db.from('beneficios').insert(fila)
      if (error) throw error
      creados++
    }
  }

  console.log(`✓ ${creados} creados, ${actualizados} actualizados`)

  const { count } = await db
    .from('beneficios')
    .select('id', { count: 'exact', head: true })
  console.log(`📊 Total en BD: ${count}`)
}

main().catch((e) => {
  console.error('💥', e)
  process.exit(1)
})
