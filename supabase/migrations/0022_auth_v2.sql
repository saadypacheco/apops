-- Migration: 0022_auth_v2
-- Feature: 001-afiliado-auth (iteración v2)
-- Created: 2026-05-05
--
-- Suma password como método alternativo de auth (el magic link sigue vigente).
-- Detalles de las decisiones: specs/001-afiliado-auth/auth-v2.md
--
-- Cambios:
--   1. afiliados.estado: amplía a ('activo','bloqueado','baja')
--   2. afiliados.email: nueva columna desnormalizada (sync con auth.users.email)
--   3. afiliados.origen: trazabilidad de cómo se creó la cuenta
--   4. afiliados.tiene_password: flag de conveniencia
--   5. afiliados.bloqueado_hasta + bloqueado_motivo: bloqueo temporal
--   6. Tabla auth_attempts: rate limit + auditoría de intentos
--
-- Precondición: tabla afiliados está vacía al momento de esta migración
-- (no hay usuarios en producción). Los ADD COLUMN NOT NULL no requieren
-- backfill.

-- =====================================================================
-- 1. Estados ampliados
-- =====================================================================

ALTER TABLE afiliados DROP CONSTRAINT afiliados_estado_check;

ALTER TABLE afiliados
  ADD CONSTRAINT afiliados_estado_check
    CHECK (estado IN ('activo', 'bloqueado', 'baja'));

-- =====================================================================
-- 2. Columnas nuevas en afiliados
-- =====================================================================

ALTER TABLE afiliados
  ADD COLUMN email text NOT NULL
    CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  ADD COLUMN origen text NOT NULL DEFAULT 'padron'
    CHECK (origen IN ('padron', 'solicitud_acceso', 'solicitud_afiliacion')),
  ADD COLUMN tiene_password boolean NOT NULL DEFAULT false,
  ADD COLUMN bloqueado_hasta timestamptz,
  ADD COLUMN bloqueado_motivo text;

-- Email único — protege la columna desnormalizada
-- (auth.users.email también es UNIQUE; este index defiende la copia local)
CREATE UNIQUE INDEX uq_afiliados_email ON afiliados(email);

-- Bloqueo: si hay motivo, hay timestamp; si hay timestamp, hay motivo
ALTER TABLE afiliados
  ADD CONSTRAINT chk_bloqueo_consistency CHECK (
    (bloqueado_hasta IS NULL AND bloqueado_motivo IS NULL)
    OR
    (bloqueado_hasta IS NOT NULL AND bloqueado_motivo IS NOT NULL)
  );

-- =====================================================================
-- 3. Tabla auth_attempts — rate limit y auditoría granular
-- =====================================================================

CREATE TABLE auth_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   text NOT NULL,                     -- DNI o legajo normalizado (lower, sin espacios)
  ip_address   inet,                              -- nullable: puede no estar disponible en SSR
  intentado_at timestamptz NOT NULL DEFAULT now(),
  exitoso      boolean NOT NULL,
  metodo       text NOT NULL CHECK (metodo IN ('password', 'magic_link'))
);

-- Index para checkRateLimit() — busca últimos N intentos por identifier o IP
CREATE INDEX idx_attempts_identifier_ts
  ON auth_attempts(identifier, intentado_at DESC);

CREATE INDEX idx_attempts_ip_ts
  ON auth_attempts(ip_address, intentado_at DESC)
  WHERE ip_address IS NOT NULL;

-- RLS: tabla interna, solo accesible por service_role.
-- ENABLE sin policies = deny por default para anon/authenticated.
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. Comentarios para developers que lleguen después
-- =====================================================================

COMMENT ON COLUMN afiliados.email IS
  'Email del afiliado. Desnormalizado de auth.users.email — mantener en sync vía server actions únicamente.';

COMMENT ON COLUMN afiliados.tiene_password IS
  'Flag de conveniencia. true cuando el usuario seteó una contraseña explícita. false = solo magic link.';

COMMENT ON COLUMN afiliados.bloqueado_hasta IS
  'Si > now(), el afiliado no puede iniciar sesión. Limpiado automáticamente cuando vence o por admin.';

COMMENT ON TABLE auth_attempts IS
  'Registro granular de intentos de login. Usado por el rate limiter (5 intentos / 15min) y para auditoría. La auditoría de alto nivel (login_success, login_failure) sigue en audit_log.';
