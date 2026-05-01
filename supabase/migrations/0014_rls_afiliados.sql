-- Migration: 0014_rls_afiliados
-- Feature: 001-afiliado-auth
-- Created: 2026-05-01
--
-- RLS sobre afiliados: cada afiliado solo lee su propia fila.
-- INSERT y DELETE quedan exclusivos para service_role (Edge Functions).
-- UPDATE: por ahora ningún rol authenticated puede modificar; cambios de
-- email pasan por Supabase Auth, no por update directo a esta tabla.

ALTER TABLE afiliados ENABLE ROW LEVEL SECURITY;

-- Cada afiliado lee solo su propia fila
CREATE POLICY afiliados_self_select ON afiliados
  FOR SELECT
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

-- Sin policies para anon → sin acceso
-- Sin policies de INSERT/UPDATE/DELETE para authenticated → solo service_role
