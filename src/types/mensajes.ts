import { z } from 'zod'

// Mensaje del delegado a la CD. Form simple: asunto + mensaje.
// Coincide con los CHECK constraints de la migration 0024.

export const mensajeDelegadoFormSchema = z.object({
  asunto: z
    .string()
    .trim()
    .min(3, 'El asunto debe tener al menos 3 caracteres.')
    .max(200, 'El asunto no puede superar los 200 caracteres.'),
  mensaje: z
    .string()
    .trim()
    .min(5, 'El mensaje debe tener al menos 5 caracteres.')
    .max(2000, 'El mensaje no puede superar los 2000 caracteres.'),
})

export type MensajeDelegadoForm = z.infer<typeof mensajeDelegadoFormSchema>

export interface MensajeFormState {
  error?: string
  success?: string
  fieldErrors?: {
    asunto?: string
    mensaje?: string
  }
}
