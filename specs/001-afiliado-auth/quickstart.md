# Quickstart — Validación manual de afiliado-auth

**Feature**: 001-afiliado-auth · **Date**: 2026-05-01

Escenarios reproducibles para validar la feature de extremo a extremo en un
entorno de desarrollo. Sirven como checklist humano para los gates de
`/speckit-cleanup` y `/speckit-checklist` antes del merge.

## Pre-requisitos del entorno local

- Supabase CLI instalado y proyecto local ejecutándose (`supabase start`).
- Ambos padrones cargados con datos de prueba (la feature precursora debe
  estar al menos en estado de fixture loadable).
- `.env.local` con todas las variables de `.env.example` apuntando al
  proyecto local.
- `npm run dev` corriendo en `http://localhost:3000`.

### Datos de prueba mínimos en `padron_cotizantes`

```sql
-- Trabajadores activos afiliados APOPS (flujo activo, login OK)
INSERT INTO padron_cotizantes (dni, legajo, nombre, afiliado_apops, source_batch) VALUES
  ('30000001', 'L-0001', 'Pérez, María', true, '<batch_id>'),
  ('30000002', 'L-0002', 'García, Juan', true, '<batch_id>');

-- Trabajador activo afiliado a OTRO gremio (flujo activo, queda pendiente)
INSERT INTO padron_cotizantes (dni, legajo, nombre, afiliado_apops, afiliado_ate, source_batch) VALUES
  ('30000003', 'L-0003', 'Martínez, Pablo', false, true, '<batch_id>');

-- Jubilado afiliado APOPS por transferencia (flujo sin legajo, login OK)
INSERT INTO padron_cotizantes (dni, nombre, cotiza_papel, source_batch) VALUES
  ('20000001', 'Rodríguez, Ana', true, '<batch_id>');

-- Persona en padrón pero sin flag APOPS ni cotiza_papel (queda pendiente en cualquier flujo)
INSERT INTO padron_cotizantes (dni, nombre, source_batch) VALUES
  ('20000002', 'Fernández, Luis', '<batch_id>');
```

## Escenario 1 — US1 happy path: afiliado activo se registra y entra

**Pre-condición**: `30000001 / L-0001` existe en `padron_cotizantes` con `afiliado_apops = true`.

**Pasos**:
1. Abrir `http://localhost:3000/login` en Chrome móvil emulado a 375 px.
2. Ingresar DNI `30000001` y legajo `L-0001`.
3. Clic en "Continuar" → se navega a captura de email.
4. Ingresar `mperez+test@example.com`.
5. Clic en "Enviarme el enlace" → se navega a `/magic-link-enviado`.
6. Abrir Inbucket / Mailpit local en `http://localhost:54324`.
7. Encontrar el email de Supabase Auth con el magic link.
8. Clic en el link.
9. Aterrizar autenticado en `/feed` (placeholder por ahora).

**Verificaciones esperables**:
- ✅ La fila de `afiliados` existe con `tipo='activo'`, `estado='activo'`,
  `legajo='L-0001'`, `dni='30000001'`.
- ✅ `audit_log` tiene `padron_validation_attempt`,
  `padron_validation_success`, `magic_link_sent`, `authentication_success`.
- ✅ Cookie `sb-*-auth-token` HTTP-only presente.
- ✅ Tiempo total < 90 s (SC-001).

## Escenario 2 — US2 happy path: jubilado entra sin legajo

**Pre-condición**: `20000001` existe en `padron_cotizantes` con
`cotiza_papel = true`.

**Pasos**:
1. Abrir `/login`.
2. Clic en "No tengo legajo" (visible y accesible) → navega a
   `/login-sin-legajo`.
3. Ingresar DNI `20000001`.
4. Clic en "Continuar" → captura de email.
5. Ingresar email `arodriguez+test@example.com` → "Enviarme el enlace".
6. Abrir Inbucket, clic en magic link.
7. Aterrizar autenticado.

**Verificaciones esperables**:
- ✅ Fila en `afiliados` con `tipo='jubilado'`, `legajo IS NULL`.
- ✅ Tiempo total < 60 s (SC-007).
- ✅ `audit_log` registra el flujo entero.

## Escenario 3 — US3 sub-flujo activo: pendiente_validacion

**Pre-condición**: `99999999 / L-9999` NO existe en `padron_cotizantes`.

**Pasos**:
1. Abrir `/login`. Ingresar `99999999` + `L-9999`.
2. El form pasa a captura de email (porque la lógica acepta y deja
   pendiente — alternativamente puede ofrecer "no tengo legajo"; verificar
   diseño exacto).
3. Ingresar `desconocido+test@example.com` → "Enviarme el enlace".
4. Aterrizar en `/pendiente-validacion` con mensaje claro.

**Verificaciones esperables**:
- ✅ Fila en `solicitudes_pendientes` con `sub_flujo='activo'`,
  `legajo='L-9999'`, `nombre_completo IS NULL`, `estado='pendiente'`.
