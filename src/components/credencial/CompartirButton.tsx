'use client'

import { useState } from 'react'
import type { Credencial } from '@/lib/credencial/queries'

// Botón "Compartir credencial" para adherentes. Prioriza WhatsApp (decisión
// D7 del spec). Ofrece WA, email y copiar link.
//
// Los datos de contacto del adherente (telefono/email) en `padron_adherentes`
// son poco confiables — APOPS rara vez tiene cargados teléfonos de adherentes
// y, si los tiene, suelen estar desactualizados. Por eso compartir siempre
// abre el selector de contactos del afiliado (su agenda es la fuente real).

type AdherenteCred = Extract<Credencial, { tipo: 'adherente' }>

export function CompartirButton({
  cred,
  baseUrl,
}: {
  cred: AdherenteCred
  baseUrl: string
}) {
  const [copied, setCopied] = useState(false)
  const url = `${baseUrl}/credencial-publica/${cred.id}`
  const nombreCorto = cred.nombre.split(',').pop()?.trim() ?? cred.nombre

  const mensaje = `Hola ${nombreCorto}, te comparto tu credencial APOPS: ${url}`

  const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    'Tu credencial APOPS',
  )}&body=${encodeURIComponent(mensaje)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // navigator.clipboard puede fallar en contextos sin HTTPS
      window.prompt('Copiá este link:', url)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-card">
      <p className="text-sm text-brand-muted">
        Compartí la credencial de {nombreCorto} — vas a poder elegir el contacto en WhatsApp o tu mail.
      </p>
      <div className="flex flex-wrap gap-2">
        {/* WhatsApp — primario */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white shadow-card transition hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
        >
          <WhatsAppIcon />
          WhatsApp
        </a>

        <a
          href={mailtoUrl}
          className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border-2 border-brand-blue px-4 text-sm font-bold text-brand-blue transition hover:bg-brand-blue hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
        >
          <EmailIcon />
          Email
        </a>

        <button
          type="button"
          onClick={copy}
          aria-label="Copiar link"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border-2 border-brand-deep/15 px-3 text-brand-muted transition hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
        >
          {copied ? <CheckIcon /> : <LinkIcon />}
        </button>
      </div>
      {copied && (
        <p role="status" className="text-xs text-emerald-700">
          ✓ Link copiado al portapapeles
        </p>
      )}
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="h-5 w-5"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      className="h-5 w-5"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 8l9 6 9-6" strokeLinecap="round" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      className="h-5 w-5"
    >
      <path
        d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
      className="h-5 w-5 text-emerald-600"
    >
      <path d="M5 12l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
