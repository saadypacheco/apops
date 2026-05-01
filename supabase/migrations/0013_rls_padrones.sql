-- Migration: 0013_rls_padrones
-- Feature: 001-afiliado-auth
-- Created: 2026-05-01
--
-- RLS lockdown total sobre padron_cotizantes.
-- Constitución V (Privacidad por diseño) + FR-015: el padrón nunca debe
-- exponerse al cliente, ni siquiera a usuarios authenticated. Solo
-- service_role (Edge Function validar-padron) puede leerlo.
--
-- Por defecto, una tabla con RLS habilitado y SIN policies deniega TODO
-- acceso a roles anon y authenticated. service_role bypassea RLS.

ALTER TABLE padron_cotizantes ENABLE ROW LEVEL SECURITY;

-- Sin policies para anon ni authenticated → sin acceso.
-- Cuando exista la feature de admin panel, agregará una policy
-- para rol 'admin' (read-only). Cuando exista la feature de ingesta,
-- usará service_role para INSERT/UPDATE.
