'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  afiliacionSchema,
  type AfiliacionFormState,
  type Familiar,
} from '@/types/afiliacion'

// Server Action: persiste la ficha de afiliación con anon (RLS permite
// INSERT). Después redirige a /afiliarse/exito con el id (para que la
// página de éxito muestre confirmación específica).

function parseFormData(formData: FormData) {
  // Parse familiares: cada uno como índice (familiar.0.apellidoNombre, etc.)
  const familiares: Familiar[] = []
  let i = 0
  while (formData.get(`familiar.${i}.apellidoNombre`)) {
    familiares.push({
      apellidoNombre: (formData.get(`familiar.${i}.apellidoNombre`)?.toString() ?? '').trim(),
      tipoDoc: (formData.get(`familiar.${i}.tipoDoc`)?.toString() ?? 'DNI') as Familiar['tipoDoc'],
      numeroDoc: (formData.get(`familiar.${i}.numeroDoc`)?.toString() ?? '').trim(),
      fechaNac: formData.get(`familiar.${i}.fechaNac`)?.toString() ?? '',
      parentesco: (formData.get(`familiar.${i}.parentesco`)?.toString() ?? '').trim(),
    })
    i++
  }

  const conyugeNombre = formData.get('conyuge.apellidoNombre')?.toString().trim()
  const conyuge = conyugeNombre
    ? {
        apellidoNombre: conyugeNombre,
        tipoDoc: (formData.get('conyuge.tipoDoc')?.toString() ?? 'DNI') as 'DNI',
        numeroDoc: formData.get('conyuge.numeroDoc')?.toString().trim() ?? '',
        fechaNac: formData.get('conyuge.fechaNac')?.toString() ?? '',
      }
    : undefined

  return {
    apellidoNombre: (formData.get('apellidoNombre')?.toString() ?? '').trim(),
    tipoDocumento: (formData.get('tipoDocumento')?.toString() ?? 'DNI') as 'DNI',
    numeroDocumento: (formData.get('numeroDocumento')?.toString() ?? '').trim(),
    fechaNacimiento: (formData.get('fechaNacimiento')?.toString() ?? '').trim(),
    estadoCivil: (formData.get('estadoCivil')?.toString() || undefined) as
      | 'soltero'
      | undefined,

    domicilioCalle: formData.get('domicilioCalle')?.toString() ?? '',
    domicilioNumero: formData.get('domicilioNumero')?.toString() ?? '',
    domicilioPiso: formData.get('domicilioPiso')?.toString() ?? '',
    domicilioDepto: formData.get('domicilioDepto')?.toString() ?? '',
    domicilioLocalidad: formData.get('domicilioLocalidad')?.toString() ?? '',
    domicilioProvincia: formData.get('domicilioProvincia')?.toString() ?? '',
    domicilioCp: formData.get('domicilioCp')?.toString() ?? '',

    telefono: (formData.get('telefono')?.toString() ?? '').trim(),
    celular: (formData.get('celular')?.toString() ?? '').trim(),
    email: (formData.get('email')?.toString() ?? '').trim(),
    cbu: formData.get('cbu')?.toString() ?? '',

    numeroLegajo: (formData.get('numeroLegajo')?.toString() ?? '').trim(),
    edificioUdai: formData.get('edificioUdai')?.toString() ?? '',
    trabajoLocalidad: formData.get('trabajoLocalidad')?.toString() ?? '',
    trabajoDomicilio: formData.get('trabajoDomicilio')?.toString() ?? '',
    trabajoTelefono: formData.get('trabajoTelefono')?.toString() ?? '',
    trabajoEmail: formData.get('trabajoEmail')?.toString() ?? '',
    gerencia: formData.get('gerencia')?.toString() ?? '',
    areaUdai: formData.get('areaUdai')?.toString() ?? '',
    cargoFuncion: formData.get('cargoFuncion')?.toString() ?? '',
    categoria: formData.get('categoria')?.toString() ?? '',
    tipoPlanta: (formData.get('tipoPlanta')?.toString() || undefined) as
      | 'permanente'
      | 'transitoria'
      | undefined,

    conyuge,
    familiares: familiares.length > 0 ? familiares : undefined,

    aceptaDescuento: formData.get('aceptaDescuento') === 'on',
    firmaPng: formData.get('firmaPng')?.toString() ?? '',
  }
}

export async function submitAfiliacion(
  _prev: AfiliacionFormState,
  formData: FormData,
): Promise<AfiliacionFormState> {
  const raw = parseFormData(formData)
  const parsed = afiliacionSchema.safeParse(raw)

  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    const fieldErrors: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(issues)) {
      if (Array.isArray(v) && v[0]) fieldErrors[k] = v[0]
    }
    return {
      error:
        'Faltan datos o hay errores en el formulario. Revisá los campos marcados.',
      fieldErrors,
    }
  }

  const data = parsed.data
  const h = headers()
  const fwd = h.get('x-forwarded-for')
  const ip = fwd ? (fwd.split(',')[0]?.trim() ?? null) : h.get('x-real-ip')
  const userAgent = h.get('user-agent')

  const admin = createAdminClient()
  const { data: inserted, error } = (await admin
    .from('solicitudes_afiliacion')
    .insert({
      apellido_nombre: data.apellidoNombre,
      tipo_documento: data.tipoDocumento,
      numero_documento: data.numeroDocumento,
      fecha_nacimiento: data.fechaNacimiento ?? null,
      estado_civil: data.estadoCivil,
      domicilio_calle: data.domicilioCalle ?? null,
      domicilio_numero: data.domicilioNumero ?? null,
      domicilio_piso: data.domicilioPiso ?? null,
      domicilio_depto: data.domicilioDepto ?? null,
      domicilio_localidad: data.domicilioLocalidad ?? null,
      domicilio_provincia: data.domicilioProvincia ?? null,
      domicilio_cp: data.domicilioCp ?? null,
      telefono: data.telefono ?? null,
      celular: data.celular,
      email: data.email,
      cbu: data.cbu ?? null,
      numero_legajo: data.numeroLegajo,
      edificio_udai: data.edificioUdai ?? null,
      trabajo_localidad: data.trabajoLocalidad ?? null,
      trabajo_domicilio: data.trabajoDomicilio ?? null,
      trabajo_telefono: data.trabajoTelefono ?? null,
      trabajo_email: data.trabajoEmail ?? null,
      gerencia: data.gerencia ?? null,
      area_udai: data.areaUdai ?? null,
      cargo_funcion: data.cargoFuncion ?? null,
      categoria: data.categoria ?? null,
      tipo_planta: data.tipoPlanta ?? null,
      conyuge: data.conyuge ?? null,
      familiares: data.familiares ?? null,
      acepta_descuento: data.aceptaDescuento,
      firma_png: data.firmaPng,
      ip_address: ip,
      user_agent: userAgent,
    })
    .select('id')
    .single()) as { data: { id: string } | null; error: { message: string } | null }

  if (error || !inserted) {
    console.error('[submitAfiliacion]', error?.message)
    return {
      error:
        'No pudimos guardar tu solicitud. Probá de nuevo en un momento o contactanos.',
    }
  }

  redirect(`/afiliarse/exito?id=${inserted.id}`)
}
