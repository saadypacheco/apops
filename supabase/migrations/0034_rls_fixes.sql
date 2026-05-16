-- Migration: 0034_rls_fixes
-- Feature: hardening de RLS post-suite de tests
-- Created: 2026-05-16
--
-- Dos fixes que surgieron al correr tests/rls/seguridad.test.ts:
--
-- HALLAZGO 1 (crítico): padron_cotizantes_actual estaba expuesta.
--   La migration 0028 creó la vista con GRANT SELECT ... TO anon,
--   authenticated. En Postgres ≤ 14 las vistas se evalúan con los
--   privilegios del owner, NO del que hace la query — esto bypasea
--   la RLS estricta de la tabla base padron_cotizantes. Cualquier
--   usuario autenticado podía leer todo el padrón (DNI, legajo,
--   gremio, etc.) directamente vía la vista.
--   Fix: REVOKE SELECT de anon y authenticated. Solo service_role
--   accede a la vista (desde server actions con admin client).
--
-- HALLAZGO 2: anon INSERT en solicitudes_afiliacion estaba bloqueado.
--   La policy original de migration 0020 existía pero algo en alguna
--   migration posterior la dejó inutilizable (drop accidental o
--   alteración del WITH CHECK). Re-creo la policy idempotentemente.
--   Fix: DROP IF EXISTS + CREATE para garantizar que el form público
--   /afiliarse funcione.

-- =====================================================================
-- 1. padron_cotizantes_actual: lockdown total para anon/authenticated
-- =====================================================================

REVOKE SELECT ON padron_cotizantes_actual FROM anon;
REVOKE SELECT ON padron_cotizantes_actual FROM authenticated;

-- service_role sigue teniendo acceso (las server actions con admin
-- client siguen funcionando igual). Otorgar explícitamente por las
-- dudas — en Supabase service_role ya bypasea, pero la vista necesita
-- GRANT separado de la RLS.
GRANT SELECT ON padron_cotizantes_actual TO service_role;

COMMENT ON VIEW padron_cotizantes_actual IS
  'Snapshot más reciente del padrón. SOLO service_role lee — las server actions usan admin client. anon/authenticated NO pueden leer esta vista (REVOKE en migration 0034 cerró un agujero detectado por tests RLS).';

-- =====================================================================
-- 2. solicitudes_afiliacion: re-asegurar que anon pueda INSERT
-- =====================================================================

DROP POLICY IF EXISTS solic_afil_anon_insert ON solicitudes_afiliacion;
DROP POLICY IF EXISTS "solic_afil_anon_insert" ON solicitudes_afiliacion;

CREATE POLICY solic_afil_anon_insert ON solicitudes_afiliacion
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

COMMENT ON POLICY solic_afil_anon_insert ON solicitudes_afiliacion IS
  'Permite a cualquier visitante anónimo enviar el formulario público de /afiliarse. SELECT/UPDATE/DELETE siguen siendo solo service_role. Re-creada en migration 0034 porque alguna migration intermedia la había perdido.';
