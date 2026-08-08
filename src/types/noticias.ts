import { z } from 'zod'

// Schemas de validación de novedades — coinciden con los CHECK de la
// migration 0018_noticias.sql.

export const noticiaFormSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(5, 'El título debe tener al menos 5 caracteres.')
    .max(200, 'El título no puede superar los 200 caracteres.'),
  resumen: z
    .string()
    .trim()
    .min(10, 'El resumen debe tener al menos 10 caracteres.')
    .max(500, 'El resumen no puede superar los 500 caracteres.'),
  contenido: z
    .string()
    .trim()
    .max(10000, 'El contenido es demasiado largo.')
    .optional()
    .or(z.literal('')),
  autor: z
    .string()
    .trim()
    .max(100, 'El autor no puede superar los 100 caracteres.')
    .optional()
    .or(z.literal('')),
  destacada: z.coerce.boolean().optional(),
  publicada: z.coerce.boolean().optional(),
  // Migration 0041: quién la ve y cómo se agrupa en el panel del delegado.
  audiencia: z.enum(['todos', 'delegados']).optional(),
  tema: z.enum(['general', 'paritaria', 'material', 'campana']).optional(),
})

export type NoticiaForm = z.infer<typeof noticiaFormSchema>

export interface NoticiaFormState {
  error?: string
  fieldErrors?: {
    titulo?: string
    resumen?: string
    contenido?: string
    autor?: string
  }
}
