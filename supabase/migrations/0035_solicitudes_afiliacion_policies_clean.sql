-- Migration: 0035_solicitudes_afiliacion_policies_clean
-- Created: 2026-05-16
--
-- La migration 0034 re-creó la policy solic_afil_anon_insert pero el
-- INSERT desde anon SIGUIÓ fallando con "violates row-level security
-- policy". Sospecha: hay una policy RESTRICTIVE residual de alguna
-- migration intermedia que pisa la PERMISSIVE.
--
-- Fix: limpiar TODAS las policies de solicitudes_afiliacion con un loop
-- DO $$$$ y recrearlas desde cero con el set correcto.

-- Limpieza completa
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'solicitudes_afiliacion'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.solicitudes_afiliacion',
      pol.policyname
    );
  END LOOP;
END $$;

-- Recrear el set correcto

-- 1. INSERT público para el formulario de /afiliarse
CREATE POLICY solic_afil_anon_insert ON solicitudes_afiliacion
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. SELECT/UPDATE/DELETE: solo service_role (sin policies para
--    authenticated → RLS deny-by-default los bloquea). Igual dejamos
--    constancia con un comentario.

COMMENT ON TABLE solicitudes_afiliacion IS
  'Solicitudes de afiliación enviadas desde el formulario público /afiliarse. RLS: anon/authenticated pueden INSERT (form público), pero ni leer ni modificar — solo service_role accede vía server actions del panel admin.';
