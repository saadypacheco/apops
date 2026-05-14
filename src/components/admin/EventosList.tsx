// Lista de eventos del mes (cumpleaños + aniversarios de ingreso) con
// botones para mandar saludo por WhatsApp con plantilla pre-cargada.
// Server component — sin JS de cliente.

import type { EventoMes } from '@/lib/admin/dashboard-queries'

function firstName(nombreCompleto: string): string {
  const partes = nombreCompleto.split(',')
  if (partes.length >= 2) {
    return partes[1]!.trim().split(' ')[0] ?? nombreCompleto
  }
  return nombreCompleto.split(' ')[0] ?? nombreCompleto
}

function templateCumple(persona: EventoMes): string {
  const nombre = firstName(persona.nombre)
  const ediId = persona.anos
    ? `${nombre}, ¡feliz cumpleaños! Te deseamos un gran día. Un abrazo de APOPS.`
    : `${nombre}, ¡feliz cumpleaños! Un abrazo de APOPS.`
  return ediId
}

function templateAniversario(persona: EventoMes): string {
  const nombre = firstName(persona.nombre)
  if (persona.anos) {
    return [
      `¡Felicitaciones ${nombre}!`,
      '',
      `Cumplís ${persona.anos} año${persona.anos === 1 ? '' : 's'} en el organismo. Gracias por estos años de servicio.`,
      '',
      'Un abrazo de APOPS.',
    ].join('\n')
  }
  return `¡Felicitaciones ${nombre} por tu aniversario en el organismo! Un abrazo de APOPS.`
}

export function EventosList({
  mesLabel,
  cumpleanos,
  aniversarios,
}: {
  mesLabel: string
  cumpleanos: EventoMes[]
  aniversarios: EventoMes[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Section
        titulo={`Cumpleaños de ${mesLabel}`}
        subtitulo={`${cumpleanos.length} personas`}
        tone="primary"
      >
        {cumpleanos.length === 0 ? (
          <p className="text-sm text-brand-muted">
            Ningún cumpleaños APOPS este mes según el padrón.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cumpleanos.map((p) => (
              <EventoCard
                key={`c-${p.legajo}`}
                evento={p}
                template={templateCumple(p)}
                label="Cumpleaños"
                action="Saludar cumple"
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        titulo={`Aniversarios de ingreso (${mesLabel})`}
        subtitulo={`${aniversarios.length} personas`}
        tone="success"
      >
        {aniversarios.length === 0 ? (
          <p className="text-sm text-brand-muted">
            Ningún aniversario APOPS este mes según el padrón.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {aniversarios.map((p) => (
              <EventoCard
                key={`a-${p.legajo}`}
                evento={p}
                template={templateAniversario(p)}
                label="Aniversario"
                action="Felicitar"
              />
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function Section({
  titulo,
  subtitulo,
  tone,
  children,
}: {
  titulo: string
  subtitulo: string
  tone: 'primary' | 'success'
  children: React.ReactNode
}) {
  const headerCls =
    tone === 'primary'
      ? 'text-brand-blue bg-brand-blue/10 ring-brand-blue/20'
      : 'text-emerald-900 bg-emerald-50 ring-emerald-200'
  return (
    <section className="flex flex-col gap-3">
      <header
        className={`flex items-baseline justify-between rounded-lg px-3 py-2 ring-1 ${headerCls}`}
      >
        <h3 className="text-sm font-semibold capitalize">{titulo}</h3>
        <span className="text-xs">{subtitulo}</span>
      </header>
      {children}
    </section>
  )
}

function EventoCard({
  evento,
  template,
  label,
  action,
}: {
  evento: EventoMes
  template: string
  label: string
  action: string
}) {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(template)}`
  return (
    <li className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-brand-ink">
          Día {evento.dia} · {evento.nombre}
        </h4>
        {evento.anos !== null && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            {evento.anos} {evento.anos === 1 ? 'año' : 'años'}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
        <Cell label="Legajo" value={evento.legajo} />
        <Cell label="DNI" value={evento.dni ?? '—'} />
        <Cell label="Edificio" value={evento.edificio ?? '—'} />
      </dl>

      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
          title={`Plantilla de ${label.toLowerCase()}`}
        >
          <WhatsAppIcon />
          {action}
        </a>
      </div>
    </li>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] uppercase tracking-wide text-brand-muted">
        {label}
      </dt>
      <dd className="text-brand-ink">{value}</dd>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5"
    >
      <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.5-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5-.1-.1-.6-1.5-.9-2-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2 0 1.3 1 2.6 1.1 2.8.1.2 1.9 3 4.7 4.1.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.5-.3zm-5.5 7.6c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.3 0-5.5 4.4-9.9 9.9-9.9 2.6 0 5.2 1 7 2.9 1.9 1.9 2.9 4.4 2.9 7 0 5.4-4.5 9.9-10 9.9z" />
    </svg>
  )
}
