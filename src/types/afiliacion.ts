import { z } from 'zod'

// Schemas de validación para el formulario de afiliación pública.
// Mantener sincronizado con CHECK constraints de migration 0020.

const dniSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6,12}$/, 'Documento inválido. Solo números, 6 a 12 dígitos.')

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email inválido.')

const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Teléfono muy corto.')
  .max(30, 'Teléfono muy largo.')

const optionalPhone = z
  .union([z.literal(''), phoneSchema])
  .optional()
  .transform((v) => (v === '' ? undefined : v))

const optionalEmail = z
  .union([z.literal(''), emailSchema])
  .optional()
  .transform((v) => (v === '' ? undefined : v))

const legajoSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{4,10}$/, 'Legajo inválido. Solo números, 4 a 10 dígitos.')

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

const cbuSchema = z
  .union([
    z.literal(''),
    z.string().regex(/^[0-9]{22}$/, 'CBU debe tener 22 dígitos.'),
  ])
  .optional()
  .transform((v) => (v === '' ? undefined : v))

export const familiarSchema = z.object({
  apellidoNombre: z.string().trim().min(3, 'Nombre completo requerido.'),
  tipoDoc: z.enum(['DNI', 'LE', 'LC', 'CI', 'PASAPORTE']),
  numeroDoc: dniSchema,
  fechaNac: z.string().min(1, 'Fecha requerida.'),
  parentesco: z.string().trim().min(2, 'Parentesco requerido.'),
})

export const conyugeSchema = z
  .object({
    apellidoNombre: z.string().trim().optional(),
    tipoDoc: z.enum(['DNI', 'LE', 'LC', 'CI', 'PASAPORTE']).optional(),
    numeroDoc: z
      .union([z.literal(''), dniSchema])
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
    fechaNac: z.string().optional(),
  })
  .optional()

export const afiliacionSchema = z.object({
  // Datos personales — obligatorios (paso 1)
  apellidoNombre: z.string().trim().min(3, 'Tu apellido y nombre completos.').max(200),
  tipoDocumento: z.enum(['DNI', 'LE', 'LC', 'CI', 'PASAPORTE']).default('DNI'),
  numeroDocumento: dniSchema,
  // fechaNacimiento pasa a opcional: si falta sale del padrón al matchear
  fechaNacimiento: z
    .union([z.literal(''), z.string().min(1)])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  estadoCivil: z
    .enum(['soltero', 'casado', 'conviviente', 'divorciado', 'viudo', 'otro'])
    .optional(),

  // Domicilio (opcional pero recomendado)
  domicilioCalle: optionalString,
  domicilioNumero: optionalString,
  domicilioPiso: optionalString,
  domicilioDepto: optionalString,
  domicilioLocalidad: optionalString,
  domicilioProvincia: optionalString,
  domicilioCp: optionalString,

  // Contacto — telefono pasa a opcional (sólo celular obligatorio)
  telefono: optionalPhone,
  celular: phoneSchema,
  email: emailSchema,
  cbu: cbuSchema,

  // Lugar de trabajo — legajo obligatorio (numérico), resto opcional
  numeroLegajo: legajoSchema,
  edificioUdai: optionalString,
  trabajoLocalidad: optionalString,
  trabajoDomicilio: optionalString,
  trabajoTelefono: optionalString,
  trabajoEmail: optionalEmail,
  gerencia: optionalString,
  areaUdai: optionalString,
  cargoFuncion: optionalString,
  categoria: optionalString,
  // tipoPlanta pasa a opcional: el admin lo completa desde padrón
  tipoPlanta: z.enum(['permanente', 'transitoria']).optional(),

  // Familia
  conyuge: conyugeSchema,
  familiares: z.array(familiarSchema).optional(),

  // Consentimiento
  aceptaDescuento: z.literal(true, {
    errorMap: () => ({
      message: 'Tenés que autorizar el descuento del 3% para afiliarte.',
    }),
  }),

  // Firma digital (PNG dataURL: "data:image/png;base64,...")
  firmaPng: z
    .string()
    .min(100, 'Firmá en el recuadro antes de enviar.')
    .startsWith('data:image/png;base64,', 'Firma con formato inválido.'),
})

export type AfiliacionInput = z.infer<typeof afiliacionSchema>
export type Familiar = z.infer<typeof familiarSchema>

export interface AfiliacionFormState {
  error?: string
  fieldErrors?: Record<string, string | undefined>
  success?: boolean
  solicitudId?: string
}
