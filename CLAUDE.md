# APOPS Siempre — instrucciones para el agente

## Bootstrap al iniciar una sesión nueva

Cuando el usuario abre una sesión nueva en esta carpeta y dice algo como
"retomá los pendientes", "seguí", "continuamos", o equivalente, ejecutar
este protocolo SIN preguntar:

1. **Leer `RESUME.md`** del root del repo. Tiene el estado completo al
   cierre de la última sesión: cuentas demo, URLs live, lo construido,
   lo pendiente, y el plan próximo.

2. **Sincronizar con remoto**:
   ```bash
   git pull origin main
   ```
   Esperar resultado. Si hay conflictos, parar y reportar.

3. **Verificar typecheck**:
   ```bash
   npx tsc --noEmit
   ```

4. **Reportar al usuario** en 4-5 líneas:
   - Última fecha de cierre (frontmatter de RESUME.md)
   - Cuál era el próximo paso planeado
   - Si `git pull` trajo cambios nuevos
   - Si typecheck pasa o no
   - Pregunta concreta: "¿Arrancamos con [próximo paso]?"

5. **NO arrancar a codear hasta tener confirmación** del usuario.

## Contexto vivo

- **Plan original de la primera feature**: [specs/001-afiliado-auth/plan.md](specs/001-afiliado-auth/plan.md)
  (histórico, ya terminado).
- **Estado actual del producto**: [RESUME.md](RESUME.md) ← fuente de verdad.
- **Presentación al cliente**: [presentacion-cliente.md](presentacion-cliente.md).
- **AGENTS.md**: contiene una declaración de "núcleo del producto" como
  *sistema de tickets* que **NO refleja** lo que se construyó (credencial
  digital + comunicación bidireccional). Está marcado como tarea de cleanup
  en RESUME.md — actualizarlo cuando se haga el cierre formal.

## Convenciones del proyecto

- **Mobile-first** con container `max-w-[480px]` centrado. Desktop tiene
  decoración lateral pero el contenido vive en la columna mobile.
- **Server actions** preferidas sobre API routes para mutaciones.
- **RLS deny-by-default** en todas las tablas — server actions usan admin
  client (service_role) para bypassear. RLS es defense in depth.
- **Logs estructurados** con prefijo `[NOMBRE_FLUJO {traceId}]` en server
  actions críticas para correlacionar en Vercel Logs.
- **Migrations** numeradas `00NN_descripcion.sql` en `supabase/migrations/`.
  Aplicar al cloud con `npx supabase db push` + regen types.
- **Tests** corren con vitest. Sin `--passWithNoTests`.

## URLs del proyecto

- Live: https://apops.vercel.app
- Repo: https://github.com/saadypacheco/apops
- Vercel: https://vercel.com/saadypacheco-4143s-projects/apops
- Supabase: https://supabase.com/dashboard/project/pozbdplbichrhojjeqiv
- Diagnóstico: https://apops.vercel.app/api/health
