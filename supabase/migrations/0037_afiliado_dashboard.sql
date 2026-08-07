-- Migration: 0037_afiliado_dashboard
-- Created: 2026-08-06
--
-- Soporte para el rediseño del home del afiliado (dashboard con cards):
--   - categoría en noticias para poder distinguir comunicados de
--     contenido de "beneficios" (informativo, no comercial).
--   - link al grupo de WhatsApp del delegado, que cada delegado
--     configura desde su propio perfil, para que el afiliado pueda
--     "Hablar con delegado" desde el home.

ALTER TABLE noticias
  ADD COLUMN categoria text NOT NULL DEFAULT 'novedad'
    CHECK (categoria IN ('novedad', 'beneficio'));

CREATE INDEX idx_noticias_beneficios ON noticias(publicada_at DESC)
  WHERE publicada = true AND categoria = 'beneficio';

ALTER TABLE afiliados ADD COLUMN whatsapp_grupo_link text;

COMMENT ON COLUMN afiliados.whatsapp_grupo_link IS 'Link al grupo de WhatsApp del delegado (chat.whatsapp.com/... o wa.me/...). Configurable desde /perfil solo si rol=delegado. NULL si no lo configuró.';
