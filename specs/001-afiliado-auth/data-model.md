# Data Model — Registro y autenticación de afiliados

**Feature**: 001-afiliado-auth · **Date**: 2026-05-01
**Última revisión**: 2026-05-01 (refactor por padrón único de cotizantes
con columnas reales del Excel del gremio)

## Resumen

Este modelo introduce 3 tablas nuevas (`afiliados`, `solicitudes_pendientes`,
`audit_log`) y depende de 1 tabla precursora (`padron_cotizantes`) que crea
la feature de ingesta de padrón.

Todas las tablas tienen RLS activo en cumplimiento del principio IV de la
constitución.

## Tabla precursora — `padron_cotizantes` (asumida existente)

Esta tabla **NO la crea esta feature**. La crea la feature precursora de
ingesta de padrón. Se documenta acá el schema que esta feature consume y
las columnas relevantes para auth.

El schema refleja la estructura real del Excel mensual del gremio (sample
"COTIZANTES DE JULIO 2016" referenciado en la conversación). Tiene una fila
por persona y la mayoría de columnas son nullable porque la planilla viene
con muchos huecos.

```sql
CREATE TABLE padron_cotizantes (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación (campos críticos para auth, NOT NULL)
  dni                             text UNIQUE NOT NULL CHECK (dni ~ '^[0-9]{7,8}$'),
  nombre                          text NOT NULL,        -- Formato "Apellido, Nombres"

  -- Identificación adicional (nullable porque jubilados pueden no tener legajo activo)
  legajo                          text,                 -- UNIQUE entre activos, nullable para jubilados
  cuil                            text,                 -- Validación cruzada futura

  -- Fechas (nullable — vienen huecas frecuentemente)
  fecha_ingreso                   date,
  fecha_nacimiento                date,
  sexo                            text CHECK (sexo IN ('Varón','Mujer','Otro') OR sexo IS NULL),

  -- Lugar de trabajo (nullable, contradictorio entre fuentes)
  lugar_trabajo_rrhh              text,                 -- Según RRHH oficial
  unidad_organica_historica       text,                 -- Área histórica
  lugar_trabajo_padron            text,                 -- Según padrón cotizantes
  lugar_trabajo_relevamiento      text,                 -- Según relevamiento delegados
  descripcion_lugar_relevamiento  text,
  fecha_actualizacion_delegados   timestamptz,

  -- Categoría y planta
  categoria                       smallint,             -- CAT en el Excel
  tipo_planta                     text,                 -- 'pp' (planta permanente), etc.

  -- Gremios — flags x (en SQL: boolean derivado de la marca x)
  -- ⚡ Críticos para auth APOPS
  afiliado_apops                  boolean NOT NULL DEFAULT false,    -- columna APOPS = x
  cotiza_papel                    boolean NOT NULL DEFAULT false,    -- "Cotiza solo en Papel" = x
                                                                     -- → jubilado APOPS por transferencia
  -- Otros gremios (informativos, no usados para auth APOPS)
  afiliado_ate                    boolean NOT NULL DEFAULT false,
  afiliado_sec                    boolean NOT NULL DEFAULT false,
  afiliado_upcn                   boolean NOT NULL DEFAULT false,
  afiliado_secasfpi               boolean NOT NULL DEFAULT false,

  -- Flags adicionales del Excel
  afiliado_nuevo                  boolean NOT NULL DEFAULT false,    -- "Afiliado NUEVO" = x

  -- Datos de delegado (nullable — solo aplica a quienes son delegados)
  representante                   text,
  periodo_mandato                 text,
  vence_mandato_30dias            boolean,

  -- Geo
  provincia                       text,
  regional                        text,                 -- ej "#_Edificios Centrales"

  -- Metadata de carga
  source_batch                    uuid NOT NULL,        -- referencia al batch de ingesta
  ingestado_at                    timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance del flujo de validación
CREATE INDEX idx_padron_dni ON padron_cotizantes(dni);
CREATE INDEX idx_padron_legajo ON padron_cotizantes(legajo) WHERE legajo IS NOT NULL;

-- Índices parciales para los flags críticos de auth (acelera validación)
CREATE INDEX idx_padron_apops ON padron_cotizantes(dni) WHERE afiliado_apops = true;
CREATE INDEX idx_padron_cotiza_papel ON padron_cotizantes(dni) WHERE cotiza_papel = true;

-- Constraint: legajo debe ser único cuando no es null
CREATE UNIQUE INDEX uq_padron_legajo ON padron_cotizantes(legajo) WHERE legajo IS NOT NULL;
```

