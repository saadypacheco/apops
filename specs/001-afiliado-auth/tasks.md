---
description: "Task list — Registro y autenticación de afiliados"
---

# Tasks: Registro y autenticación de afiliados

**Input**: Design documents from `/specs/001-afiliado-auth/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓ (4 contratos), quickstart.md ✓

**Tests**: Tests **obligatorios** por mandato de la constitución v1.0.0 §VI
(Edge Functions, flujos de auth, RLS policies). NO se aplica `--passWithNoTests`
en CI.

**Organization**: Tareas agrupadas por user story para implementación y testing
independientes. MVP entrega solo US1 (afiliado activo). US2 y US3 son
incrementos posteriores.

## Format

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

- `[P]` indica tareas paralelizables (distintos archivos, sin dependencias pendientes).
- `[US1]/[US2]/[US3]` indica user story; tareas de Setup/Foundational/Polish no llevan label.
- File path absoluto desde repo root.

## Path Conventions

- **Frontend**: `src/app/(auth)/`, `src/app/(app)/`, `src/components/`, `src/lib/`, `src/middleware.ts`, `src/types/`
- **Backend (Edge Functions)**: `supabase/functions/`
- **Database**: `supabase/migrations/`
- **Tests**: `tests/contract/`, `tests/integration/`, `tests/rls/`, `tests/unit/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto Next.js + Supabase + tooling de calidad. Sin esta fase, ninguna user story puede empezar.

- [X] T001 Crear estructura Next.js 14 App Router con TypeScript en repo root: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js` siguiendo Project Structure de plan.md
- [X] T002 Instalar dependencias del stack lockeado: `next@14`, `react@18`, `typescript@5.5`, `tailwindcss`, `@radix-ui/react-label`, `@radix-ui/react-slot`, `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `react-hook-form`, `@hookform/resolvers`
- [X] T003 [P] Configurar ESLint con `eslint-config-next` + Prettier en `.eslintrc.json` y `.prettierrc`
- [X] T004 [P] Configurar Vitest con TypeScript en `vitest.config.ts` y `tests/setup.ts`
- [X] T005 [P] Configurar Playwright para e2e en `playwright.config.ts`
- [X] T006 [P] Crear scripts `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:rls`, `test:e2e`
- [X] T007 Inicializar Supabase local en `supabase/config.toml` y verificar `supabase start` levanta el stack local
- [X] T008 [P] Configurar GitHub Actions workflow `.github/workflows/ci.yml` con jobs: lint + typecheck + test + Lighthouse threshold (PWA ≥ 90, Performance ≥ 85, A11y ≥ 90 según constitución §VII)
- [X] T009 [P] Crear `public/manifest.json` PWA (name, short_name, icons 192/512, display=standalone, start_url, theme_color)
- [X] T010 Crear `src/app/layout.tsx` root layout con metadata + import de Tailwind globals

**Checkpoint Setup**: `npm run dev` debe levantar Next.js sin errores en `http://localhost:3000`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema de base de datos, RLS policies y wiring básico de Supabase. Sin esta fase, NINGUNA user story funciona.

> **Nota**: la migración del padrón (`padron_cotizantes`) es responsabilidad de la **feature precursora separada** según data-model.md. Para el desarrollo de esta feature se incluye un stub mínimo en T011 con el comentario apropiado; cuando la feature precursora ingrese, esta migración se reemplaza por la oficial.

