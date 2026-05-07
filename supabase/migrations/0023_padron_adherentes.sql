-- Migration: 0023_padron_adherentes
-- Feature: 004-credencial-digital
-- Created: 2026-05-05
--
-- Tabla `padron_adherentes`: familiares del afiliado titular cargados desde
-- una planilla externa (similar a `padron_cotizantes`). El vínculo con el
-- titular se hace por DNI o legajo (al menos uno requerido).
--
-- Esta feature solo LEE de esta tabla. El ingest queda fuera del scope
-- (igual que el padron principal — feature externa).

CREATE TABLE padron_adherentes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculo con titular: al menos uno requerido (CHECK abajo)
  titular_dni       text,
  titular_legajo    text,

  -- Datos del adherente
  nombre            text NOT NULL,
  dni               text,                          -- nullable (menores)
  vinculo           text NOT NULL CHECK (vinculo IN (
    'conyuge', 'hijo', 'hija', 'padre', 'madre',
    'hermano', 'hermana', 'otro'
  )),
  fecha_nacimiento  date,
  numero_afiliado   text,

  -- Contacto para reenvío
  email             text,
  telefono          text,                          -- formato libre, usar para wa.me

  -- Metadata de carga
  source_batch      uuid NOT NULL,
  ingestado_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_titular_id CHECK (
    titular_dni IS NOT NULL OR titular_legajo IS NOT NULL
  )
);

CREATE INDEX idx_adherentes_titular_dni
  ON padron_adherentes(titular_dni)
  WHERE titular_dni IS NOT NULL;

CREATE INDEX idx_adherentes_titular_legajo
  ON padron_adherentes(titular_legajo)
  WHERE titular_legajo IS NOT NULL;

-- =====================================================================
-- RLS: el titular logueado lee sus adherentes (matching por dni o legajo).
-- service_role bypassea (usado por la página pública /credencial-publica).
-- =====================================================================

ALTER TABLE padron_adherentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "titular lee sus adherentes"
  ON padron_adherentes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM afiliados a
      WHERE a.auth_user_id = auth.uid()
        AND (
          (padron_adherentes.titular_dni IS NOT NULL AND padron_adherentes.titular_dni = a.dni)
          OR
          (padron_adherentes.titular_legajo IS NOT NULL AND padron_adherentes.titular_legajo = a.legajo)
        )
    )
  );

-- =====================================================================
-- Seed de prueba: 4 adherentes para los DNIs del seed existente.
-- (En producción esto lo carga una feature de ingest separada.)
-- =====================================================================

INSERT INTO padron_adherentes
  (titular_dni, titular_legajo, nombre, dni, vinculo, fecha_nacimiento,
   numero_afiliado, email, telefono, source_batch)
VALUES
  -- Adherentes de Pérez, María (DNI 30000001 / L-0001)
  ('30000001', 'L-0001', 'Pérez, Carlos', '32000001', 'conyuge',
   '1980-03-15', 'AD-30000001-01', 'carlos.perez@test.local',
   '5491155123456', '00000000-0000-4000-9000-000000000001'),

  ('30000001', 'L-0001', 'Pérez, Juan', '45000001', 'hijo',
   '2010-06-22', 'AD-30000001-02', 'juan.perez@test.local',
   '5491155123457', '00000000-0000-4000-9000-000000000001'),

  ('30000001', 'L-0001', 'Pérez, Laura', NULL, 'hija',
   '2018-11-08', 'AD-30000001-03', NULL, NULL,
   '00000000-0000-4000-9000-000000000001'),

  -- Adherente de Rodríguez, Ana (DNI 20000001, jubilada sin legajo)
  ('20000001', NULL, 'Rodríguez, Mario', '22000001', 'conyuge',
   '1955-04-10', 'AD-20000001-01', 'mario.r@test.local',
   '5491155123458', '00000000-0000-4000-9000-000000000001');
