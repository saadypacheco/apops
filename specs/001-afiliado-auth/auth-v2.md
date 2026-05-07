# Auth v2 — Login con clave + magic link

> ADR (Architecture Decision Record) de la segunda iteración del sistema de auth.
> Estado: aprobado 2026-05-05. Implementación en curso.

## Contexto

La v1 (Phase 5/6 del plan original) implementó auth solo con magic link OTP.
La v2 suma password como método alternativo, sin reemplazar al magic link.
No hay usuarios en producción al momento de esta iteración → cero presión de
migración.

Hecho clave del dominio: **el padrón no contiene email**. El email se obtiene
únicamente cuando la persona se registra. Esto fuerza que el primer ingreso sea
un registro explícito (no un magic link "directo desde DNI").

## Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D1 | Supabase Auth nativo (email+password + OTP), no auth custom | Reusa RLS, JWT, hash bcrypt, recovery, refresh. Cero superficie nueva de seguridad. |
| D2 | Login presenta dos opciones visibles: "Ingresar con clave" / "Ingresar con magic link" | Evita el bug UX clásico "no sé si tengo clave". |
| D3 | Campo único "DNI o Legajo": detección server-side por regex (DNI = 7-8 dígitos) | Lo pidió el cliente. Front simple, lógica server. |
| D4 | Password es opcional. Magic link sigue siendo método universal | No fuerza a nadie. Modal post-callback "creá tu clave (opcional)". |
| D5 | "Olvidé mi clave" = magic link + reset forzado post-callback | Una sola implementación cubre 2 casos. |
| D6 | `afiliados.estado` se amplía a `activo | bloqueado | baja`. Pendiente vive en `solicitudes_pendientes` | Single source of truth. Evita duplicar afiliado pendiente. |
| D7 | Tabla `auth_attempts` para rate limit + bloqueo automático | Control fino y auditable. Supabase rate limit por IP global no alcanza. |
| D8 | "No estás en padrón" bifurca: "Solicitar acceso" o "Afiliarme a APOPS" | Reusa los dos flujos existentes (`solicitudes_pendientes` + `/afiliarse`). |
| D9 | `afiliados.email` desnormalizado (sincronizado con `auth.users.email`) | Permite mapear DNI → email sin admin client en cada query. Single writer: server actions. |
| D10 | Confirmación de email: doble input en el form (sin link de confirmación) | Decisión del cliente. Protege contra typos. **Limitación conocida**: no garantiza que el email sea real ni que el usuario lo controle — si más adelante hay problemas de emails inválidos, sumar link de confirmación. |
| D11 | Panel admin mínimo entra en esta feature | Sin panel las solicitudes acumulan dormidas. Ranking de prioridad UX > metodológico. |

## Modelo de datos (delta sobre v1)

```sql
-- migration 0022_auth_v2.sql

-- Estados ampliados
ALTER TABLE afiliados
  DROP CONSTRAINT afiliados_estado_check,
  ADD CONSTRAINT afiliados_estado_check
    CHECK (estado IN ('activo', 'bloqueado', 'baja'));

-- Email desnormalizado + trazabilidad + datos de bloqueo
ALTER TABLE afiliados
  ADD COLUMN email text NOT NULL CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  ADD COLUMN origen text NOT NULL DEFAULT 'padron'
    CHECK (origen IN ('padron','solicitud_acceso','solicitud_afiliacion')),
  ADD COLUMN tiene_password boolean NOT NULL DEFAULT false,
  ADD COLUMN bloqueado_hasta timestamptz,
  ADD COLUMN bloqueado_motivo text;

CREATE UNIQUE INDEX uq_afiliados_email ON afiliados(email);

-- Rate limit + auditoría de intentos
CREATE TABLE auth_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   text NOT NULL,
  ip_address   inet,
  intentado_at timestamptz NOT NULL DEFAULT now(),
  exitoso      boolean NOT NULL,
  metodo       text NOT NULL CHECK (metodo IN ('password','magic_link'))
);
```

`solicitudes_pendientes` y `solicitudes_afiliacion` quedan sin cambios.

## Flujos

| ID | Nombre | Resumen |
|---|---|---|
| F1 | Login con clave | DNI/Legajo + clave → `afiliados.email` → `signInWithPassword` |
| F2 | Login con magic link | DNI/Legajo → `afiliados.email` → `signInWithOtp` |
| F3 | Registro (en padrón) | DNI/Legajo + email → valida padrón → crea `auth.users` + `afiliados` → magic link de confirmación |
| F4 | No-padrón | Bifurcación: "Solicitar acceso" (`solicitudes_pendientes`) o "Afiliarme" (`/afiliarse`) |
| F5 | Recuperación / cambio de clave | F2 + modal forzado post-callback. Cambio voluntario en `/perfil/clave` |

Detalles paso-a-paso de cada flujo: ver [README de la sesión 2026-05-05].

## Seguridad — parámetros

| Parámetro | Valor |
|---|---|
| Password mínimo | 8 chars (Supabase default), sin requisitos de complejidad |
| Rate limit signInWithPassword | 5 intentos por (DNI ∪ IP) por 15 min |
| Bloqueo automático | Tras 5 fallos: `bloqueado_hasta = now() + 15min` |
| Magic link expiración | 10 min |
| Magic link single-use | ✅ default Supabase |
| JWT access | 1h (default), refresh 30d con rotación |
| Mensajes login | Genéricos siempre. Login con clave: "Credenciales inválidas". Magic link: "Si tus datos están registrados, te enviamos el link." |

## Pantallas

| Ruta | Acción |
|---|---|
| `/`, `/login` | Form: DNI/Legajo + Clave + 2 botones (Ingresar / Magic link) + link "¿Primera vez? Registrate" |
| `/login-magic-link` | Crear |
| `/registrarse` | Crear |
| `/no-en-padron` | Crear (bifurcación F4) |
| `/recuperar-clave` | Alias de `/login-magic-link?modo=reset` |
| `/perfil/clave` | Crear |
| `/admin/solicitudes` | Crear (panel mínimo unificado) |
| `/login-sin-legajo`, `/email`, `/nombre-completo` | Borrar |
| `/magic-link-enviado`, `/magic-link-expirado`, `/pendiente-validacion` | Mantener |

## Plan de implementación (6 fases, ~2-3 sesiones)

| Fase | Tarea | Estimado |
|---|---|---|
| F0 | Migration 0022 + tipos + zod | 30 min |
| F1 | Helpers backend (`identifier`, `rate-limit`) + tests | 1h |
| F2 | Login con clave + Registro (acoplados) | 1.5h |
| F3 | Magic link unificado + recovery | 1h |
| F4 | No-padrón bifurcado | 30 min |
| F5 | Cambio de clave + perfil | 30 min |
| F6 | Panel admin mínimo (`/admin/solicitudes`) | 1.5h |

## Fuera de scope

- 2FA
- Multi-device control / "ver sesiones activas"
- Magic link por SMS
- Auditoría visible al usuario
