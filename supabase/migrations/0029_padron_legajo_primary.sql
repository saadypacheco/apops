-- Migration: 0029_padron_legajo_primary
-- Feature: 005-padron-ingesta (sub-fase A2)
-- Created: 2026-05-13
--
-- Confirmación de campo en el Excel real (ministerio.xlsx, JULIO 2016):
--   - 15558 filas totales, todas con LEGAJO no vacío.
--   - 19 filas con DNI vacío (0.12%) — errores de carga del sistema fuente.
--
-- Decisión de producto (cliente): legajo es el identificador primario del
-- padrón, DNI es informativo. El parser rechaza filas sin legajo; el DB
-- tolera filas sin DNI siempre que el formato sea válido cuando está.
--
-- Nota: la UNIQUE(dni) original fue dropeada en migration 0028 (reemplazada
-- por UNIQUE(dni, snapshot_id)). Postgres ignora NULLs en UNIQUE indexes,
-- así que múltiples filas con dni=NULL no conflictúan entre sí.

-- 1. Drop el CHECK original y reemplazar por uno que tolere NULL
ALTER TABLE padron_cotizantes
  DROP CONSTRAINT padron_cotizantes_dni_check;

-- 2. DNI pasa a nullable
ALTER TABLE padron_cotizantes
  ALTER COLUMN dni DROP NOT NULL;

-- 3. Nuevo CHECK: si hay DNI, debe ser 7-8 dígitos. Si no, OK.
ALTER TABLE padron_cotizantes
  ADD CONSTRAINT padron_cotizantes_dni_check
    CHECK (dni IS NULL OR dni ~ '^[0-9]{7,8}$');

COMMENT ON COLUMN padron_cotizantes.dni IS
  'DNI del cotizante. Nullable porque la fuente ANSES tiene casos con DNI faltante (~0.1%). El legajo es el identificador primario del padrón.';
