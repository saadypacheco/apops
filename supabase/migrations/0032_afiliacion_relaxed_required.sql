-- Migration: 0032_afiliacion_relaxed_required
-- Feature: refactor formulario de afiliación
-- Created: 2026-05-15
--
-- Afloja NOT NULL en columnas que pasan a ser opcionales en el form
-- público (/afiliarse). El admin las completa al procesar la solicitud
-- (matcheando contra padrón ANSES) cuando faltan.
--
-- Columnas afectadas:
--   - telefono          → opcional (se mantiene solo celular como contacto)
--   - fecha_nacimiento  → opcional (puede salir del padrón al matchear)
--   - tipo_planta       → opcional (sale del padrón / lo completa el admin)
--
-- La columna telefono se mantiene en el esquema para no romper data
-- histórica de solicitudes ya enviadas. Si en el futuro confirmamos que
-- no se necesita, podemos hacer un DROP COLUMN en una migration aparte.

ALTER TABLE solicitudes_afiliacion ALTER COLUMN telefono         DROP NOT NULL;
ALTER TABLE solicitudes_afiliacion ALTER COLUMN fecha_nacimiento DROP NOT NULL;
ALTER TABLE solicitudes_afiliacion ALTER COLUMN tipo_planta      DROP NOT NULL;
