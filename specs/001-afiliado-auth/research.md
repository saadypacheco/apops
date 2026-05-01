# Research — Registro y autenticación de afiliados

**Feature**: 001-afiliado-auth · **Date**: 2026-05-01
**Phase**: 0 — Outline & Research

## Propósito

Documentar las decisiones técnicas tomadas para implementar la feature, con
rationale y alternativas evaluadas. Este archivo no resuelve `[NEEDS
CLARIFICATION]` (esos ya se resolvieron en `/speckit-clarify`); resuelve
**decisiones técnicas** que se infieren del stack lockeado en la constitución
y de mejores prácticas para el dominio.

## Decisión 1 — Provider de autenticación

**Decisión**: Usar **Supabase Auth nativo** con magic link.

**Rationale**:
- Stack lockeado en constitución (§Stack Constraints) hace de Supabase la
  única opción de backend.
- Supabase Auth ya implementa magic link de un solo uso, expiración, sesión
  con refresh token, y email de envío. Construir esto desde cero violaría el
  principio I (foco operativo) — agregaría trabajo de infraestructura sin
  valor de producto.
- El módulo de magic link de Supabase Auth pasa auditorías de seguridad y
  cumple Ley 25.326 (cifrado, expiración, audit log nativo).

**Alternativas evaluadas**:
- **NextAuth.js**: agrega dependencia y abstracción innecesaria — Supabase
  ya tiene su SDK con session management. Rechazada.
- **Magic Link propio con `crypto.randomUUID()` + tabla `magic_links`**:
  funciona, pero hay que mantener tokens, expiración, anti-replay, integración
  de email transaccional. Rechazada por costo de implementación y mantenimiento.
- **Auth0/Clerk**: servicios externos pagos. Rechazadas por costo y por
  agregar dependencia que la constitución no contempla.

**Implicaciones**:
- La entidad "Enlace Mágico" del spec **NO requiere tabla propia** — Supabase
  Auth lo maneja internamente en `auth.flow_state` y `auth.users`.
- Para el sub-flujo de aprobación de pendientes (FR-019), se reutiliza el
  mismo Supabase Auth: el admin marca la solicitud como aprobada, la Edge
  Function llama `supabase.auth.signInWithOtp({ email })` para enviar magic
  link estándar.

## Decisión 2 — Dónde corre la lógica de validación contra padrón

**Decisión**: **Edge Functions de Supabase**, no API routes de Next.js.

**Rationale**:
- La validación contra padrón requiere acceso a la tabla única
  `padron_cotizantes` que está **lockeada para `anon` y `authenticated`**
  (RLS sin policies). Solo `service_role_key` puede leer esos datos.
- Si pusiéramos esto en Next.js API routes, deberíamos exponer
  `service_role_key` al servidor de Next.js, ampliando la superficie de
  exposición. AGENTS.md §4 establece: *"Edge Functions para lógica server-side
  sensible. Nunca en Next.js API routes con `service_role_key`"*.
- Edge Functions tienen aislamiento por proyecto y rate limiting nativo de
  Supabase.

**Alternativas evaluadas**:
- **Next.js API routes con service_role_key**: rechazada por convención
  declarada en AGENTS.md §4.
- **Next.js Server Actions con cliente service_role**: similar problema
  (la key tendría que estar en el server runtime de Next.js). Rechazada.
- **Postgres RPC con `security definer`**: viable técnicamente, pero la
  función SQL no tiene la misma capacidad para implementar rate limiting
  por IP (`request.headers` no llega limpio). Edge Function la tiene mejor.

**Implicaciones**:
- Cada cliente del frontend invoca Edge Function con sesión `anon`.
- La Edge Function valida input, consulta padrón con `service_role_key`,
  registra el intento en `audit_log`, devuelve solo el match sin datos del
  padrón.

## Decisión 3 — Email transaccional

**Decisión**: Usar **el provider de email integrado de Supabase Auth**.

**Rationale**:
- Supabase Auth tiene SMTP propio para magic links incluido en el tier (con
  límite mensual de envíos). Para MVP alcanza.
- En MVP no se requiere personalización de templates más allá de lo que
  Supabase Auth permite.
- Si se excede el límite o se necesita branding más elaborado, Supabase Auth
  permite configurar SMTP custom (Postmark, SendGrid, Resend) sin tocar
  código de la app.

**Alternativas evaluadas**:
- **Resend.com / Postmark / SendGrid directos**: agregaría dependencia
  externa y secreto extra. Diferido — la migración es trivial cuando se
  necesite.
