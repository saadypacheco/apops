'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { submitAfiliacion } from '@/lib/auth/actions-afiliacion'
import type { AfiliacionFormState } from '@/types/afiliacion'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { StepIndicator } from './StepIndicator'
import { SignaturePad } from './SignaturePad'
import { EdificioCombo } from './EdificioCombo'

const initial: AfiliacionFormState = {}

const STEP_LABELS: [string, string, string] = [
  'Tus datos',
  'Más datos',
  'Confirmar',
]

// Único listado de obligatorios: lo mínimo para procesar la solicitud.
// El admin completa el resto matcheando contra padrón ANSES.
const REQUIRED_STEP_1 = [
  'apellidoNombre',
  'numeroDocumento',
  'numeroLegajo',
  'celular',
  'email',
]

const FIELD_LABELS: Record<string, string> = {
  apellidoNombre: 'Apellido y Nombre',
  tipoDocumento: 'Tipo de documento',
  numeroDocumento: 'DNI',
  fechaNacimiento: 'Fecha de nacimiento',
  estadoCivil: 'Estado civil',
  telefono: 'Teléfono',
  celular: 'Celular',
  email: 'Correo electrónico',
  cbu: 'CBU',
  numeroLegajo: 'Legajo',
  edificioUdai: 'Edificio / UDAI',
  areaUdai: 'Área',
  gerencia: 'Gerencia',
  cargoFuncion: 'Cargo o función',
  categoria: 'Categoría',
  tipoPlanta: 'Tipo de planta',
  domicilioCalle: 'Calle',
  domicilioNumero: 'Número',
  domicilioLocalidad: 'Localidad',
  domicilioProvincia: 'Provincia',
  domicilioCp: 'Código postal',
  aceptaDescuento: 'Autorización de descuento',
  firmaPng: 'Firma',
}

// Mapeo campo → paso al que pertenece. Usado para auto-saltar al paso con
// el primer error cuando el server devuelve fieldErrors.
function stepOfField(name: string): 1 | 2 | 3 {
  if (REQUIRED_STEP_1.includes(name)) return 1
  if (name === 'aceptaDescuento' || name === 'firmaPng') return 3
  return 2
}

type Step = 1 | 2 | 3
type FieldErrors = Record<string, string | undefined>

