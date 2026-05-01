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

// Sub-flujos de registro (data-model.md §solicitudes_pendientes)
export type SubFlujo = 'activo' | 'sin_legajo'

// Motivos por los que una solicitud queda pendiente
export type MotivoPendiente =
  | 'dni_no_en_padron'
  | 'sin_flag_apops_y_sin_papel'
  | 'otros'

// =====================================================================
// Zod schemas — validación compartida entre forms (cliente) y Edge
// Functions (server). Mantener alineados con los CHECK constraints de
// las migraciones SQL.
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

// Email: validación estándar. Coincide con el CHECK regex de
// solicitudes_pendientes y con el formato que valida Supabase Auth.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('El email no parece válido.')

// Nombre completo (sub-flujo sin_legajo cuando DNI no está en padrón).
// Mínimo 3 caracteres para evitar entradas triviales.
export const nombreCompletoSchema = z
  .string()
  .trim()
  .min(3, 'Ingresá tu nombre completo.')
  .max(120, 'El nombre es demasiado largo.')

// =====================================================================
// Schemas compuestos por flujo
// =====================================================================

export const dniLegajoFormSchema = z.object({
  dni: dniSchema,
  legajo: legajoSchema,
})

export const dniSinLegajoFormSchema = z.object({
  dni: dniSchema,
})

export const emailFormSchema = z.object({
  email: emailSchema,
})

export const nombreCompletoFormSchema = z.object({
  nombreCompleto: nombreCompletoSchema,
})

export type DniLegajoForm = z.infer<typeof dniLegajoFormSchema>
export type DniSinLegajoForm = z.infer<typeof dniSinLegajoFormSchema>
export type EmailForm = z.infer<typeof emailFormSchema>
export type NombreCompletoForm = z.infer<typeof nombreCompletoFormSchema>