- [ ] T011 Crear migración `supabase/migrations/0009_padron_cotizantes_stub.sql` con schema completo de `padron_cotizantes` según data-model.md (DNI, nombre, legajo, flags afiliado_apops/cotiza_papel/afiliado_ate/etc., metadatos del puesto). Incluir comentario inline: `-- STUB: reemplazar por migración oficial de feature precursora 'padron-ingesta'`
- [ ] T012 Crear migración `supabase/migrations/0010_afiliados.sql` con tabla `afiliados` exacta según data-model.md (CHECK constraints, indexes, FK a auth.users)
- [ ] T013 Crear migración `supabase/migrations/0011_solicitudes_pendientes.sql` con tabla y todos los CHECK constraints (chk_subflujo_data, chk_resolved_consistency)
- [ ] T014 Crear migración `supabase/migrations/0012_audit_log.sql` con tabla y los 6 índices definidos en data-model.md (idx_audit_evento, idx_audit_dni, idx_audit_ip, etc.)
- [ ] T015 Crear migración `supabase/migrations/0013_rls_padrones.sql` con `ENABLE ROW LEVEL SECURITY` y SIN policies para anon/authenticated en `padron_cotizantes` (lockdown total)
- [ ] T016 Crear migración `supabase/migrations/0014_rls_afiliados.sql` con policies `afiliados_self_select` y `afiliados_self_update`
- [ ] T017 Crear migración `supabase/migrations/0015_rls_solicitudes.sql` con `ENABLE RLS` y sin policies para usuarios finales (solo service_role)
- [ ] T018 Crear migración `supabase/migrations/0016_rls_audit.sql` con `ENABLE RLS` y sin policies para usuarios finales
- [ ] T019 Aplicar todas las migraciones localmente: `npx supabase db push`
- [ ] T020 Generar tipos TypeScript del schema: `npx supabase gen types typescript --local > src/lib/supabase/types.ts`
- [ ] T021 [P] Crear `src/lib/supabase/server.ts` con cliente Supabase para Server Components (cookies via `@supabase/ssr`)
- [ ] T022 [P] Crear `src/lib/supabase/client.ts` con cliente Supabase para Client Components (browser)
- [ ] T023 [P] Crear `src/lib/supabase/middleware.ts` helper para refresh de sesión (usado por Next.js middleware)
- [ ] T024 Crear `src/middleware.ts` global de Next.js que aplica refresh de sesión y protege rutas `(app)/*`
- [ ] T025 [P] Crear `src/types/auth.ts` con Zod schemas compartidos: `dniSchema`, `legajoSchema`, `emailSchema`, `nombreCompletoSchema`, tipos `Tipo`, `SubFlujo`, etc.
- [ ] T026 [P] Crear `src/components/ui/Input.tsx` envolviendo Radix Label + input nativo con clases Tailwind y soporte de error
- [ ] T027 [P] Crear `src/components/ui/Button.tsx` con variantes (primary, secondary, ghost) y touch target ≥ 44×44 px
- [ ] T028 [P] Crear `src/components/ui/ErrorMessage.tsx` para mostrar errores no técnicos del backend al usuario
- [ ] T029 Crear helper `supabase/functions/_shared/audit.ts` para registrar eventos en `audit_log` (insert con service_role)
- [ ] T030 Crear helper `supabase/functions/_shared/rate-limit.ts` que cuenta intentos en `audit_log` por DNI (5/h) y por IP (20/h) según research.md decisión 4
- [ ] T031 [P] [RLS] Test: `tests/rls/padron-locked.test.ts` verifica que cliente `anon` NO lee `padron_cotizantes` y cliente `authenticated` tampoco
- [ ] T032 [P] [RLS] Test: `tests/rls/audit-locked.test.ts` verifica que ningún cliente que no sea service_role accede a `audit_log`

**Checkpoint Foundational**: `npm run test:rls` pasa con tests T031-T032 verdes. Todas las migraciones aplicadas. Tipos generados.

---

## Phase 3: User Story 1 — Afiliado activo se registra y entra (Priority: P1) 🎯 MVP

**Goal**: Trabajador de ANSES con DNI + legajo + `APOPS = x` en padrón puede completar registro y autenticarse en menos de 90 segundos (SC-001).

**Independent Test**: Con `padron_cotizantes` poblado con un activo (afiliado_apops=true), una persona completa flujo desde `/login` hasta autenticada, verificable según Escenario 1 de quickstart.md.

### Edge Function: validar-padron (sub-flujo activo)

- [ ] T033 [US1] Crear `supabase/functions/validar-padron/index.ts` con handler para flujo `activo`: valida input con Zod, ejecuta query contra `padron_cotizantes` con service_role, aplica rate-limit + audit log, devuelve match según contrato `edge-validar-padron.json`
- [ ] T034 [US1] [Contract] Test: `tests/contract/validar-padron-activo.test.ts` cubre 200_match_found (afiliado_apops=true), 200_no_match motivo `dni_no_en_padron`, 200_no_match motivo `sin_apops`, 400 input inválido, 429 rate limited
- [ ] T035 [US1] [P] Crear wrapper cliente `src/lib/auth/validar-padron.ts` que invoca la Edge Function con tipado TS

### Edge Function: solicitar-magic-link (sub-flujo activo)

