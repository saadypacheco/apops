-- Seed: datos de prueba para desarrollo local
-- Feature: 001-afiliado-auth
-- Created: 2026-05-01
--
-- Aplicación: este archivo lo ejecuta `supabase db reset` automáticamente
-- DESPUÉS de aplicar todas las migraciones. NO se aplica en producción.
--
-- Datos alineados con specs/001-afiliado-auth/quickstart.md sección
-- "Datos de prueba mínimos en padron_cotizantes". Cubren los 5 perfiles
-- que cada escenario del quickstart requiere.

-- Batch fijo para el seed (UUID v4 estable, fácil de identificar en logs)
-- 00000000-0000-4000-8000-000000000001 = "seed batch local dev"

-- =====================================================================
-- Perfil 1: Activos afiliados APOPS (Escenario 1 — happy path US1)
-- afiliado_apops = true, cotiza_papel = false
-- =====================================================================

INSERT INTO padron_cotizantes
  (dni, legajo, nombre, afiliado_apops, source_batch)
VALUES
  ('30000001', 'L-0001', 'Pérez, María',  true, '00000000-0000-4000-8000-000000000001'),
  ('30000002', 'L-0002', 'García, Juan',  true, '00000000-0000-4000-8000-000000000001');

-- =====================================================================
-- Perfil 2: Activo afiliado a OTRO gremio (Escenario 4b — pendiente)
-- afiliado_apops = false, afiliado_ate = true
-- =====================================================================

INSERT INTO padron_cotizantes
  (dni, legajo, nombre, afiliado_apops, afiliado_ate, source_batch)
VALUES
  ('30000003', 'L-0003', 'Martínez, Pablo', false, true,
   '00000000-0000-4000-8000-000000000001');

-- =====================================================================
-- Perfil 3: Jubilado afiliado APOPS por transferencia (Escenario 2 — happy path US2)
-- legajo NULL, cotiza_papel = true
-- =====================================================================

INSERT INTO padron_cotizantes
  (dni, nombre, cotiza_papel, source_batch)
VALUES
  ('20000001', 'Rodríguez, Ana', true,
   '00000000-0000-4000-8000-000000000001');

-- =====================================================================
-- Perfil 4: En padrón pero sin afiliación APOPS ni cotiza_papel
--           (Escenario 4b alternativo / pendiente sin gremio APOPS)
-- afiliado_apops = false, cotiza_papel = false (defaults)
-- =====================================================================

INSERT INTO padron_cotizantes
  (dni, nombre, source_batch)
VALUES
  ('20000002', 'Fernández, Luis',
   '00000000-0000-4000-8000-000000000001');

-- =====================================================================
-- DNIs reservados para tests de "DNI no en padrón" (NO insertarlos):
--   99999999  → Escenario 3 (sub-flujo activo, pendiente con legajo L-9999)
--   88888888  → Escenario 4 (sub-flujo sin_legajo, pendiente con nombre)
-- =====================================================================
