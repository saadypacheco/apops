-- Migration: 0011_solicitudes_pendientes
-- Feature: 001-afiliado-auth
-- Created: 2026-05-01
--
-- Tabla solicitudes_pendientes: personas que intentaron registrarse pero
-- quedaron sin afiliación APOPS confirmada. Causas: DNI no en padrón, o DNI
-- en padrón pero sin flag APOPS=x ni cotiza_papel=x.
-- Schema según data-model.md sección "Tabla 2 — solicitudes_pendientes".

CREATE TABLE solicitudes_pendientes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dni               text NOT NULL CHECK (dni ~ '^[0-9]{7,8}$'),
  email             text NOT NULL CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  sub_flujo         text NOT NULL CHECK (sub_flujo IN ('activo','sin_legajo')),
  legajo            text,
  nombre_completo   text,
  motivo_pendiente  text NOT NULL CHECK (motivo_pendiente IN (
    'dni_no_en_padron',
    'sin_flag_apops_y_sin_papel',
    'otros'
  )),
  estado            text NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','aprobada','rechazada')),
  motivo_rechazo    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz,
  resolved_by       uuid REFERENCES afiliados(id) ON DELETE SET NULL,

  -- Sub-flujo activo lleva legajo; sub-flujo sin_legajo lleva nombre_completo
  CONSTRAINT chk_subflujo_data CHECK (
    (sub_flujo = 'activo' AND legajo IS NOT NULL AND nombre_completo IS NULL)
    OR
    (sub_flujo = 'sin_legajo' AND legajo IS NULL AND nombre_completo IS NOT NULL)
  ),

  -- Consistencia de los campos de resolución según estado
  CONSTRAINT chk_resolved_consistency CHECK (
    (estado = 'pendiente' AND resolved_at IS NULL AND resolved_by IS NULL
       AND motivo_rechazo IS NULL)
    OR
    (estado = 'aprobada' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL
       AND motivo_rechazo IS NULL)
    OR
    (estado = 'rechazada' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL
       AND motivo_rechazo IS NOT NULL)
  )
);

CREATE INDEX idx_solicitudes_estado ON solicitudes_pendientes(estado);
CREATE INDEX idx_solicitudes_dni ON solicitudes_pendientes(dni);
CREATE INDEX idx_solicitudes_motivo ON solicitudes_pendientes(motivo_pendiente);
CREATE INDEX idx_solicitudes_created ON solicitudes_pendientes(created_at DESC);
