import { z } from 'zod'

// Estado compartido entre Server Actions y Client Components que usan
// useFormState. Vive acá (no en actions.ts) porque archivos con 'use server'
// solo pueden exportar async functions.
export interface FormState {
  // Banner global (rate limit, server error)
  error?: string
  // Errores por campo (validación local)
  fieldErrors?: Record<string, string | undefined>
}

// Tipos de afiliado APOPS reconocidos por el modelo (data-model.md §afiliados)
export type Tipo = 'activo' | 'jubilado'

// Sub-flujos de registro v1 (data-model.md §solicitudes_pendientes).
// Lo siguen usando solicitar-magic-link y resolver-pendiente Edge Functions
// hasta que F3/F4 los reemplace.
export type SubFlujo = 'activo' | 'sin_legajo'

// Motivos por los que una solicitud queda pendiente
export type MotivoPendiente =
  | 'dni_no_en_padron'
  | 'sin_flag_apops_y_sin_papel'
  | 'otros'

// =====================================================================
// Zod schemas — validación compartida entre forms (cliente) y server.
// Mantener alineados con los CHECK constraints de las migraciones SQL.
// =====================================================================

// DNI argentino: 7 u 8 dígitos numéricos. Coincide con
// CHECK (dni ~ '^[0-9]{7,8}$') en padron_cotizantes y afiliados.
export const dniSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{7,8}$/, 'DNI inválido. Debe tener 7 u 8 dígitos.')

// Legajo: alfanumérico con guiones, 3-20 chars. Validación liberal hasta
// confirmar el formato real del padrón ANSES.
export const legajoSchema = z
  .string()
  .trim()
  .min(3, 'El legajo debe tener al menos 3 caracteres.')
  .max(20, 'El legajo no puede superar los 20 caracteres.')
  .regex(/^[A-Za-z0-9-]+$/, 'El legajo solo admite letras, números y guiones.')

// Email: validación estándar.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('El email no parece válido.')

// =====================================================================
// AUTH v2 — login con clave + magic link unificado
// Schemas y tipos del flujo nuevo (specs/001-afiliado-auth/auth-v2.md)
// =====================================================================

// Estados ampliados de afiliados (migration 0022)
export type EstadoAfiliado = 'activo' | 'bloqueado' | 'baja'

// Trazabilidad: cómo llegó la persona a tener cuenta
export type OrigenAfiliado =
  | 'padron'
  | 'solicitud_acceso'
  | 'solicitud_afiliacion'

// Método de auth registrado en auth_attempts
export type MetodoAuth = 'password' | 'magic_link'

// Identifier: DNI (7-8 dígitos) o legajo. La discriminación entre los dos
// la hace el server (parseIdentifier) — el form solo valida que algo no
// vacío fue ingresado y respeta los límites máximos de ambos.
export const identifierSchema = z
  .string()
  .trim()
  .min(3, 'Ingresá tu DNI o legajo.')
  .max(20, 'Demasiado largo para ser un DNI o legajo.')
  .regex(
    /^[A-Za-z0-9-]+$/,
    'Solo letras, números y guiones (sin puntos ni espacios).',
  )

// Password: 8 chars min, sin requisitos de complejidad (UX moderna).
export const passwordSchema = z
  .string()
  .min(8, 'La clave debe tener al menos 8 caracteres.')
  .max(72, 'La clave no puede superar los 72 caracteres.')

// Form de login con clave (F1)
export const loginConClaveFormSchema = z.object({
  identifier: identifierSchema,
  password: z
    .string()
    .min(1, 'Ingresá tu clave.')
    .max(72, 'Clave demasiado larga.'),
})

// Form de login con magic link (F2)
export const loginMagicLinkFormSchema = z.object({
  identifier: identifierSchema,
})

// Form de registro (F3) — clave es opcional, email se confirma con doble input.
// Decisión D10 (auth-v2.md): doble input contra typos, sin link de confirmación.
export const registroFormSchema = z
  .object({
    identifier: identifierSchema,
    email: emailSchema,
    emailConfirm: emailSchema,
    password: passwordSchema.optional().or(z.literal('')),
  })
  .refine((data) => data.email === data.emailConfirm, {
    message: 'Los emails no coinciden.',
    path: ['emailConfirm'],
  })
  .transform((data) => ({
    identifier: data.identifier,
    email: data.email,
    password: data.password === '' ? undefined : data.password,
  }))

// Form de "Solicitar acceso a la app" (F4) — para personas que llegan a
// /no-en-padron y no quieren afiliarse aún. Inserta en solicitudes_pendientes.
// El legajo es opcional: si viene, sub_flujo='activo'; si no, sub_flujo='sin_legajo'
// (constraint chk_subflujo_data de migration 0011).
export const solicitarAccesoFormSchema = z
  .object({
    dni: dniSchema,
    legajo: z.string().trim().optional().or(z.literal('')),
    nombre: z
      .string()
      .trim()
      .min(2, 'Ingresá tu nombre completo.')
      .max(100, 'Demasiado largo.'),
    email: emailSchema,
    emailConfirm: emailSchema,
    motivo: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .refine((d) => d.email === d.emailConfirm, {
    message: 'Los emails no coinciden.',
    path: ['emailConfirm'],
  })
  .transform((d) => ({
    dni: d.dni,
    legajo: d.legajo && d.legajo.length > 0 ? d.legajo.toUpperCase() : undefined,
    nombre: d.nombre,
    email: d.email,
    motivo: d.motivo && d.motivo.length > 0 ? d.motivo : undefined,
  }))

// Form de cambio de clave desde /perfil/clave (F5)
//
// `actual` es OPCIONAL: si el usuario entró por magic link y no recuerda
// la clave anterior, puede dejar el campo vacío. Cuando viene completo,
// el server lo valida con signInWithPassword. La sesión activa ya
// autentica al usuario; pedir la clave actual es defense in depth.
export const cambioClaveFormSchema = z
  .object({
    actual: z.string(), // opcional — server valida solo si viene con valor
    nueva: passwordSchema,
    confirmar: z.string(),
  })
  .refine((data) => data.nueva === data.confirmar, {
    message: 'La confirmación no coincide.',
    path: ['confirmar'],
  })

export type LoginConClaveForm = z.infer<typeof loginConClaveFormSchema>
export type LoginMagicLinkForm = z.infer<typeof loginMagicLinkFormSchema>
export type RegistroForm = z.infer<typeof registroFormSchema>
export type SolicitarAccesoForm = z.infer<typeof solicitarAccesoFormSchema>
export type CambioClaveForm = z.infer<typeof cambioClaveFormSchema>
