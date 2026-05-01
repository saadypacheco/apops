-- Migration: 0010_afiliados
-- Feature: 001-afiliado-auth
-- Created: 2026-05-01
--
-- Tabla afiliados: persona registrada en la app, vinculada 1:1 con auth.users.
-- Solo se crea cuando la validación contra padrón fue exitosa.
-- Schema según data-model.md sección "Tabla 1 — afiliados".

CREATE TABLE afiliados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dni             text UNIQUE NOT NULL CHECK (dni ~ '^[0-9]{7,8}$'),
  legajo          text UNIQUE,
  nombre          text NOT NULL,
  tipo            text NOT NULL CHECK (tipo IN ('activo','jubilado')),
  estado          text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','baja')),
  padron_id       uuid REFERENCES padron_cotizantes(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz,

  -- Defense in depth: activos requieren legajo; jubilados no pueden tener legajo
  CONSTRAINT chk_tipo_legajo CHECK (
    (tipo = 'activo' AND legajo IS NOT NULL)
    OR
    (tipo = 'jubilado' AND legajo IS NULL)
  )
);

CREATE INDEX idx_afiliados_dni ON afiliados(dni);
CREATE INDEX idx_afiliados_tipo ON afiliados(tipo);