export function AfiliacionForm() {
  const [state, action] = useFormState(submitAfiliacion, initial)
  const [step, setStep] = useState<Step>(1)
  const [stepError, setStepError] = useState<string | null>(null)
  const [familiares, setFamiliares] = useState<number[]>([])
  const [resumen, setResumen] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLFormElement>(null)
  const errors = (state.fieldErrors ?? {}) as FieldErrors

  // Si el server devuelve errores (post-submit), saltar al primer paso
  // con problemas para que el usuario vea los campos marcados.
  useEffect(() => {
    const keys = Object.keys(errors).filter((k) => errors[k])
    if (keys.length === 0) return
    const firstStep = keys
      .map((k) => stepOfField(k))
      .sort((a, b) => a - b)[0]
    if (firstStep && firstStep !== step) {
      setStep(firstStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  function validateStep1(): boolean {
    if (!formRef.current) return false
    const missing: string[] = []

    for (const name of REQUIRED_STEP_1) {
      const el = formRef.current.querySelector<HTMLInputElement>(
        `[name="${name}"]`,
      )
      const value = (el?.value ?? '').trim()
      if (!value) missing.push(name)
    }

    if (missing.length > 0) {
      const labels = missing.map((n) => FIELD_LABELS[n] ?? n).join(', ')
      setStepError(`Te falta completar: ${labels}.`)
      const focusEl = formRef.current.querySelector<HTMLElement>(
        `[name="${missing[0]}"]`,
      )
      focusEl?.focus()
      return false
    }

    setStepError(null)
    return true
  }

  function snapshotForm(): Record<string, string> {
    if (!formRef.current) return {}
    const fd = new FormData(formRef.current)
    const out: Record<string, string> = {}
    fd.forEach((value, key) => {
      if (key === 'firmaPng') return // no incluir base64 en resumen
      const s = value.toString().trim()
      if (s) out[key] = s
    })
    return out
  }

  function goNext() {
    if (step === 1) {
      if (!validateStep1()) return
    }
    if (step === 2) {
      setResumen(snapshotForm())
    }
    if (step < 3) {
      setStep(((step as number) + 1) as Step)
      setStepError(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function goBack() {
    if (step > 1) {
      setStep(((step as number) - 1) as Step)
      setStepError(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function addFamiliar() {
    setFamiliares((arr) => [...arr, arr.length === 0 ? 0 : Math.max(...arr) + 1])
  }
  function removeFamiliar(idx: number) {
    setFamiliares((arr) => arr.filter((i) => i !== idx))
  }

  // Lista de campos con error del server, con su paso, para mostrar arriba
  // un summary tipo "Corregí: X (Paso 1), Y (Paso 2)".
  const serverErrorKeys = Object.keys(errors).filter((k) => errors[k])
  const serverErrorSummary = serverErrorKeys.length > 0
    ? serverErrorKeys
        .map((k) => {
          const label = FIELD_LABELS[k] ?? k
          const s = stepOfField(k)
          return `${label} (paso ${s})`
        })
        .join(', ')
    : null

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-6" noValidate>
      <div className="rounded-xl bg-white p-4 shadow-card">
        <StepIndicator current={step} steps={STEP_LABELS} />
        <p className="mt-4 text-center text-xs font-medium uppercase tracking-wider text-brand-muted">
          Paso {step} de 3
        </p>
      </div>

      {serverErrorSummary && (
        <ErrorMessage>
          Revisá estos campos: {serverErrorSummary}.
        </ErrorMessage>
      )}
      {!serverErrorSummary && state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      {stepError && <ErrorMessage>{stepError}</ErrorMessage>}

      {/* PASO 1 — SOLO OBLIGATORIOS */}
      <div className={step === 1 ? '' : 'hidden'}>
        <Section
          title="Tus datos"
          subtitle="Lo mínimo para procesar tu afiliación. El resto lo agregás después o lo completa la CD."
        >
          <Field
            name="apellidoNombre"
            label="Apellido y Nombre"
            placeholder="Pérez, María Ana"
            required
            error={errors['apellidoNombre']}
          />
          <Row>
            <Select
              name="tipoDocumento"
              label="Tipo de documento"
              defaultValue="DNI"
              options={[
                ['DNI', 'DNI'],
                ['LE', 'Libreta Enrolamiento'],
                ['LC', 'Libreta Cívica'],
                ['CI', 'Cédula'],
                ['PASAPORTE', 'Pasaporte'],
              ]}
              error={errors['tipoDocumento']}
            />
            <Field
              name="numeroDocumento"
              label="Nº de DNI"
              inputMode="numeric"
              placeholder="30000000"
              required
              error={errors['numeroDocumento']}
            />
          </Row>
          <Field
            name="numeroLegajo"
            label="Nº de legajo"
            inputMode="numeric"
            placeholder="983928"
            required
            error={errors['numeroLegajo']}
            hint="El número que figura en tu recibo de sueldo (sin letras)."
          />
          <Field
            name="celular"
            label="Celular"
            type="tel"
            placeholder="11 5555-1234"
            required
            error={errors['celular']}
          />
          <Field
            name="email"
            label="Correo electrónico"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            required
            error={errors['email']}
          />
        </Section>
      </div>

      {/* PASO 2 — TODO OPCIONAL, AGRUPADO EN <details> */}
      <div className={step === 2 ? '' : 'hidden'}>
        <div className="rounded-xl border-2 border-dashed border-brand-blue/30 bg-brand-blue/5 p-4">
          <p className="text-sm text-brand-ink">
            <strong>Todo lo de este paso es opcional.</strong> Si lo
            completás ahora la CD nos ahorra trabajo, pero también podés
            saltarlo y procesamos tu solicitud igual.
          </p>
        </div>

        <SectionGap />

        {/* Edificio destacado: si lo cargás, te identificamos en padrón y
            avisamos a tu delegado/a. No está dentro de <details>. */}
        <Section
          title="¿Dónde trabajás?"
          subtitle="Elegilo del listado del padrón ANSES. Si lo cargás, le avisamos a tu delegado/a del sector."
        >
          <EdificioCombo />
        </Section>

        <SectionGap />

        <OptionalDetails
          summary="Datos personales adicionales"
          hint="Fecha de nacimiento, estado civil"
        >
          <Row>
            <Field
              name="fechaNacimiento"
              label="Fecha de nacimiento"
              type="date"
              error={errors['fechaNacimiento']}
            />
            <Select
              name="estadoCivil"
              label="Estado civil"
              options={[
                ['', '— Elegir —'],
                ['soltero', 'Soltero/a'],
                ['casado', 'Casado/a'],
                ['conviviente', 'Conviviente'],
                ['divorciado', 'Divorciado/a'],
                ['viudo', 'Viudo/a'],
                ['otro', 'Otro'],
              ]}
              error={errors['estadoCivil']}
            />
          </Row>
        </OptionalDetails>

        <SectionGap />

        <OptionalDetails summary="Domicilio" hint="Dónde vivís">
          <Row>
            <Field name="domicilioCalle" label="Calle" placeholder="Av. Corrientes" error={errors['domicilioCalle']} />
            <Field name="domicilioNumero" label="Número" inputMode="numeric" placeholder="1234" error={errors['domicilioNumero']} />
          </Row>
          <Row>
            <Field name="domicilioPiso" label="Piso" error={errors['domicilioPiso']} />
            <Field name="domicilioDepto" label="Depto" error={errors['domicilioDepto']} />
          </Row>
          <Row>
            <Field name="domicilioLocalidad" label="Localidad" error={errors['domicilioLocalidad']} />
            <Field name="domicilioCp" label="Código postal" inputMode="numeric" error={errors['domicilioCp']} />
          </Row>
          <Field name="domicilioProvincia" label="Provincia" error={errors['domicilioProvincia']} />
        </OptionalDetails>

        <SectionGap />

        <OptionalDetails
          summary="Más datos del trabajo"
          hint="Categoría, planta, área, gerencia — la CD lo completa desde el padrón si no lo cargás"
        >
          <Row>
            <Field name="categoria" label="Categoría" error={errors['categoria']} />
            <Field name="areaUdai" label="Área" error={errors['areaUdai']} />
          </Row>
          <Field name="gerencia" label="Gerencia" error={errors['gerencia']} />
          <Field name="cargoFuncion" label="Cargo o función" error={errors['cargoFuncion']} />
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-brand-ink">
              Tipo de planta
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <RadioPill name="tipoPlanta" value="permanente" label="Planta permanente" />
              <RadioPill name="tipoPlanta" value="transitoria" label="Planta transitoria" />
            </div>
            {errors['tipoPlanta'] && <p role="alert" className="text-sm text-red-600">{errors['tipoPlanta']}</p>}
          </fieldset>
          <Field name="trabajoDomicilio" label="Domicilio del trabajo" error={errors['trabajoDomicilio']} />
          <Row>
            <Field name="trabajoLocalidad" label="Localidad" error={errors['trabajoLocalidad']} />
            <Field name="trabajoTelefono" label="Teléfono" type="tel" error={errors['trabajoTelefono']} />
          </Row>
          <Field name="trabajoEmail" label="Email institucional" type="email" error={errors['trabajoEmail']} />
        </OptionalDetails>

        <SectionGap />

        <OptionalDetails
          summary="Datos familiares"
          hint="Cónyuge y otros familiares"
        >
          <details className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-ink">
              Cónyuge / conviviente
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <Field name="conyuge.apellidoNombre" label="Apellido y Nombre" error={errors['conyuge']} />
              <Row>
                <Select
                  name="conyuge.tipoDoc"
                  label="Tipo de doc."
                  defaultValue="DNI"
                  options={[
                    ['DNI', 'DNI'],
                    ['LE', 'LE'],
                    ['LC', 'LC'],
                    ['CI', 'CI'],
                    ['PASAPORTE', 'Pasaporte'],
                  ]}
                />
                <Field name="conyuge.numeroDoc" label="Nº doc." inputMode="numeric" />
              </Row>
              <Field name="conyuge.fechaNac" label="Fecha de nacimiento" type="date" />
            </div>
          </details>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-brand-ink">Otros familiares</h3>
              <button
                type="button"
                onClick={addFamiliar}
                className="text-sm font-medium text-brand-blue underline-offset-4 hover:underline"
              >
                + Agregar
              </button>
            </div>
            {familiares.length === 0 && (
              <p className="text-xs text-brand-muted">Sin familiares cargados.</p>
            )}
            {familiares.map((idx, position) => (
              <div key={idx} className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    Familiar {position + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFamiliar(idx)}
                    className="text-xs font-medium text-red-600 underline-offset-4 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
                <Field name={`familiar.${idx}.apellidoNombre`} label="Apellido y Nombre" />
                <Row>
                  <Select
                    name={`familiar.${idx}.tipoDoc`}
                    label="Tipo doc."
                    defaultValue="DNI"
                    options={[
                      ['DNI', 'DNI'],
                      ['LE', 'LE'],
                      ['LC', 'LC'],
                    ]}
                  />
                  <Field name={`familiar.${idx}.numeroDoc`} label="Nº doc." inputMode="numeric" />
                </Row>
                <Row>
                  <Field name={`familiar.${idx}.fechaNac`} label="Fecha de nacimiento" type="date" />
                  <Field name={`familiar.${idx}.parentesco`} label="Parentesco" placeholder="Hijo/a, Padre, etc." />
                </Row>
              </div>
            ))}
          </div>
        </OptionalDetails>

        <SectionGap />

        <OptionalDetails summary="CBU" hint="Para acreditar beneficios">
          <Field
            name="cbu"
            label="CBU"
            inputMode="numeric"
            placeholder="22 dígitos"
            error={errors['cbu']}
          />
        </OptionalDetails>
      </div>

      {/* PASO 3 — RESUMEN + FIRMA + ENVIAR */}
      <div className={step === 3 ? '' : 'hidden'}>
        <Section
          title="Revisá tus datos"
          subtitle="Confirmá que está todo bien antes de firmar."
        >
          <ResumenView resumen={resumen} familiares={familiares} />
          <p className="text-xs text-brand-muted">
            Si algo está mal, volvé atrás con el botón de abajo y corregilo.
          </p>
        </Section>

        <SectionGap />

        <Section title="Autorización" subtitle="Necesaria para descontar la cuota">
          <label className="flex items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <input
              type="checkbox"
              name="aceptaDescuento"
              required
              className="mt-1 h-5 w-5 shrink-0 accent-brand-blue"
            />
            <span className="text-sm text-brand-ink">
              Autorizo a la Administración Nacional de Seguridad Social a que
              del importe total mensual que percibo, se me descuente el{' '}
              <strong>3%</strong> en calidad de afiliado/a a esta Asociación
              Sindical. Declaro que los datos expuestos son fieles y veraces.
            </span>
          </label>
          {errors['aceptaDescuento'] && (
            <p role="alert" className="text-sm text-red-600">
              {errors['aceptaDescuento']}
            </p>
          )}
        </Section>

        <SectionGap />

        <Section title="Firma digital" subtitle="Firmá con el dedo (mobile) o el mouse">
          <SignaturePad name="firmaPng" />
          {errors['firmaPng'] && (
            <p role="alert" className="text-sm text-red-600">
              {errors['firmaPng']}
            </p>
          )}
        </Section>
      </div>

      {/* NAVEGACIÓN */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {step > 1 ? (
          <Button type="button" variant="secondary" onClick={goBack}>
            ← Atrás
          </Button>
        ) : (
          <span />
        )}

        {step < 3 ? (
          <Button type="button" onClick={goNext}>
            {step === 1 ? 'Siguiente →' : 'Ir al resumen →'}
          </Button>
        ) : (
          <SubmitButton />
        )}
      </div>
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Enviando…' : 'Enviar solicitud'}
    </Button>
  )
}

// ─── resumen ──────────────────────────────────────────────────────────

const RESUMEN_GROUPS: Array<{ title: string; fields: Array<[string, string]> }> = [
  {
    title: 'Datos personales',
    fields: [
      ['apellidoNombre', 'Apellido y Nombre'],
      ['tipoDocumento', 'Tipo de doc.'],
      ['numeroDocumento', 'Nº de DNI'],
      ['fechaNacimiento', 'Fecha de nacimiento'],
      ['estadoCivil', 'Estado civil'],
    ],
  },
  {
    title: 'Contacto',
    fields: [
      ['celular', 'Celular'],
      ['telefono', 'Teléfono'],
      ['email', 'Email'],
      ['cbu', 'CBU'],
    ],
  },
  {
    title: 'Domicilio',
    fields: [
      ['domicilioCalle', 'Calle'],
      ['domicilioNumero', 'Número'],
      ['domicilioPiso', 'Piso'],
      ['domicilioDepto', 'Depto'],
      ['domicilioLocalidad', 'Localidad'],
      ['domicilioProvincia', 'Provincia'],
      ['domicilioCp', 'CP'],
    ],
  },
  {
    title: 'Trabajo',
    fields: [
      ['numeroLegajo', 'Legajo'],
      ['categoria', 'Categoría'],
      ['tipoPlanta', 'Planta'],
      ['edificioUdai', 'Edificio'],
      ['areaUdai', 'Área'],
      ['gerencia', 'Gerencia'],
      ['cargoFuncion', 'Cargo'],
    ],
  },
]

function ResumenView({
  resumen,
  familiares,
}: {
  resumen: Record<string, string>
  familiares: number[]
}) {
  return (
    <div className="flex flex-col gap-3">
      {RESUMEN_GROUPS.map((group) => {
        const filled = group.fields.filter(([k]) => resumen[k])
        if (filled.length === 0) return null
        return (
          <div
            key={group.title}
            className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-3"
          >
            <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              {group.title}
            </h4>
            <dl className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
              {filled.map(([k, label]) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <dt className="text-xs text-brand-muted">{label}:</dt>
                  <dd className="text-right text-sm font-medium text-brand-ink">
                    {resumen[k]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}

      {familiares.length > 0 && (
        <div className="rounded-md border border-neutral-200 bg-white p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Familiares cargados
          </h4>
          <p className="text-sm text-brand-ink">
            {familiares.length} familiar{familiares.length > 1 ? 'es' : ''}
          </p>
        </div>
      )}

      {Object.keys(resumen).length === 0 && (
        <p className="text-sm text-brand-muted">
          No cargaste datos opcionales. Vamos a procesar tu solicitud con lo
          obligatorio nomás.
        </p>
      )}
    </div>
  )
}

// ─── primitivas ───────────────────────────────────────────────────────

function SectionGap() {
  return <div className="h-3" />
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card">
      <header className="flex flex-col gap-0.5 border-b border-neutral-100 pb-2">
        <h2 className="text-base font-semibold text-brand-ink">{title}</h2>
        {subtitle && <p className="text-xs text-brand-muted">{subtitle}</p>}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function OptionalDetails({
  summary,
  hint,
  children,
}: {
  summary: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <details className="rounded-xl bg-white p-4 shadow-card">
      <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold text-brand-ink">
            {summary}{' '}
            <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-muted">
              Opcional
            </span>
          </span>
          {hint && <span className="text-xs text-brand-muted">{hint}</span>}
        </div>
        <span className="text-brand-muted transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </details>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

function Field({ label, error, hint, name, id, ...rest }: FieldProps) {
  const inputId = id ?? `f-${name}`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-brand-ink">
        {label} {rest.required && <span className="text-red-600">*</span>}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? 'true' : undefined}
        className={
          'w-full min-h-touch rounded-md border bg-white px-3 py-2 text-base ' +
          'placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-1 ' +
          (error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-neutral-300 focus:ring-brand-blue')
        }
        {...rest}
      />
      {hint && !error && <p className="text-xs text-brand-muted">{hint}</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

type SelectProps = {
  name: string
  label: string
  options: Array<[string, string]>
  required?: boolean
  defaultValue?: string
  error?: string
}

function Select({ name, label, options, required, defaultValue, error }: SelectProps) {
  const inputId = `f-${name}`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-brand-ink">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <select
        id={inputId}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={
          'w-full min-h-touch rounded-md border bg-white px-3 py-2 text-base ' +
          'focus:outline-none focus:ring-2 focus:ring-offset-1 ' +
          (error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-neutral-300 focus:ring-brand-blue')
        }
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

function RadioPill({ name, value, label }: { name: string; value: string; label: string }) {
  return (
    <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm has-[:checked]:border-brand-blue has-[:checked]:bg-brand-blue has-[:checked]:text-white">
      <input type="radio" name={name} value={value} className="h-4 w-4 accent-brand-blue" />
      <span>{label}</span>
    </label>
  )
}
