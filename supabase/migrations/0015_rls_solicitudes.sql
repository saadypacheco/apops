-- Migration: 0015_rls_solicitudes
-- Feature: 001-afiliado-auth
-- Created: 2026-05-01
--
-- RLS sobre solicitudes_pendientes: ningún rol authenticated/anon accede.
-- Solo service_role inserta y modifica (vía Edge Functions
-- solicitar-magic-link y resolver-pendiente).
--
-- Decisión deliberada (data-model.md §RLS): el solicitante NO ve su propia
-- fila desde el cliente. Anti info-leak — el estado de pendiente se
-- comunica via UI sin exponer la tabla.

ALTER TABLE solicitudes_pendientes ENABLE ROW LEVEL SECURITY;

-- Sin policies → sin acceso para anon/authenticated. service_role bypassea RLS.
