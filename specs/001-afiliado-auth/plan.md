# Implementation Plan: Registro y autenticación de afiliados

**Branch**: `001-afiliado-auth` | **Date**: 2026-05-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-afiliado-auth/spec.md`

## Summary

Implementa los dos flujos de autenticación de APOPS Siempre (afiliado activo
con DNI+legajo, y afiliado sin legajo solo con DNI), validación contra padrones
precargados, magic link via Supabase Auth, y manejo de solicitudes pendientes
para personas no encontradas en padrón.

**Enfoque técnico**: Next.js 14 App Router con Server Components por defecto;
Supabase Auth para magic link y sesión; Edge Functions de Supabase para
validación contra padrón (que aísla datos sensibles del frontend); RLS
estricto en todas las tablas; auditoría completa de eventos sensibles.

## Technical Context

**Language/Version**: TypeScript 5.5+ con Next.js 14 (App Router)
**Primary Dependencies**: `@supabase/ssr`, `@supabase/supabase-js`, `next@14`,
`react@18`, `tailwindcss`, `@radix-ui/*` (primitivas accesibles), `zod`
(validación de schemas), `react-hook-form` (forms)
**Storage**: Supabase Postgres (managed) — RLS activo en todas las tablas
**Testing**: Vitest para unit + integration; Playwright para e2e end-to-end;
tests de RLS policies con cliente Supabase con distintos roles
**Target Platform**: PWA — Android Chrome 90+, iOS Safari 15+, navegadores
desktop modernos
**Project Type**: web-app (Next.js full-stack con Edge Functions de Supabase)
**Performance Goals**: Lighthouse PWA ≥ 90, Performance ≥ 85, Accessibility ≥ 90
en build de producción (constitución VII); cualquier paso del flujo presenta
feedback al usuario en < 3 s en 4G (SC-005)
**Constraints**: Mobile-first 375 px; sin Firebase; sin Google Analytics; sin
Pages Router; sin ORM externo (Supabase typegen); sin librería UI pesada
(Tailwind + Radix primitives); RLS obligatorio (constitución IV)
**Scale/Scope**: ~10 pantallas en este feature. Audiencia inicial estimada:
miles de afiliados, con ráfagas de validación durante períodos de campaña.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento de este plan |
|---|---|
| **I. Foco operativo** | ✅ Auth es soporte directo del núcleo (consultas). Sin auth no hay producto. No agrega features fuera de §6. |
| **II. Simplicidad para no técnicos** | ✅ Magic link sin contraseña; formularios mínimos (DNI + legajo, o solo DNI); botón "No tengo legajo" prominente; lenguaje claro en errores; touch targets ≥ 44 px; tipografía base 16 px. |
| **III. Cero secretos hardcodeados** | ✅ Variables Supabase y VAPID en env vars; `service_role_key` solo en Edge Functions; `.env.example` ya documenta variables. |
| **IV. RLS obligatorio en Supabase** | ✅ `afiliados`, `solicitudes_pendientes`, `audit_log`, `padron_cotizantes` con RLS. Anon NO accede a ninguna; el padrón está cerrado también para `authenticated` (solo `service_role` vía Edge Function). |
| **V. Privacidad por diseño (Ley 25.326)** | ✅ HTTPS; padrón nunca expuesto al frontend (Edge Function devuelve solo `match` + `tipo`); logout en 2 taps desde perfil (FR-014); audit log de eventos sensibles; sin tracking externo. |
| **VI. Tests para lógica crítica** | ✅ Tests obligatorios: Edge Functions de validar-padrón y solicitar-magic-link, RLS policies (permitido + denegado por rol), flujos completos (US1/US2/US3). Sin `--passWithNoTests`. |
| **VII. Performance y mobile-first** | ✅ Server Components por defecto, mobile-first 375 px, Lighthouse ≥ 90/85/90 verificable en CI. |

**Resultado gate inicial**: ✅ **PASS** sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/001-afiliado-auth/
├── plan.md                    # Este archivo
├── spec.md                    # Spec funcional ya clarificada
├── research.md                # Phase 0 — decisiones técnicas
├── data-model.md              # Phase 1 — schema SQL + RLS + state transitions
├── quickstart.md              # Phase 1 — escenarios de validación manual
├── contracts/                 # Phase 1 — contratos Edge Functions y rutas
│   ├── edge-validar-padron.json
│   ├── edge-solicitar-magic-link.json
│   ├── edge-pendiente-actions.json
│   └── route-auth-callback.json
├── checklists/
│   └── requirements.md        # Quality checklist de la spec
└── tasks.md                   # (futuro: output de /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/                                # Rutas públicas de autenticación
│   │   ├── login/page.tsx                     # DNI + legajo (flujo activo)
│   │   ├── login-sin-legajo/page.tsx          # Solo DNI (jubilado)
│   │   ├── email/page.tsx                     # Captura email tras validación
│   │   ├── nombre-completo/page.tsx           # Captura nombre (sub-flujo sin-legajo + DNI no encontrado)
│   │   ├── magic-link-enviado/page.tsx        # Confirmación visual
│   │   ├── magic-link-expirado/page.tsx       # Reenvío
│   │   ├── pendiente-validacion/page.tsx      # Mensaje de espera
│   │   └── callback/route.ts                  # Handler del magic link
│   ├── (app)/                                 # Rutas protegidas
│   │   ├── perfil/page.tsx                    # Logout en 2 taps (FR-014)
│   │   └── layout.tsx                         # Verifica sesión, redirige
│   └── layout.tsx                             # Root layout
├── components/
│   ├── auth/
│   │   ├── DniLegajoForm.tsx
│   │   ├── DniSinLegajoForm.tsx
│   │   ├── EmailForm.tsx
│   │   ├── NombreCompletoForm.tsx
│   │   ├── LinkNoTengoLegajo.tsx
│   │   └── LogoutButton.tsx
│   └── ui/                                    # Tailwind + Radix primitives
│       ├── Input.tsx
│       ├── Button.tsx
│       └── ErrorMessage.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts                          # Cliente server (cookies)
│   │   ├── client.ts                          # Cliente browser
│   │   ├── middleware.ts                      # Refresh sesión
│   │   └── types.ts                           # Generado por supabase gen types
│   └── auth/
│       ├── validar-padron.ts                  # Wrapper de Edge Function
│       └── verificar-magic-link.ts
├── middleware.ts                              # Auth gate global
└── types/
    └── auth.ts                                # Tipos de dominio compartidos

supabase/
├── migrations/
│   ├── 0010_afiliados.sql                     # Tabla afiliados
│   ├── 0011_solicitudes_pendientes.sql        # Tabla solicitudes
│   ├── 0012_audit_log.sql                     # Tabla audit
│   ├── 0013_rls_afiliados.sql                 # RLS afiliados
│   ├── 0014_rls_solicitudes.sql               # RLS solicitudes
│   ├── 0015_rls_audit.sql                     # RLS audit
│   └── 0016_rls_padrones.sql                  # RLS padrones (lock-down)
└── functions/
    ├── validar-padron/index.ts                # Valida sin exponer padrón
    ├── solicitar-magic-link/index.ts          # Orquesta auth.users + send link
    └── resolver-pendiente/index.ts            # Admin aprueba/rechaza

tests/
├── contract/
│   ├── validar-padron.test.ts
│   ├── solicitar-magic-link.test.ts
│   └── resolver-pendiente.test.ts
├── integration/
│   ├── flujo-activo-happy.test.ts             # US1 happy path
│   ├── flujo-activo-no-en-padron.test.ts      # US3 sub-activo
│   ├── flujo-sin-legajo-happy.test.ts         # US2 happy path
│   ├── flujo-sin-legajo-no-en-padron.test.ts  # US3 sub-sin-legajo
│   ├── magic-link-expirado.test.ts
│   └── rate-limit-padron.test.ts              # FR-013
├── rls/
│   ├── afiliados-self-only.test.ts            # Permitido + denegado
│   ├── solicitudes-no-anon.test.ts
│   ├── audit-no-authenticated.test.ts
│   └── padrones-locked-down.test.ts
└── unit/
    └── lib/auth/
        └── validar-padron.test.ts
```

**Structure Decision**: Web application (Option 2 del template) con frontend
en Next.js + backend en Edge Functions de Supabase. Componentes agrupados por
dominio (no por tipo) según AGENTS.md §4. Lógica server-side sensible vive en
`supabase/functions/` para mantener `service_role_key` fuera del cliente.

## Complexity Tracking

> Vacía: el Constitution Check inicial pasó sin violaciones.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(ninguna)_ | _(n/a)_ | _(n/a)_ |

## Phase 0 — Research outcomes

Detalle en [research.md](./research.md). Decisiones clave:

- **Auth provider**: Supabase Auth (magic link nativo). No construimos magic
  link propio.
- **Validación contra padrón**: Edge Function de Supabase, no API route de
  Next.js — para que `service_role_key` nunca llegue al cliente.
- **Email transaccional**: Supabase Auth lo maneja para magic links; para
  emails de aprobación de pendientes (FR-019) se usa el mismo mecanismo.
- **Rate limiting**: a nivel de Edge Function con tabla `audit_log` como
  fuente de conteo. Sin librería externa en MVP.
- **Sesión persistente**: cookie HTTP-only con refresh token; Next.js
  middleware refresca la sesión.

## Phase 1 — Design outputs

| Artefacto | Resumen |
|---|---|
| [data-model.md](./data-model.md) | 3 tablas nuevas (`afiliados`, `solicitudes_pendientes`, `audit_log`) + 1 tabla precursora `padron_cotizantes` (única, no separada por activos/jubilados). RLS estricto. State transitions. |
| [contracts/edge-validar-padron.json](./contracts/edge-validar-padron.json) | Edge Function de validación: input DNI [+ legajo], output match sin datos del padrón. |
| [contracts/edge-solicitar-magic-link.json](./contracts/edge-solicitar-magic-link.json) | Edge Function que orquesta creación de afiliado + envío de magic link. |
| [contracts/edge-pendiente-actions.json](./contracts/edge-pendiente-actions.json) | Edge Functions admin: aprobar / rechazar pendientes. |
| [contracts/route-auth-callback.json](./contracts/route-auth-callback.json) | Next.js route handler para callback del magic link. |
| [quickstart.md](./quickstart.md) | Escenarios manuales reproducibles (US1, US2, US3, edge cases). |

## Post-design Constitution Re-check

Después de definir data-model y contracts:

- ✅ **IV. RLS**: data-model define policies para cada tabla nueva + lock-down
  de padrones a `anon`/`authenticated`.
- ✅ **V. Privacidad**: contrato de `validar-padron` devuelve solo
  `match: bool, tipo?: string`. Sin nombres, fechas ni datos del padrón.
- ✅ **VI. Tests**: estructura `tests/` cubre contract, integration, rls/, unit/.
- ✅ **VII. Performance**: forms como Server Components con Server Actions
  (JS mínimo al cliente); validación server-side; mobile-first 375 px.

**Resultado gate post-diseño**: ✅ **PASS**.
