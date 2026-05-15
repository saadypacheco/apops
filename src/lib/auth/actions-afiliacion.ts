'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  afiliacionSchema,
  type AfiliacionFormState,
  type AfiliacionInput,
  type Familiar,
} from '@/types/afiliacion'
import { generateAfiliacionPdf } from '@/lib/afiliacion/pdf'
import { lookupDelegadoEmailsByEdificio } from '@/lib/afiliacion/delegados-lookup'
import { sendMail } from '@/lib/email/send'

const APOPS_EMAIL = 'apops@apops.org.ar'

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

  // Envío de mail con PDF firmado: aspirante (acuse) + APOPS (gestión) +
  // delegado(s) del edificio declarado (FYI). Fire-and-forget conceptual:
  // si Resend falla o no está configurado, la solicitud igual quedó
  // guardada. Loggeamos y registramos en columnas de tracking.
  await dispatchAfiliacionEmails(inserted.id, data)

  redirect(`/afiliarse/exito?id=${inserted.id}`)
}

// ─── envío de mails post-insert ─────────────────────────────────────

async function dispatchAfiliacionEmails(
  solicitudId: string,
  data: AfiliacionInput,
): Promise<void> {
  const admin = createAdminClient()
  const ref = solicitudId.slice(0, 8).toUpperCase()

  let pdfBase64 = ''
  try {
    const pdfBytes = await generateAfiliacionPdf(data, { solicitudId })
    pdfBase64 = Buffer.from(pdfBytes).toString('base64')
  } catch (err) {
    console.error('[dispatchAfiliacionEmails] PDF generation failed', err)
    await admin
      .from('solicitudes_afiliacion')
      .update({ email_error: `pdf_gen_failed: ${asString(err)}` })
      .eq('id', solicitudId)
    return
  }

  const pdfFilename = `ficha-afiliacion-${data.numeroDocumento}.pdf`

  // Aspirante: acuse de recibo con copia del PDF
  const aspirantePromise = sendMail({
    to: data.email,
    subject: 'Recibimos tu ficha de afiliación — APOPS',
    html: htmlAspirante(data, ref),
    pdfBase64,
    pdfFilename,
    replyTo: APOPS_EMAIL,
  })

  // APOPS: solicitud completa para gestión
  const apopsPromise = sendMail({
    to: APOPS_EMAIL,
    subject: `Nueva afiliación: ${data.apellidoNombre} (${data.numeroDocumento})`,
    html: htmlApops(data, ref),
    pdfBase64,
    pdfFilename,
    replyTo: data.email,
  })

  // Delegado(s) del edificio declarado, si hay y match
  const delegadoEmails = data.edificioUdai
    ? await lookupDelegadoEmailsByEdificio(data.edificioUdai).catch(() => [])
    : []
  const delegadoPromise =
    delegadoEmails.length > 0
      ? sendMail({
          to: delegadoEmails,
          subject: `Nueva afiliación en tu edificio: ${data.apellidoNombre}`,
          html: htmlDelegado(data, ref),
          pdfBase64,
          pdfFilename,
          replyTo: APOPS_EMAIL,
        })
      : Promise.resolve(null)

  const [aspRes, apopsRes, delRes] = await Promise.all([
    aspirantePromise,
    apopsPromise,
    delegadoPromise,
  ])

  const now = new Date().toISOString()
  const errors: string[] = []
  const update: {
    email_aspirante_enviado_at?: string
    email_apops_enviado_at?: string
    email_delegado_enviado_at?: string
    email_delegado_destinos?: string[]
    email_error?: string
  } = {}
  if (aspRes && aspRes.ok) update.email_aspirante_enviado_at = now
  else if (aspRes && !aspRes.ok && !aspRes.skipped) errors.push(`aspirante: ${aspRes.error}`)
  if (apopsRes && apopsRes.ok) update.email_apops_enviado_at = now
  else if (apopsRes && !apopsRes.ok && !apopsRes.skipped) errors.push(`apops: ${apopsRes.error}`)
  if (delRes && delRes.ok) {
    update.email_delegado_enviado_at = now
    update.email_delegado_destinos = delegadoEmails
  } else if (delRes && !delRes.ok && !delRes.skipped) {
    errors.push(`delegado: ${delRes.error}`)
  }
  if (errors.length > 0) update.email_error = errors.join(' | ')

  if (Object.keys(update).length > 0) {
    await admin
      .from('solicitudes_afiliacion')
      .update(update)
      .eq('id', solicitudId)
  }
}