- [ ] T036 [US1] Crear `supabase/functions/solicitar-magic-link/index.ts` con handler para flujo `activo`: re-valida server-side, crea/upsertea `auth.users`, crea `afiliados` con `tipo='activo'`, dispara `signInWithOtp`, audita evento, según contrato `edge-solicitar-magic-link.json`
- [ ] T037 [US1] [Contract] Test: `tests/contract/solicitar-magic-link-activo.test.ts` cubre 200_magic_link_sent (DNI en padrón con APOPS=x), 200_pendiente (DNI sin APOPS=x), 409 email conflict, 429 rate limited

### Componentes UI

- [ ] T038 [US1] [P] Crear `src/components/auth/DniLegajoForm.tsx` (Server Component con Server Action) con react-hook-form + Zod, touch targets ≥ 44 px, ARIA labels
- [ ] T039 [US1] [P] Crear `src/components/auth/EmailForm.tsx` análogo
- [ ] T040 [US1] [P] Crear `src/components/auth/LinkNoTengoLegajo.tsx` que linkea a `/login-sin-legajo` (visible y accesible según FR-003)

### Páginas y rutas

- [ ] T041 [US1] Crear `src/app/(auth)/login/page.tsx` que monta `DniLegajoForm` + `LinkNoTengoLegajo`
- [ ] T042 [US1] Crear `src/app/(auth)/email/page.tsx` que monta `EmailForm` (recibe contexto de DNI/legajo validado por sesión temporal o URL state)
- [ ] T043 [US1] Crear `src/app/(auth)/magic-link-enviado/page.tsx` con confirmación visual + email enmascarado
- [ ] T044 [US1] Crear `src/app/(auth)/callback/route.ts` route handler que ejecuta `exchangeCodeForSession`, actualiza `last_login_at`, registra audit, redirige a `/feed` o `/magic-link-expirado` según contrato `route-auth-callback.json`

### Tests de integración

- [ ] T045 [US1] [Integration] Test: `tests/integration/flujo-activo-happy.test.ts` reproduce Escenario 1 de quickstart.md (DNI+legajo válidos → magic link → autenticado con tipo=activo)
- [ ] T046 [US1] [Integration] Test: `tests/integration/flujo-activo-no-en-padron.test.ts` reproduce Escenario 3 (DNI no en padrón → solicitudes_pendientes con sub_flujo=activo, motivo_pendiente=dni_no_en_padron)
- [ ] T047 [US1] [Integration] Test: `tests/integration/flujo-activo-sin-apops.test.ts` reproduce Escenario 4b (DNI en padrón pero APOPS=false → pendiente con motivo `sin_flag_apops_y_sin_papel`, sin filtrar a qué gremio cotiza)
- [ ] T048 [US1] [RLS] Test: `tests/rls/afiliados-self-only.test.ts` verifica que un afiliado autenticado SOLO lee su propia fila de `afiliados`

**Checkpoint US1**: `npm run dev` permite ejecutar el Escenario 1 de quickstart.md de extremo a extremo. Tests T034, T037, T045, T046, T047, T048 verdes. Tiempo manual del flujo < 90 s. **Punto de entrega del MVP** — la app puede deployarse con solo US1 implementado y validar afiliados activos.

---

## Phase 4: User Story 2 — Jubilado afiliado APOPS entra sin legajo (Priority: P1)

**Goal**: Jubilado con `cotiza_papel = x` puede registrarse e ingresar usando solo DNI en menos de 60 segundos (SC-007).

**Independent Test**: con `padron_cotizantes` poblado con un jubilado (cotiza_papel=true), persona completa flujo desde `/login-sin-legajo` hasta autenticada, verificable según Escenario 2 de quickstart.md.

- [X] T049 [US2] Extender `supabase/functions/validar-padron/index.ts` con sub-flujo `sin_legajo`: valida DNI únicamente, chequea `cotiza_papel = true`, devuelve tipo=jubilado o motivo `sin_papel` *(implementado en Phase 3 junto con el sub-flujo activo)*
- [X] T050 [US2] [Contract] Test: `tests/contract/validar-padron-sin-legajo.test.ts` cubre 200_match_found (cotiza_papel=true), 200_no_match motivo `sin_papel`, validación de input rechaza si viene legajo
- [X] T051 [US2] Extender `supabase/functions/solicitar-magic-link/index.ts` con flujo `sin_legajo`: crea afiliado con `tipo='jubilado'` y `legajo=NULL` *(implementado en Phase 3 junto con el sub-flujo activo)*
- [X] T052 [US2] [Contract] Test: `tests/contract/solicitar-magic-link-sin-legajo.test.ts` (jubilado happy path + sin_papel pendiente)
- [X] T053 [US2] [P] Crear `src/components/auth/DniSinLegajoForm.tsx` con solo campo DNI
- [X] T054 [US2] Crear `src/app/(auth)/login-sin-legajo/page.tsx` que monta `DniSinLegajoForm`
- [X] T055 [US2] [Integration] Test: `tests/integration/flujo-sin-legajo-happy.test.ts` (Escenario 2 de quickstart)
- [X] T056 [US2] [Integration] Test: `tests/integration/flujo-sin-legajo-sin-papel.test.ts` (DNI en padrón sin cotiza_papel → pendiente)