### Decisión de modelado: una sola tabla, no separación activos/jubilados

**Decisión**: una tabla única `padron_cotizantes` con flags `afiliado_apops`
y `cotiza_papel` que determinan tipo de afiliación, **no dos tablas
separadas** (`padron_activos` / `padron_no_activos` como diseño anterior).

**Rationale**:
- El gremio mantiene **una sola planilla Excel** que incluye activos y
  jubilados. La traducción 1:1 a una sola tabla evita una capa artificial
  de separación.
- Los activos y jubilados comparten la mayoría de columnas (DNI, nombre,
  fecha_nacimiento, sexo, etc.) — separar duplicaría schema.
- La distinción entre tipos se hace por flags booleanos al validar:
  - `afiliado_apops = true` y NO `cotiza_papel = true` → activo APOPS
  - `cotiza_papel = true` → jubilado APOPS (paga por transferencia)
  - ninguno → no afiliado APOPS (puede estar afiliado a otro gremio o a ninguno)

**Trade-off**: la tabla tiene varias columnas que solo aplican a algunos
casos (ej: `legajo` solo a activos; `representante` solo a delegados).
Aceptable: están todas en NULL cuando no aplican, sin pérdida significativa
de espacio.

### Análisis de formas normales

- **1NF** ✅: todos los atributos son atómicos. Los "flags x" se traducen a
  booleanos individuales (no un array de gremios), preservando 1NF.
- **2NF** ✅: clave primaria simple `id`; toda columna depende de ella.
- **3NF**: ⚠ dependencias funcionales documentadas:
  - `provincia → regional` parcialmente (la regional pertenece a una
    provincia). Se mantiene en la misma tabla por simplicidad — el padrón
    Excel viene así y normalizar agregaría una tabla `regionales` que
    nadie va a usar para join en el flujo de auth.
  - `lugar_trabajo_rrhh ↔ unidad_organica_historica`: relación 1:N que
    podría normalizarse, pero la fuente de verdad es el RRHH externo;
    desnormalización justificada por simplicidad de ingesta.
  - **Decisión consciente**: tabla de hechos amplia con múltiples
    "perspectivas" (RRHH, padrón, relevamiento) por diseño operativo.

## Tabla 1 — `afiliados`

Representa a una persona registrada en la app, vinculada 1:1 con
`auth.users` de Supabase. Solo se crea cuando la validación contra padrón
es exitosa.

```sql
CREATE TABLE afiliados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dni             text UNIQUE NOT NULL CHECK (dni ~ '^[0-9]{7,8}$'),
  legajo          text UNIQUE,                          -- nullable para tipo=jubilado
  nombre          text NOT NULL,
  tipo            text NOT NULL CHECK (tipo IN ('activo','jubilado')),
  estado          text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','baja')),
  padron_id       uuid REFERENCES padron_cotizantes(id) ON DELETE SET NULL,
                                                       -- tracking del registro fuente al momento del registro
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz,

  -- Constraint cruzado: activos requieren legajo, jubilados no pueden tener legajo
  CONSTRAINT chk_tipo_legajo CHECK (
    (tipo = 'activo' AND legajo IS NOT NULL)
    OR
    (tipo = 'jubilado' AND legajo IS NULL)
  )
);

CREATE INDEX idx_afiliados_dni ON afiliados(dni);
CREATE INDEX idx_afiliados_tipo ON afiliados(tipo);
```

### Análisis de formas normales

- **1NF** ✅, **2NF** ✅, **3NF** ✅.
- `padron_id` es snapshot de qué fila del padrón validó en su momento —
  no es dependencia transitiva sino traceability metadata.

### CASCADE

- `auth_user_id ON DELETE CASCADE`: si admin elimina `auth.users` (caso
  Ley 25.326 derecho a baja), `afiliados` desaparece. Audit_log preserva
  el rastro vía `ON DELETE SET NULL`.
