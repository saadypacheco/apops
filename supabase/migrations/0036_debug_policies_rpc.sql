-- Migration: 0036_debug_policies_rpc
-- Created: 2026-05-16
--
-- Función diagnóstica para inspeccionar policies desde script. Se puede
-- dejar (es read-only sobre pg_policies, no expone datos sensibles) o
-- dropear después con otra migration si te molesta.

CREATE OR REPLACE FUNCTION debug_policies(tname text)
RETURNS TABLE(
  policyname name,
  permissive text,
  roles name[],
  cmd text,
  qual text,
  with_check text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.policyname,
    p.permissive,
    p.roles,
    p.cmd,
    p.qual::text,
    p.with_check::text
  FROM pg_catalog.pg_policies p
  WHERE p.schemaname = 'public' AND p.tablename = tname;
$$;

GRANT EXECUTE ON FUNCTION debug_policies(text) TO service_role;

COMMENT ON FUNCTION debug_policies(text) IS
  'Listado de policies RLS de una tabla, accesible desde scripts admin. Solo service_role.';
