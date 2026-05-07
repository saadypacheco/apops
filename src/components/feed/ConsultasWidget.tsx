// Widget de contacto rápido a APOPS. WhatsApp prioritario (decisión D7
// del spec de credencial — mismo patrón). Sin form, todo deep-links.

const WHATSAPP_NUMBER = '5491155448300'
const TEL = '+5491155448300'
const EMAIL = 'apops@apops.org.ar'

function firstName(nombre: string): string {
  const parts = nombre.split(',')
  if (parts.length === 2) {
    const nombres = parts[1]?.trim().split(/\s+/) ?? []
    return nombres[0] ?? nombre
  }
  return nombre.split(/\s+/)[0] ?? nombre
}

export function ConsultasWidget({ nombre }: { nombre: string }) {
  const saludo = `Hola APOPS, soy ${firstName(nombre)}, quisiera hacerles una consulta:`
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(saludo)}`
  const mailtoUrl = `mailto:${EMAIL}?subject=${encodeURIComponent('Consulta de afiliado')}&body=${encodeURIComponent(saludo)}`

  return (
    <section
      aria-label="Consultas a APOPS"
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card"
    >
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4M12 18h.01" strokeLinecap="round" />
          </svg>
        </span>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-brand-ink">
            ¿Necesitás ayuda?
          </h2>
          <p className="text-sm text-brand-muted">
            Contactanos por el canal que prefieras.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white shadow-card transition hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
        >
          <WhatsAppIcon />
          WhatsApp
        </a>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={mailtoUrl}
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border-2 border-brand-blue px-3 text-sm font-bold text-brand-blue transition hover:bg-brand-blue hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
          >
            <EmailIcon />
            Email
          </a>
          <a
            href={`tel:${TEL}`}
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border-2 border-brand-blue px-3 text-sm font-bold text-brand-blue transition hover:bg-brand-blue hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
          >
            <PhoneIcon />
            Llamar
          </a>
        </div>
      </div>
    </section>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="h-5 w-5">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 8l9 6 9-6" strokeLinecap="round" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="h-5 w-5">
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72a2 2 0 011.72 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
