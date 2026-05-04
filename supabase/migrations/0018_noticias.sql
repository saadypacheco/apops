-- Migration: 0018_noticias
-- Feature: 002-noticias-y-roles
-- Created: 2026-05-04
--
-- Tabla pública de noticias del sindicato + columna rol en afiliados para
-- ruteo post-login diferenciado (afiliado / delegado / admin).
--
-- Las noticias son LECTURA PÚBLICA (anon y authenticated) cuando publicada=true.
-- El admin gestiona via service_role o (futuro) via rol='admin' en afiliados.

CREATE TABLE noticias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL CHECK (char_length(titulo) BETWEEN 5 AND 200),
  resumen       text NOT NULL CHECK (char_length(resumen) BETWEEN 10 AND 500),
  contenido     text,
  imagen_url    text,
  destacada     boolean NOT NULL DEFAULT false,
  publicada     boolean NOT NULL DEFAULT true,
  publicada_at  timestamptz NOT NULL DEFAULT now(),
  autor         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_noticias_publicadas ON noticias(publicada_at DESC) WHERE publicada = true;
CREATE INDEX idx_noticias_destacadas ON noticias(publicada_at DESC) WHERE publicada = true AND destacada = true;

ALTER TABLE noticias ENABLE ROW LEVEL SECURITY;

-- Lectura pública de noticias publicadas (landing requiere acceso anon)
CREATE POLICY noticias_public_read ON noticias
  FOR SELECT
  TO anon, authenticated
  USING (publicada = true);

-- INSERT/UPDATE/DELETE solo via service_role por ahora.
-- Cuando se agregue panel admin con rol='admin', se agregarán policies.

-- ─────────────────────────────────────────────────────────────────────
-- Rol de afiliado para ruteo post-login
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE afiliados
  ADD COLUMN rol text NOT NULL DEFAULT 'afiliado'
    CHECK (rol IN ('afiliado','delegado','admin'));

CREATE INDEX idx_afiliados_rol ON afiliados(rol) WHERE rol != 'afiliado';

COMMENT ON COLUMN afiliados.rol IS 'Rol del afiliado en la app. Determina ruteo post-login y permisos. Default: afiliado. Promoción a delegado/admin via SQL directo (futuro: panel admin).';
