-- Migration: 0016_rls_audit
-- Feature: 001-afiliado-auth
-- Created: 2026-05-01
--
-- RLS sobre audit_log: lockdown total. Solo service_role lee y escribe.
-- Constitución V — el audit trail es interno, no expuesto a usuarios.

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Sin policies → sin acceso para anon/authenticated. service_role bypassea RLS.