function asString(v: unknown): string {
  if (v instanceof Error) return v.message
  return typeof v === 'string' ? v : JSON.stringify(v).slice(0, 200)
}

// ─── plantillas HTML de mail ────────────────────────────────────────

function escapeHtml(s: string | undefined | null): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function htmlAspirante(d: AfiliacionInput, ref: string): string {
  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
      <h2 style="color: #1f72b8; margin-bottom: 8px;">¡Recibimos tu ficha, ${escapeHtml(firstName(d.apellidoNombre))}!</h2>
      <p>Tu solicitud de afiliación a <strong>APOPS Siempre</strong> quedó registrada.
        Adjunto encontrás el PDF con todos los datos que cargaste, firmado.</p>
      <p>Un administrador la va a revisar y vas a recibir un email cuando esté procesada.</p>
      <table style="border-collapse: collapse; font-size: 14px; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Referencia:</td><td><strong>${ref}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Documento:</td><td>${escapeHtml(d.tipoDocumento)} ${escapeHtml(d.numeroDocumento)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Legajo:</td><td>${escapeHtml(d.numeroLegajo)}</td></tr>
      </table>
      <p style="color: #777; font-size: 13px;">Si tenés cualquier consulta, respondé este email o escribinos a <a href="mailto:${APOPS_EMAIL}">${APOPS_EMAIL}</a>.</p>
    </div>
  `.trim()
}

function htmlApops(d: AfiliacionInput, ref: string): string {
  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; color: #222;">
      <h2 style="color: #1f72b8; margin-bottom: 8px;">Nueva solicitud de afiliación</h2>
      <p>Llegó una nueva ficha. PDF adjunto. Entrar a <a href="https://apops.vercel.app/admin">apops.vercel.app/admin</a> para procesar.</p>
      <table style="border-collapse: collapse; font-size: 14px; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Referencia:</td><td><strong>${ref}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Aspirante:</td><td>${escapeHtml(d.apellidoNombre)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Documento:</td><td>${escapeHtml(d.tipoDocumento)} ${escapeHtml(d.numeroDocumento)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Legajo:</td><td>${escapeHtml(d.numeroLegajo)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Edificio:</td><td>${escapeHtml(d.edificioUdai) || '<em>no declarado</em>'}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Email:</td><td><a href="mailto:${escapeHtml(d.email)}">${escapeHtml(d.email)}</a></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Celular:</td><td>${escapeHtml(d.celular)}</td></tr>
      </table>
    </div>
  `.trim()
}

function htmlDelegado(d: AfiliacionInput, ref: string): string {
  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; color: #222;">
      <h2 style="color: #1f72b8; margin-bottom: 8px;">Nueva afiliación en tu edificio</h2>
      <p>Una persona de tu sector envió su solicitud de afiliación a APOPS. Te mandamos copia para que estés en conocimiento. La gestión la hace la CD desde el panel admin.</p>
      <table style="border-collapse: collapse; font-size: 14px; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Aspirante:</td><td>${escapeHtml(d.apellidoNombre)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Legajo:</td><td>${escapeHtml(d.numeroLegajo)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Edificio:</td><td>${escapeHtml(d.edificioUdai)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Referencia:</td><td><strong>${ref}</strong></td></tr>
      </table>
      <p style="color: #777; font-size: 13px;">PDF de la ficha completa adjunto.</p>
    </div>
  `.trim()
}

function firstName(apellidoNombre: string): string {
  const parts = apellidoNombre.split(',')
  if (parts.length === 2) {
    const nombres = parts[1]?.trim().split(/\s+/) ?? []
    return nombres[0] ?? apellidoNombre
  }
  return apellidoNombre.split(/\s+/)[0] ?? apellidoNombre
}