**Checkpoint US2**: Escenario 2 de quickstart.md ejecutable end-to-end. US1 sigue funcionando (no regresión).

---

## Phase 5: User Story 3 — Pendiente_validacion con sub-flujos diferenciados (Priority: P2)

**Goal**: Personas no encontradas en padrón con afiliación APOPS quedan en estado `pendiente_validacion` con datos diferenciados según sub-flujo, y el admin puede aprobar/rechazar manualmente.

**Independent Test**: ejecutar Escenarios 3, 4 y 7 de quickstart.md. La fila correcta queda en `solicitudes_pendientes` con los campos condicionales (`legajo` para sub-flujo activo, `nombre_completo` para sin_legajo). Admin puede aprobar y se envía email con magic link.

### Captura de nombre completo (sub-flujo sin_legajo)

- [X] T057 [US3] [P] Crear `src/components/auth/NombreCompletoForm.tsx` con validación Zod (mín 3 caracteres)
- [X] T058 [US3] Crear `src/app/(auth)/nombre-completo/page.tsx` que monta el form (solo accesible cuando flujo previo dio motivo `dni_no_en_padron` desde `login-sin-legajo`)
- [X] T059 [US3] Crear `src/app/(auth)/pendiente-validacion/page.tsx` con mensaje claro y CTA para volver a inicio

### Edge Function: resolver-pendiente (admin)

- [X] T060 [US3] Crear `supabase/functions/resolver-pendiente/index.ts` con sub-acciones `aprobar` y `rechazar`. Verifica rol admin (con stub temporal que documenta el `deferred_dependency` del contrato), re-valida contra padrón, crea afiliado, dispara magic link de aprobación, según contrato `edge-pendiente-actions.json` *(stub `roles_admin` añadido en migración 0017)*
- [X] T061 [US3] [Contract] Test: `tests/contract/resolver-pendiente.test.ts` cubre 200 aprobar (crea afiliado + dispara email FR-019), 200 rechazar (motivo persistido + email), 403 sin admin, 409 conflicto DNI/email

### Tests de integración

- [X] T062 [US3] [Integration] Test: `tests/integration/pendiente-activo.test.ts` (Escenario 3 — sub_flujo activo, persiste legajo+DNI+email)
- [X] T063 [US3] [Integration] Test: `tests/integration/pendiente-sin-legajo.test.ts` (Escenario 4 — sub_flujo sin_legajo, persiste DNI+nombre_completo+email)
- [X] T064 [US3] [Integration] Test: `tests/integration/pendiente-aprobacion.test.ts` (Escenario 7 — admin aprueba, email se envía con magic link, afiliado creado, login OK)

**Checkpoint US3**: Escenarios 3, 4 y 7 de quickstart.md ejecutables. US1 y US2 sin regresión. Solicitudes en estado `pendiente_validacion` correctamente discriminadas por sub-flujo.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Cerrar requisitos transversales (FR-013, FR-014, FR-016, FR-017, FR-018) y validaciones constitucionales finales antes del merge a `main`.

### Logout y sesión

- [X] T065 [P] Crear `src/components/auth/LogoutButton.tsx` con confirmación
- [X] T066 Crear `src/app/(app)/perfil/page.tsx` con `LogoutButton` accesible en máximo 2 taps (FR-014)
- [X] T067 Crear `src/app/(app)/layout.tsx` que verifica sesión server-side y redirige a `/login` si no hay sesión

### Magic link expirado y reenvío

- [X] T068 Crear `src/app/(auth)/magic-link-expirado/page.tsx` con CTA "Pedir uno nuevo" y soporte de query param `reason`
- [X] T069 Implementar lógica de reenvío en `solicitar-magic-link` que respeta FR-017 (no requerir reingresar DNI/legajo si recientemente validado en este device — vía cookie corta)

### Rate limiting y audit consolidados