- `padron_id ON DELETE SET NULL`: si la fila del padrón se elimina por
  re-ingesta, no se rompe la integridad de `afiliados` (la persona ya
  está validada).

### State transitions

```text
              ┌─────────┐
   creación → │ activo  │ ──baja explícita──→ baja (terminal)
              └─────────┘
```

## Tabla 2 — `solicitudes_pendientes`

Personas que intentaron registrarse pero quedan sin afiliación APOPS
confirmada. Causas posibles: DNI no en padrón, o DNI en padrón pero sin
flag APOPS=x ni cotiza_papel=x (cotiza a otro gremio). FR-010, FR-011, US3.

```sql
CREATE TABLE solicitudes_pendientes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dni               text NOT NULL CHECK (dni ~ '^[0-9]{7,8}$'),
  email             text NOT NULL CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  sub_flujo         text NOT NULL CHECK (sub_flujo IN ('activo','sin_legajo')),
  legajo            text,
  nombre_completo   text,
  motivo_pendiente  text NOT NULL CHECK (motivo_pendiente IN (
    'dni_no_en_padron',
    'sin_flag_apops_y_sin_papel',
    'otros'
  )),
  estado            text NOT NULL DEFAULT 'pendiente'
                       CHECK (estado IN ('pendiente','aprobada','rechazada')),
  motivo_rechazo    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz,
  resolved_by       uuid REFERENCES afiliados(id) ON DELETE SET NULL,

  CONSTRAINT chk_subflujo_data CHECK (
    (sub_flujo = 'activo' AND legajo IS NOT NULL AND nombre_completo IS NULL)
    OR
    (sub_flujo = 'sin_legajo' AND legajo IS NULL AND nombre_completo IS NOT NULL)
  ),
  CONSTRAINT chk_resolved_consistency CHECK (
    (estado = 'pendiente' AND resolved_at IS NULL AND resolved_by IS NULL
       AND motivo_rechazo IS NULL)
    OR
    (estado = 'aprobada' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL
       AND motivo_rechazo IS NULL)
    OR
    (estado = 'rechazada' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL
       AND motivo_rechazo IS NOT NULL)
  )
);

CREATE INDEX idx_solicitudes_estado ON solicitudes_pendientes(estado);
CREATE INDEX idx_solicitudes_dni ON solicitudes_pendientes(dni);
CREATE INDEX idx_solicitudes_motivo ON solicitudes_pendientes(motivo_pendiente);
CREATE INDEX idx_solicitudes_created ON solicitudes_pendientes(created_at DESC);
```

### Cambio respecto a versión anterior

Se agregó la columna **`motivo_pendiente`** (no estaba antes) para que el
admin distinga rápidamente:

- `dni_no_en_padron`: la persona no figura en el padrón en absoluto.
- `sin_flag_apops_y_sin_papel`: figura en el padrón pero no como afiliada
  APOPS (típicamente cotiza a ATE/SEC/UPCN/SECASFPI o sin afiliación).
  **Decisión deliberada**: NO se persiste a qué gremio cotiza la persona
  en este registro — eso queda en el padrón mismo, accesible solo al admin
  con permisos. Cumple FR-015 (privacidad: solo lo necesario).
- `otros`: extensible para casos futuros sin re-spec.

### State transitions

```text
              ┌────────────┐
   creación → │ pendiente  │ ─── admin aprueba ──→ aprobada (magic link enviado)
              └─────┬──────┘
                    │
                    └────── admin rechaza ──→ rechazada (motivo persistido, email enviado)
```

## Tabla 3 — `audit_log`

Sin cambios respecto a la versión anterior. Eventos de seguridad/auditoría
y fuente para rate limiting.

```sql
CREATE TABLE audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento          text NOT NULL CHECK (evento IN (
    'padron_validation_attempt',
    'padron_validation_success',
    'padron_validation_failure',
    'padron_validation_no_afiliacion',     -- ⚡ nuevo: fila existe pero sin flag APOPS ni papel
    'magic_link_sent',
    'authentication_success',
    'authentication_failure',
    'logout',
    'pendiente_created',
    'pendiente_approved',
    'pendiente_rejected',
    'rate_limit_exceeded'
  )),
  afiliado_id     uuid REFERENCES afiliados(id) ON DELETE SET NULL,
  dni_intentado   text,
  ip_address      inet,
  user_agent      text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_evento ON audit_log(evento);
CREATE INDEX idx_audit_dni ON audit_log(dni_intentado);
CREATE INDEX idx_audit_ip ON audit_log(ip_address);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_dni_created ON audit_log(dni_intentado, created_at DESC);
CREATE INDEX idx_audit_ip_created ON audit_log(ip_address, created_at DESC);
```