- ✅ NO hay magic link en Inbucket para ese email.
- ✅ NO hay fila en `afiliados`.
- ✅ `audit_log` tiene `pendiente_created`.

## Escenario 4 — US3 sub-flujo sin_legajo: pendiente con nombre completo

**Pre-condición**: `88888888` NO existe en `padron_cotizantes`.

**Pasos**:
1. Abrir `/login`, clic en "No tengo legajo".
2. Ingresar `88888888`.
3. El sistema detecta DNI no encontrado y solicita **nombre completo**
   antes de email.
4. Ingresar nombre `Doe, John`.
5. Ingresar email `jdoe+test@example.com` → enviar.
6. Aterrizar en `/pendiente-validacion`.

**Verificaciones esperables**:
- ✅ Fila en `solicitudes_pendientes` con `sub_flujo='sin_legajo'`,
  `legajo IS NULL`, `nombre_completo='Doe, John'`, `estado='pendiente'`.

## Escenario 4b — Edge: afiliado a otro gremio queda pendiente

**Pre-condición**: `30000003 / L-0003` existe en padrón con
`afiliado_apops = false` y `afiliado_ate = true`.

**Pasos**:
1. Abrir `/login`. Ingresar `30000003` + `L-0003`.
2. Continuar a captura de email.
3. Ingresar `pmartinez+test@example.com` → enviar.
4. Aterrizar en `/pendiente-validacion` con mensaje genérico ("Estamos
   verificando tu afiliación APOPS, te avisaremos por email").

**Verificaciones esperables**:
- ✅ Fila en `solicitudes_pendientes` con `motivo_pendiente='sin_flag_apops_y_sin_papel'`,
  `sub_flujo='activo'`, `legajo='L-0003'`.
- ✅ NO se filtra al cliente que la persona está afiliada a ATE — el
  mensaje es genérico.
- ✅ `audit_log` tiene `padron_validation_no_afiliacion`.

## Escenario 5 — Edge: magic link expirado

**Pre-condición**: completar el flujo del Escenario 1 hasta recibir email,
pero NO hacer clic en el link inmediatamente. Esperar 24+ horas (o ajustar
el TTL en config local para reducir a 1 minuto durante test).

**Pasos**:
1. Hacer clic en el magic link expirado.
2. Aterrizar en `/magic-link-expirado` con CTA "Pedir uno nuevo".
3. Clic en "Pedir uno nuevo".
4. Sin reingresar DNI/legajo (FR-017), recibir nuevo magic link.
5. Clic en el nuevo link → entrar autenticado.

## Escenario 6 — Edge: rate limit excedido (FR-013)

**Pasos**:
1. Desde la misma IP, intentar validar 6 veces el DNI `30000001` con legajo
   incorrecto en menos de 1 hora.
2. En el 6to intento, recibir error 429 con mensaje claro y tiempo de
   espera.

**Verificaciones esperables**:
- ✅ `audit_log` tiene 5 `padron_validation_failure` + 1 `rate_limit_exceeded`.
- ✅ El usuario ve mensaje legible (no código de error técnico).

## Escenario 7 — Edge: aprobación de pendiente

**Pre-condición**: existe `solicitudes_pendientes` del Escenario 3 con
estado='pendiente'. Existe un afiliado con rol admin (puede crearse
manualmente vía SQL con feature de roles aún no implementada — para test,
asumir mock).

**Pasos** (vía Edge Function directo, sin UI admin):
1. Hacer POST a `/functions/v1/resolver-pendiente` con
   `{ "solicitud_id": "<id>", "accion": "aprobar" }` con JWT de admin.
2. Verificar respuesta `200 { status: 'aprobada', afiliado_id: ... }`.
3. Verificar email en Inbucket: contiene confirmación + magic link.
4. Clic en magic link → entrar autenticado.

**Verificaciones esperables**:
- ✅ Fila en `afiliados` creada con datos de la solicitud.
- ✅ Solicitud actualizada a `estado='aprobada'`, `resolved_*` poblados.
- ✅ `audit_log` registra `pendiente_approved`.

## Escenario 8 — Logout

**Pasos**:
1. Estar autenticado.
2. Ir a `/perfil`.
3. Clic en "Cerrar sesión".
4. Confirmar.
5. Aterrizar en `/login`.

**Verificaciones esperables**:
- ✅ 2 taps desde cualquier pantalla autenticada (FR-014).
- ✅ Cookie de sesión removida.
- ✅ Reintentar acceder a `/feed` redirige a `/login`.
- ✅ `audit_log` registra `logout`.

## Cómo correr los tests automatizados

```bash
# Unit + integration
npm run test

# Solo tests de RLS policies
npm run test:rls

# E2E con Playwright
npm run test:e2e

# Lighthouse en build de producción
npm run build && npm run start &
npx lighthouse http://localhost:3000/login \
  --only-categories=pwa,performance,accessibility \
  --quiet --chrome-flags="--headless"
```

Los thresholds están en CI: PWA ≥ 90, Performance ≥ 85, A11y ≥ 90. Si un
build los baja, el merge a `main` queda bloqueado (constitución VII).