- **AWS SES**: similar; agregar después si hace falta.

**Implicaciones**:
- `solicitar-magic-link` Edge Function llama directamente a
  `supabase.auth.signInWithOtp({ email })`. Supabase envía el email.
- Para el email de aprobación de solicitud pendiente (FR-019), mismo
  mecanismo + un parámetro `redirectTo` que indica al callback qué mostrar
  como mensaje de bienvenida.

## Decisión 4 — Rate limiting anti-fuerza-bruta

**Decisión**: Rate limiting **a nivel de Edge Function consultando `audit_log`**,
sin librería externa en MVP.

**Rationale**:
- FR-013 exige limitar intentos por DNI y por IP. Hay que persistir intentos
  para contarlos.
- El `audit_log` ya registra `padron_validation_attempt` con `dni_intentado`
  e `ip_address` por requirement de auditoría (FR-018). Reutilizamos esa
  información para contar intentos en una ventana móvil.
- Reglas iniciales (ajustables sin re-spec):
  - Máximo **5 intentos por DNI por hora**
  - Máximo **20 intentos por IP por hora**
  - Si se excede: respuesta 429 con mensaje claro y tiempo de espera.

**Alternativas evaluadas**:
- **Upstash Redis** o similar: más rápido para contar, pero agrega servicio
  externo y costo. Diferido si la solución actual no escala.
- **Postgres `pg_extension` con HyperLogLog**: over-engineering para MVP.

**Implicaciones**:
- Cada llamada a `validar-padron` incurre en 1 INSERT al `audit_log` y 1
  COUNT en ventana móvil. Performance aceptable hasta varios miles de
  intentos por minuto.

## Decisión 5 — Manejo de sesión en Next.js 14 App Router

**Decisión**: **`@supabase/ssr` con cookies HTTP-only** + middleware de
Next.js para refresh.

**Rationale**:
- App Router con Server Components requiere session disponible en el server.
  `@supabase/ssr` está hecho exactamente para eso.
- Cookies HTTP-only previenen XSS robando la sesión.
- Middleware refresca el token automáticamente sin que el usuario lo note.

**Alternativas evaluadas**:
- **localStorage**: vulnerable a XSS, descartada por constitución V.
- **JWT en header Authorization**: requiere manejar refresh manualmente,
  más código.

**Implicaciones**:
- `src/middleware.ts` con la utility de `@supabase/ssr` para refresh.
- `src/lib/supabase/server.ts` y `src/lib/supabase/client.ts` separados
  porque tienen ciclos de vida distintos.

## Decisión 6 — Validación de input en frontend

**Decisión**: **Zod schemas + react-hook-form**.

**Rationale**:
- Zod permite definir schema una vez y reusar en cliente y server (validación
  doble, defense in depth).
- react-hook-form integra naturalmente con Zod via `@hookform/resolvers/zod`.
- Validación instantánea antes de enviar al backend (UX) + validación final
  en el server (seguridad).

**Alternativas evaluadas**:
- **Yup**: válido pero menos type-safe que Zod en proyectos TS.
- **Validación manual en JSX**: code smell, no escala.

**Implicaciones**:
- Schema central en `src/types/auth.ts` exportado para client y server.
- Misma validación corre en form (UX) y en Edge Function (seguridad).

## Decisión 7 — Estilos y componentes UI

**Decisión**: **Tailwind utility classes + Radix UI primitives**.

**Rationale**:
- Lockeado en constitución (Stack Constraints): MUI/Chakra/Ant prohibidos.
- Radix da primitivas accesibles sin estilos (Dialog, Form, Label, etc.)
  que cumplen ARIA por default — clave para WCAG AA (constitución II).
- Tailwind nos da control fino sin agregar bundle pesado.

**Alternativas evaluadas**: ya rechazadas en la constitución.

**Implicaciones**:
- Componentes propios en `src/components/ui/` envuelven Radix con clases
  Tailwind del design system.

## Open Items para Phase 2 (`/speckit-tasks`)

- Definir orden exacto de tareas atómicas con `[P]` para las paralelizables.
- Definir checkpoints de validación entre user stories (cada US es
  independiente-testable).
- Asignar tests específicos de RLS por policy.

## Items diferidos al post-MVP

- Rate limit con Redis externo (si crece la audiencia).
- SMTP custom con branding (cuando lo pida la CD).
- Internacionalización (asumimos español argentino para MVP).