Se agregó el evento `padron_validation_no_afiliacion` para distinguir el
caso "DNI en padrón pero sin afiliación APOPS" del caso "DNI no en padrón".

## Row Level Security

### `padron_cotizantes` (lockdown total)

```sql
ALTER TABLE padron_cotizantes ENABLE ROW LEVEL SECURITY;
-- Sin policies para anon ni authenticated → sin acceso
-- Solo service_role accede vía Edge Function validar-padron
-- Feature de admin panel agregará policy para rol 'admin' (read-only)
-- Feature de ingesta de padrón usa service_role para INSERT/UPDATE
```

**Importante**: esta política asegura que aun con un bug del frontend, el
padrón completo nunca se filtra al cliente. Cumple FR-015 y constitución V.

### `afiliados`

```sql
ALTER TABLE afiliados ENABLE ROW LEVEL SECURITY;

-- Cada afiliado lee solo su propia fila
CREATE POLICY afiliados_self_select ON afiliados
  FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

-- Self-update solo de email vía Supabase Auth (no se permite UPDATE directo)
-- INSERT y DELETE solo via service_role (Edge Function)
-- Anon: sin policies → sin acceso
```

### `solicitudes_pendientes`

```sql
ALTER TABLE solicitudes_pendientes ENABLE ROW LEVEL SECURITY;
-- Solo service_role inserta y modifica (Edge Function)
-- Authenticated y anon: sin acceso desde frontend
-- (Anti info-leak: el solicitante NO ve su propia fila desde el cliente)
```

### `audit_log`

```sql
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Solo service_role lee y escribe
-- Authenticated y anon: sin acceso
```

## Diagrama de relaciones

```text
auth.users (Supabase) ──1:1──> afiliados ────┐
                                              ├──> padron_cotizantes (snapshot al registrar)
                                              │
                                              └──> audit_log (eventos)

solicitudes_pendientes ──N:1──> afiliados (resolved_by, opcional)
```

## Lógica de validación (referencia rápida)

Resumen consolidado del comportamiento esperado de la Edge Function
`validar-padron` (contrato detallado en
`contracts/edge-validar-padron.json`):

```text
Input: DNI [+ legajo si flujo=activo]

Buscar fila en padron_cotizantes WHERE dni = ? [AND legajo = ? si flujo=activo]

Si NO existe fila:
  → audit_log: padron_validation_failure
  → response: { match: false, motivo: 'dni_no_en_padron' }
  (cliente continúa al sub-flujo pendiente_validacion)

Si existe fila:
  Si flujo='activo':
    Si afiliado_apops = true:
      → audit_log: padron_validation_success
      → response: { match: true, tipo: 'activo' }
    Si afiliado_apops = false:
      → audit_log: padron_validation_no_afiliacion
      → response: { match: false, motivo: 'sin_apops' }
      (cliente continúa al sub-flujo pendiente_validacion)
  Si flujo='sin_legajo':
    Si cotiza_papel = true:
      → audit_log: padron_validation_success
      → response: { match: true, tipo: 'jubilado' }
    Si cotiza_papel = false:
      → audit_log: padron_validation_no_afiliacion
      → response: { match: false, motivo: 'sin_papel' }
      (cliente continúa al sub-flujo pendiente_validacion sin_legajo)
```

## Constraints transversales (defense in depth)

- **Email único en `auth.users`**: Supabase enforza. En
  `solicitudes_pendientes` permitimos email duplicado intencionalmente
  (la misma persona puede reintentar mientras tiene una pendiente).
- **DNI único en `afiliados`**: ningún afiliado validado puede ser
  duplicado. Conflictos en aprobación de pendiente (otro afiliado tiene
  ese DNI) se reportan al admin.
- **Constraint `chk_tipo_legajo` en `afiliados`**: evita inconsistencia
  entre `tipo` y presencia de `legajo`. Defense in depth contra bugs de
  aplicación.
