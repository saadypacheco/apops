// Lista de altas/bajas con accionables: WhatsApp (sin destinatario, plantilla
// pre-cargada) y email cuando hay cuenta en la app. Server component — los
// links son <a href> a wa.me/?text=... y mailto: — no necesita JS de cliente.

import type { PersonaPadron } from '@/lib/admin/dashboard-queries'

// =====================================================================
// Plantillas de mensaje
// =====================================================================

const APP_URL = 'https://apops.vercel.app'

function firstName(nombreCompleto: string): string {
  // El padrón ANSES viene "APELLIDO, NOMBRE Y MAS". Tomamos lo después de la coma.
  const partes = nombreCompleto.split(',')
  if (partes.length >= 2) {
    return partes[1]!.trim().split(' ')[0] ?? nombreCompleto
  }
  return nombreCompleto.split(' ')[0] ?? nombreCompleto
}

function templateBienvenida(persona: PersonaPadron): string {
  const nombre = firstName(persona.nombre)
  return [
    `Hola ${nombre}, te damos la bienvenida al organismo.`,
    '',
    'Soy de APOPS, tu gremio. Si querés afiliarte y disfrutar de los beneficios, podés hacerlo online en pocos minutos:',
    `${APP_URL}/afiliarse`,
    '',
    'Cualquier consulta estoy a disposición. Un saludo.',
  ].join('\n')
}

function templateDespedida(persona: PersonaPadron): string {
  const nombre = firstName(persona.nombre)
  if (persona.cotizaPapel) {
    // Jubilación
    return [
      `Hola ${nombre}, te deseamos lo mejor en esta nueva etapa de jubilación.`,
      '',
      'APOPS te sigue acompañando como jubilado/a. Para cualquier trámite o consulta, contás con nosotros.',
      '',
      'Un fuerte abrazo.',
    ].join('\n')
  }
  return [
    `Hola ${nombre}, lamentamos tu partida del organismo.`,
    '',
    'Si necesitás algún trámite final o querés mantener contacto, escribinos.',
    '',
    'Un abrazo.',
  ].join('\n')
}

// =====================================================================
// Render
// =====================================================================

export function AltasBajasList({
  altas,
  bajas,
}: {
  altas: PersonaPadron[]
  bajas: PersonaPadron[]
}) {
  const altasApops = altas.filter((p) => p.gremios.includes('APOPS')).length
  const bajasApops = bajas.filter((p) => p.gremios.includes('APOPS')).length
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          titulo="Altas reales"
          subtitulo={`${altas.length} personas — ${altasApops} APOPS`}
          tone="positive"
        >
          {altas.length === 0 ? (
            <p className="text-sm text-brand-muted">
              Sin altas reales en este período.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {altas.map((p) => (
                <PersonaCard key={p.legajo} persona={p} tipo="alta" />
              ))}
            </ul>
          )}
        </Section>

        <Section
          titulo="Bajas reales"
          subtitulo={`${bajas.length} personas — ${bajasApops} APOPS`}
          tone="negative"
        >
          {bajas.length === 0 ? (
            <p className="text-sm text-brand-muted">
              Sin bajas en este período.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {bajas.map((p) => (
                <PersonaCard key={p.legajo} persona={p} tipo="baja" />
              ))}
            </ul>
          )}
        </Section>
      </div>
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
  tone: 'positive' | 'negative'
  children: React.ReactNode
}) {
  const headerCls =
    tone === 'positive'
      ? 'text-emerald-900 bg-emerald-50 ring-emerald-200'
      : 'text-red-900 bg-red-50 ring-red-200'
  return (
    <section className="flex flex-col gap-3">
      <header
        className={`flex items-baseline justify-between rounded-lg px-3 py-2 ring-1 ${headerCls}`}
      >
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <span className="text-xs">{subtitulo}</span>
      </header>
      {children}
    </section>
  )
}

function PersonaCard({
  persona,
  tipo,
}: {
  persona: PersonaPadron
  tipo: 'alta' | 'baja'
}) {
  const mensaje =
    tipo === 'alta' ? templateBienvenida(persona) : templateDespedida(persona)
  const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
  const mailto =
    persona.cuentaApp && tipo === 'baja'
      ? `mailto:${persona.cuentaApp.email}?subject=${encodeURIComponent(
          tipo === 'baja' ? 'Despedida de APOPS' : 'Bienvenida a APOPS',
        )}&body=${encodeURIComponent(mensaje)}`
      : null

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-brand-ink">
          {persona.nombre}
        </h4>
        <div className="flex flex-wrap gap-1 text-xs">
          {persona.gremios.length > 0 ? (
            persona.gremios.map((g) => (
              <span
                key={g}
                className={
                  g === 'APOPS'
                    ? 'rounded-full bg-brand-blue/10 px-2 py-0.5 font-semibold text-brand-blue'
                    : 'rounded-full bg-neutral-100 px-2 py-0.5 text-brand-muted'
                }
              >
                {g}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-brand-muted">
              Sin gremio
            </span>
          )}
          {persona.cotizaPapel && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
              Papel (jubilado)
            </span>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
        <Cell label="Legajo" value={persona.legajo} />
        <Cell label="DNI" value={persona.dni ?? '—'} />
        <Cell label="Edificio" value={persona.edificio ?? '—'} />
        <Cell label="Provincia" value={persona.provincia ?? '—'} />
      </dl>

      {persona.cuentaApp && tipo === 'baja' && (
        <p className="text-xs text-brand-muted">
          Tiene cuenta en la app:{' '}
          <span className="font-mono text-brand-ink">
            {persona.cuentaApp.email}
          </span>
          {persona.cuentaApp.estado !== 'activo' && (
            <span className="ml-1 italic">
              (estado actual: {persona.cuentaApp.estado})
            </span>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <WhatsAppIcon />
          {tipo === 'alta' ? 'Mensaje bienvenida' : 'Mensaje despedida'}
        </a>
        {mailto && (
          <a
            href={mailto}
            className="inline-flex items-center gap-1 rounded-md bg-brand-blue px-3 py-1 text-xs font-semibold text-white hover:bg-brand-blue/90"
          >
            <MailIcon />
            Email
          </a>
        )}
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

function MailIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-3.5 w-3.5"
    >
      <path d="M4 4h16c1 0 2 1 2 2v12c0 1-1 2-2 2H4c-1 0-2-1-2-2V6c0-1 1-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}
