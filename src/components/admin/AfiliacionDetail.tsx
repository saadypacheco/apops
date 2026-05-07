// Vista detallada de una solicitud de afiliación online. Server component,
// sin estado. Va dentro de un <details> en /admin para que el admin pueda
// expandir cada solicitud y ver los datos completos + la firma.

type ConyugeShape = {
  apellidoNombre?: string
  tipoDoc?: string
  numeroDoc?: string
  fechaNac?: string
}

type FamiliarShape = ConyugeShape & {
  parentesco?: string
}

type SolicitudAfiliacionDetailProps = {
  // Datos personales
  apellido_nombre: string
  tipo_documento: string
  numero_documento: string
  fecha_nacimiento: string
  estado_civil: string | null
  // Domicilio
  domicilio_calle: string | null
  domicilio_numero: string | null
  domicilio_piso: string | null
  domicilio_depto: string | null
  domicilio_localidad: string | null
  domicilio_provincia: string | null
  domicilio_cp: string | null
  // Contacto
  telefono: string
  celular: string
  email: string
  cbu: string | null
  // Lugar de trabajo
  numero_legajo: string
  edificio_udai: string | null
  trabajo_localidad: string | null
  trabajo_domicilio: string | null
  trabajo_telefono: string | null
  trabajo_email: string | null
  gerencia: string | null
  area_udai: string | null
  cargo_funcion: string | null
  categoria: string | null
  tipo_planta: string
  // Familia
  conyuge: ConyugeShape | null
  familiares: FamiliarShape[] | null
  // Firma
  firma_png: string
}

const ESTADO_CIVIL_LABEL: Record<string, string> = {
  soltero: 'Soltero/a',
  casado: 'Casado/a',
  conviviente: 'Conviviente',
  divorciado: 'Divorciado/a',
  viudo: 'Viudo/a',
  otro: 'Otro',
}

function formatBirth(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  let edad = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) edad--
  const fecha = d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `${fecha} (${edad} años)`
}

function formatDomicilio(s: SolicitudAfiliacionDetailProps): string {
  const parts: string[] = []
  if (s.domicilio_calle) {
    let linea = s.domicilio_calle
    if (s.domicilio_numero) linea += ` ${s.domicilio_numero}`
    if (s.domicilio_piso) linea += `, piso ${s.domicilio_piso}`
    if (s.domicilio_depto) linea += `, depto ${s.domicilio_depto}`
    parts.push(linea)
  }
  const localidad = [s.domicilio_localidad, s.domicilio_provincia, s.domicilio_cp]
    .filter(Boolean)
    .join(', ')
  if (localidad) parts.push(localidad)
  return parts.join(' · ') || '—'
}

export function AfiliacionDetail(s: SolicitudAfiliacionDetailProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-neutral-200 pt-4">
      <Section title="Datos personales">
        <Field label="Documento" value={`${s.tipo_documento} ${s.numero_documento}`} />
        <Field label="Fecha de nacimiento" value={formatBirth(s.fecha_nacimiento)} />
        {s.estado_civil && (
          <Field label="Estado civil" value={ESTADO_CIVIL_LABEL[s.estado_civil] ?? s.estado_civil} />
        )}
      </Section>

      <Section title="Domicilio">
        <Field label="Dirección" value={formatDomicilio(s)} colSpan />
      </Section>

      <Section title="Contacto">
        <Field label="Teléfono" value={s.telefono} />
        <Field label="Celular" value={s.celular} />
        <Field label="Email" value={s.email} colSpan />
        {s.cbu && <Field label="CBU" value={s.cbu} colSpan mono />}
      </Section>

      <Section title="Lugar de trabajo">
        <Field label="Legajo" value={s.numero_legajo} />
        <Field label="Tipo de planta" value={s.tipo_planta === 'permanente' ? 'Permanente' : 'Transitoria'} />
        {s.gerencia && <Field label="Gerencia" value={s.gerencia} />}
        {s.area_udai && <Field label="Área / UDAI" value={s.area_udai} />}
        {s.edificio_udai && <Field label="Edificio" value={s.edificio_udai} />}
        {s.cargo_funcion && <Field label="Cargo / Función" value={s.cargo_funcion} />}
        {s.categoria && <Field label="Categoría" value={s.categoria} />}
        {s.trabajo_localidad && <Field label="Localidad" value={s.trabajo_localidad} />}
        {s.trabajo_domicilio && <Field label="Domicilio" value={s.trabajo_domicilio} colSpan />}
        {s.trabajo_telefono && <Field label="Tel. trabajo" value={s.trabajo_telefono} />}
        {s.trabajo_email && <Field label="Email trabajo" value={s.trabajo_email} />}
      </Section>

      {(s.conyuge || (s.familiares && s.familiares.length > 0)) && (
        <Section title="Grupo familiar">
          {s.conyuge && s.conyuge.apellidoNombre && (
            <div className="col-span-2 rounded-lg bg-neutral-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Cónyuge
              </p>
              <p className="text-sm text-brand-ink">{s.conyuge.apellidoNombre}</p>
              <p className="text-xs text-brand-muted">
                {s.conyuge.tipoDoc} {s.conyuge.numeroDoc}
                {s.conyuge.fechaNac ? ` · Nac. ${s.conyuge.fechaNac}` : ''}
              </p>
            </div>
          )}
          {s.familiares?.map((f, i) => (
            <div key={i} className="col-span-2 rounded-lg bg-neutral-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                {f.parentesco ?? 'Familiar'}
              </p>
              <p className="text-sm text-brand-ink">{f.apellidoNombre ?? '—'}</p>
              <p className="text-xs text-brand-muted">
                {f.tipoDoc} {f.numeroDoc}
                {f.fechaNac ? ` · Nac. ${f.fechaNac}` : ''}
              </p>
            </div>
          ))}
        </Section>
      )}

      <Section title="Firma">
        <div className="col-span-2 rounded-lg bg-neutral-50 p-2">
          <img
            src={s.firma_png}
            alt={`Firma de ${s.apellido_nombre}`}
            className="mx-auto max-h-32 w-auto"
          />
        </div>
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
        {title}
      </h4>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">{children}</dl>
    </div>
  )
}

function Field({
  label,
  value,
  colSpan,
  mono,
}: {
  label: string
  value: string
  colSpan?: boolean
  mono?: boolean
}) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <dt className="text-xs text-brand-muted">{label}</dt>
      <dd className={'text-brand-ink ' + (mono ? 'font-mono text-xs' : '')}>
        {value}
      </dd>
    </div>
  )
}