- [ ] T070 [Integration] Test: `tests/integration/rate-limit-padron.test.ts` reproduce Escenario 6 de quickstart (6 intentos en 1 hora → 429 con mensaje claro)
- [ ] T071 [Integration] Test: `tests/integration/audit-trail.test.ts` verifica que cada evento del flujo (validar attempt/success/failure/no_afiliacion, magic_link_sent, authentication_success, logout, pendiente_*) queda en `audit_log` con IP + user_agent + metadata cuando corresponde
- [ ] T072 [Integration] Test: `tests/integration/logout.test.ts` reproduce Escenario 8 de quickstart (logout en 2 taps, cookie removida, redirect)

### Performance + accesibilidad medibles (constitución §VII)

- [ ] T073 Configurar Lighthouse CI script en `package.json` y workflow `.github/workflows/ci.yml`: build de producción → `npx lighthouse http://localhost:3000/login --only-categories=pwa,performance,accessibility` con thresholds 90/85/90
- [ ] T074 [P] Auditoría de accesibilidad manual con NVDA o VoiceOver sobre `/login`, `/login-sin-legajo`, `/email`, `/perfil` — documentar resultados y corregir violaciones WCAG AA encontradas
- [ ] T075 [P] Verificación de bundle size: `npx @next/bundle-analyzer` para confirmar que JS al cliente se mantiene mínimo (objetivo informativo, no thresholdable acá)

### Documentación y cierre

- [ ] T076 [P] Actualizar `docs/bitacora-sdd.md` con paso post-implementación (qué encontramos, qué cambiamos del plan)
- [ ] T077 [P] Actualizar `AGENTS.md §10 Estado activo` reflejando que la feature 001-afiliado-auth está completa y mergeada
- [ ] T078 Verificación final: correr `npm run lint && npm run typecheck && npm run test && npm run test:rls && npm run test:e2e` — todos pasan en CI antes del PR

**Checkpoint Polish**: todos los SCs medibles (SC-001 a SC-008) verificados. Lighthouse en producción cumple thresholds. Audit log completo. Logout funcional. La feature está lista para PR a `main` y posterior `/speckit-cleanup` + `/speckit-checklist`.

---

## Dependencies (story completion order)

```text
Setup (P1) ──┐
             ├─→ Foundational (P2) ──┐
                                      ├─→ US1 (P3) — MVP entregable
                                      │
                                      ├─→ US2 (P4) — incremento P1
                                      │
                                      ├─→ US3 (P5) — incremento P2
                                      │
                                      └─→ Polish (P6) — pre-merge
```

- US1, US2, US3 son **independent-testable** una vez Foundational está completa.
- En orden de prioridad: US1 (MVP) → US2 → US3.
- Polish toca todos los flujos pero no agrega user stories nuevos.

## Parallel execution examples (per phase)

### Phase 1 Setup
T003, T004, T005, T006 pueden correr en paralelo (configuran tools distintos). T008, T009 paralelos (CI yml + manifest.json).

### Phase 2 Foundational
T021, T022, T023 paralelos (clientes Supabase distintos archivos). T025, T026, T027, T028 paralelos (Zod schemas + 3 componentes UI distintos).

### Phase 3 US1
T035 paralelo con T038, T039, T040 (wrapper cliente vs componentes UI distintos).

### Phase 6 Polish
T074, T075, T076, T077 paralelos (auditorías y docs en archivos distintos).

## Implementation Strategy

**MVP first**: Detener la implementación al cierre de **US1 (Phase 3)** y validar
con stakeholders antes de seguir. La app deployable con US1 ya entrega valor:
afiliados activos pueden registrarse y entrar.

**Incremental delivery**: cada user story se mergea por separado (idealmente a
una rama de release) tras superar su Checkpoint. US2 después de US1 sin
regresiones; US3 después de US2; Polish al final.

**TDD parcial**: por mandato constitucional §VI, los tests son obligatorios
para Edge Functions, RLS y flujos. Recomendado: escribir tests de contract
ANTES de la implementación de cada Edge Function (T034 antes de T033 acepta
TDD). Tests de integración pueden escribirse después de la implementación si
el equipo lo prefiere.

## Resumen

- **Total tasks**: 78
- **Setup**: 10 tasks
- **Foundational**: 22 tasks
- **US1 (MVP)**: 16 tasks
- **US2**: 8 tasks
- **US3**: 8 tasks
- **Polish**: 14 tasks
- **Tasks paralelizables [P]**: 25
- **Tests obligatorios**: 19 (contract + integration + RLS) — alineado con constitución §VI
