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

const optionalEmail = z
  .union([z.literal(''), emailSchema])
  .optional()
  .transform((v) => (v === '' ? undefined : v))

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
  // Datos personales
  apellidoNombre: z.string().trim().min(3, 'Tu apellido y nombre completos.').max(200),
  tipoDocumento: z.enum(['DNI', 'LE', 'LC', 'CI', 'PASAPORTE']),
  numeroDocumento: dniSchema,
  fechaNacimiento: z.string().min(1, 'Fecha de nacimiento requerida.'),
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

  // Contacto
  telefono: phoneSchema,
  celular: phoneSchema,
  email: emailSchema,
  cbu: cbuSchema,

  // Lugar de trabajo
  numeroLegajo: z.string().trim().min(2, 'Legajo requerido.').max(20),
  edificioUdai: optionalString,
  trabajoLocalidad: optionalString,
  trabajoDomicilio: optionalString,
  trabajoTelefono: optionalString,
  trabajoEmail: optionalEmail,
  gerencia: optionalString,
  areaUdai: optionalString,
  cargoFuncion: optionalString,
  categoria: optionalString,
  tipoPlanta: z.enum(['permanente', 'transitoria'], {
    errorMap: () => ({ message: 'Indicá tipo de planta.' }),
  }),

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
