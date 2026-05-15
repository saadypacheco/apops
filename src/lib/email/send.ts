// Wrapper minimal de Resend (REST API). No usamos el SDK oficial para
// evitar una dependencia más — el endpoint es simple y estable.
//
// Fail gracefully: si RESEND_API_KEY no está configurado, las llamadas
// devuelven { ok: false, skipped: true } sin throw. El caller decide si
// loguear y seguir adelante o cortar.
//
// Setup:
//   1. Crear cuenta en https://resend.com
//   2. Verificar dominio apops.org.ar en DNS (TXT + DKIM)
//   3. Generar API key
//   4. Env vars en Vercel:
//      - RESEND_API_KEY=re_xxx
//      - EMAIL_FROM=APOPS Siempre <noreply@apops.org.ar>
//   Mientras el dominio no esté verificado, Resend solo envía a la
//   dirección owner de la cuenta (modo sandbox).

export type SendArgs = {
  to: string | string[]
  subject: string
  html: string
  /** Adjunto PDF en base64 (sin el prefijo data: URI). Opcional. */
  pdfBase64?: string
  /** Nombre del archivo cuando hay attachment. */
  pdfFilename?: string
  /** Reply-to opcional. */
  replyTo?: string
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean }

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function getConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) return null
  return { apiKey, from }
}

export async function sendMail(args: SendArgs): Promise<SendResult> {
  const cfg = getConfig()
  if (!cfg) {
    return { ok: false, error: 'no_resend_config', skipped: true }
  }

  const body: Record<string, unknown> = {
    from: cfg.from,
    to: Array.isArray(args.to) ? args.to : [args.to],
    subject: args.subject,
    html: args.html,
  }
  if (args.replyTo) body['reply_to'] = args.replyTo
  if (args.pdfBase64 && args.pdfFilename) {
    body['attachments'] = [
      {
        filename: args.pdfFilename,
        content: args.pdfBase64,
      },
    ]
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `resend_${res.status}: ${text.slice(0, 200)}` }
    }
    const json = (await res.json()) as { id?: string }
    return { ok: true, id: json.id ?? '' }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown_send_error',
    }
  }
}
