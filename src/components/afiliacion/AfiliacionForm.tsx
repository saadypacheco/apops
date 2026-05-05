'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useRef, useState } from 'react'
import { submitAfiliacion } from '@/lib/auth/actions-afiliacion'
import type { AfiliacionFormState } from '@/types/afiliacion'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { StepIndicator } from './StepIndicator'
import { SignaturePad } from './SignaturePad'

const initial: AfiliacionFormState = {}

const STEP_LABELS: [string, string, string] = [
  'Tus datos',
  'Trabajo y familia',
  'Confirmar',
]

// Campos required que se validan cuando el usuario clickea "Siguiente".
// El paso 3 deja al server hacer la validación final con Zod.
const REQUIRED_PER_STEP: Record<1 | 2, string[]> = {
  1: [
    'apellidoNombre',
    'tipoDocumento',
    'numeroDocumento',
    'fechaNacimiento',
    'telefono',
    'celular',
    'email',
  ],
  2: ['numeroLegajo', 'tipoPlanta'],
}

// Labels legibles para los mensajes de error.
const FIELD_LABELS: Record<string, string> = {
  apellidoNombre: 'Apellido y Nombre',
  tipoDocumento: 'Tipo de documento',
  numeroDocumento: 'Nº de documento',
  fechaNacimiento: 'Fecha de nacimiento',
  telefono: 'Teléfono',
  celular: 'Celular',
  email: 'Correo electrónico',
  numeroLegajo: 'Nº de legajo',
  tipoPlanta: 'Tipo de planta',
}

type Step = 1 | 2 | 3
type FieldErrors = Record<string, string | undefined>

export function AfiliacionForm() {
  const [state, action] = useFormState(submitAfiliacion, initial)
  const [step, setStep] = useState<Step>(1)
  const [stepError, setStepError] = useState<string | null>(null)
  const [familiares, setFamiliares] = useState<number[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const errors = (state.fieldErrors ?? {}) as FieldErrors

  function validateStep(currentStep: 1 | 2): boolean {
    if (!formRef.current) return false
    const required = REQUIRED_PER_STEP[currentStep]
    const missing: string[] = []

    for (const name of required) {
      const els = formRef.current.querySelectorAll<
        HTMLInputElement | HTMLSelectElement
      >(`[name="${name}"]`)

      if (els.length === 0) {
        missing.push(name)
        continue
      }

      const first = els[0]!
      const isRadio =
        first instanceof HTMLInputElement && first.type === 'radio'

      if (isRadio) {
        const anyChecked = Array.from(els).some(
          (el) => el instanceof HTMLInputElement && el.checked,
        )
        if (!anyChecked) missing.push(name)
      } else {
        const value = (first.value ?? '').trim()
        if (!value) missing.push(name)
      }
    }

    if (missing.length > 0) {
      const labels = missing.map((n) => FIELD_LABELS[n] ?? n).join(', ')
      setStepError(`Faltan completar: ${labels}.`)
      // Foco al primero para llevar al usuario al campo
      const focusEl = formRef.current.querySelector<HTMLElement>(
        `[name="${missing[0]}"]`,
      )
      focusEl?.focus()
      return false
    }

    setStepError(null)
    return true
  }

  function goNext() {
    if (step < 3 && validateStep(step as 1 | 2)) {
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

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-6" noValidate>
      <div className="rounded-xl bg-white p-4 shadow-card">
        <StepIndicator current={step} steps={STEP_LABELS} />
        <p className="mt-4 text-center text-xs font-medium uppercase tracking-wider text-brand-muted">
          Paso {step} de 3
        </p>
      </div>

      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      {stepError && <ErrorMessage>{stepError}</ErrorMessage>}

      {/* PASO 1 — DATOS PERSONALES + DOMICILIO + CONTACTO */}
      <div className={step === 1 ? '' : 'hidden'}>
        <Section title="Datos personales" subtitle="Tus datos como afiliado/a">
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
              required
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
              label="Nº de documento"
              inputMode="numeric"
              placeholder="30000000"
              required
              error={errors['numeroDocumento']}
            />
          </Row>
          <Row>
            <Field
              name="fechaNacimiento"
              label="Fecha de nacimiento"
              type="date"
              required
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
        </Section>

        <SectionGap />

        <Section title="Domicilio" subtitle="Opcional, pero recomendado">
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
        </Section>

        <SectionGap />

        <Section title="Contacto" subtitle="Cómo nos comunicamos con vos">
          <Row>
            <Field
              name="telefono"
              label="Teléfono"
              type="tel"
              placeholder="011 4444-5555"
              required
              error={errors['telefono']}
            />
            <Field
              name="celular"
              label="Celular"
              type="tel"
              placeholder="11 5555-1234"
              required
              error={errors['celular']}
            />
          </Row>
          <Field
            name="email"
            label="Correo electrónico"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            required
            error={errors['email']}
          />
          <Field
            name="cbu"
            label="CBU (opcional)"
            inputMode="numeric"
            placeholder="22 dígitos"
            hint="Para acreditar beneficios. Podés agregarlo después."
            error={errors['cbu']}
          />
        </Section>
      </div>

      {/* PASO 2 — TRABAJO + FAMILIA */}
      <div className={step === 2 ? '' : 'hidden'}>
        <Section title="Lugar de trabajo" subtitle="Tu situación en ANSES">
          <Row>
            <Field name="numeroLegajo" label="Nº de legajo" placeholder="L-0000" required error={errors['numeroLegajo']} />
            <Field name="categoria" label="Categoría" error={errors['categoria']} />
          </Row>
          <Row>
            <Field name="edificioUdai" label="Edificio / UDAI" error={errors['edificioUdai']} />
            <Field name="areaUdai" label="Área" error={errors['areaUdai']} />
          </Row>
          <Row>
            <Field name="gerencia" label="Gerencia" error={errors['gerencia']} />
            <Field name="cargoFuncion" label="Cargo o función" error={errors['cargoFuncion']} />
          </Row>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-brand-ink">
              Tipo de planta <span className="text-red-600">*</span>
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <RadioPill name="tipoPlanta" value="permanente" label="Planta permanente" />
              <RadioPill name="tipoPlanta" value="transitoria" label="Planta transitoria" />
            </div>
            {errors['tipoPlanta'] && <p role="alert" className="text-sm text-red-600">{errors['tipoPlanta']}</p>}
          </fieldset>
          <details className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-ink">
              Datos del lugar de trabajo (opcional)
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <Field name="trabajoDomicilio" label="Domicilio del trabajo" error={errors['trabajoDomicilio']} />
              <Row>
                <Field name="trabajoLocalidad" label="Localidad" error={errors['trabajoLocalidad']} />
                <Field name="trabajoTelefono" label="Teléfono" type="tel" error={errors['trabajoTelefono']} />
              </Row>
              <Field name="trabajoEmail" label="Email institucional" type="email" error={errors['trabajoEmail']} />
            </div>
          </details>
        </Section>

        <SectionGap />

        <Section title="Datos familiares" subtitle="Opcional — podés cargarlo después">
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
        </Section>
      </div>

      {/* PASO 3 — CONFIRMACIÓN + FIRMA */}
      <div className={step === 3 ? '' : 'hidden'}>
        <Section title="Confirmar y enviar" subtitle="Revisá y autorizá el descuento">
          <p className="text-sm text-brand-muted">
            Al enviar, tu solicitud queda registrada y la Comisión Directiva te
            contacta por email cuando esté procesada.
          </p>
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
            Siguiente →
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
