import { z } from 'zod'

// =====================================================================
// Notificaciones — sistema de hilos 1-a-1 paralelos.
// Migration 0027.
// =====================================================================

export const enviarNotificacionFormSchema = z.object({
  asunto: z
    .string()
    .trim()
    .min(3, 'El asunto debe tener al menos 3 caracteres.')
    .max(200, 'El asunto no puede superar los 200 caracteres.'),
  mensaje: z
    .string()
    .trim()
    .min(1, 'Escribí algún mensaje.')
    .max(5000, 'El mensaje no puede superar los 5000 caracteres.'),
  destinatarios: z
    .array(z.string().uuid('Destinatario inválido.'))
    .min(1, 'Seleccioná al menos un destinatario.')
    .max(500, 'Demasiados destinatarios — máximo 500 por envío.'),
})

export const responderHiloFormSchema = z.object({
  hilo_id: z.string().uuid('Hilo inválido.'),
  mensaje: z
    .string()
    .trim()
    .min(1, 'Escribí algún mensaje.')
    .max(5000, 'El mensaje no puede superar los 5000 caracteres.'),
})

export type EnviarNotificacionForm = z.infer<typeof enviarNotificacionFormSchema>
export type ResponderHiloForm = z.infer<typeof responderHiloFormSchema>

export interface NotifFormState {
  error?: string
  success?: string
  fieldErrors?: {
    asunto?: string
    mensaje?: string
    destinatarios?: string
  }
}

// Tipos de listado para la UI
export type DestinatarioCandidato = {
  afiliadoId: string
  nombre: string
  dni: string
  legajo: string | null
  rol: 'afiliado' | 'delegado' | 'admin'
  tipo: 'activo' | 'jubilado'
}

export type HiloResumen = {
  id: string
  asunto: string
  ultimoMensajeAt: string
  yoSoyAutor: boolean // true si yo inicié el hilo, false si soy destinatario
  contraparteNombre: string
  contraparteRol: 'afiliado' | 'delegado' | 'admin'
  leidoPorMi: boolean
  ultimoMensajePreview: string
}
