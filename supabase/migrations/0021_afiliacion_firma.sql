-- Migration: 0021_afiliacion_firma
-- Feature: 003-afiliacion-online
-- Created: 2026-05-04
--
-- Agrega columna `firma_png` a solicitudes_afiliacion para guardar la firma
-- del solicitante como data URL base64 del PNG generado por el canvas pad.
--
-- Tamaño esperado: ~5-30 KB por firma (canvas 600x200, PNG comprimido).
-- Inline en la tabla por simplicidad. Si crece demasiado, migrar a Storage.
--
-- Tabla está vacía al momento de esta migration (verificado), así que
-- podemos agregar NOT NULL sin necesidad de backfill.

ALTER TABLE solicitudes_afiliacion
  ADD COLUMN firma_png text NOT NULL
    CHECK (char_length(firma_png) > 100);
