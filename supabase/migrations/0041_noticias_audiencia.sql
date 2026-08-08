-- Migration: 0041_noticias_audiencia
-- Created: 2026-08-07
--
-- El panel del delegado necesita contenido que el afiliado común no ve:
-- paritarias, material de afiliación, campañas. Hasta ahora toda noticia
-- publicada era visible para cualquiera.
--
-- Se agregan dos ejes independientes:
--   audiencia → QUIÉN la puede ver ('todos' | 'delegados')
--   tema      → CÓMO se agrupa en las pestañas de Comunicados

ALTER TABLE noticias
  ADD COLUMN audiencia text NOT NULL DEFAULT 'todos'
    CHECK (audiencia IN ('todos', 'delegados')),
  ADD COLUMN tema text NOT NULL DEFAULT 'general'
    CHECK (tema IN ('general', 'paritaria', 'material', 'campana'));

CREATE INDEX idx_noticias_audiencia
  ON noticias (audiencia, publicada_at DESC) WHERE publicada = true;

-- ─────────────────────────────────────────────────────────────────────
-- RLS: la policy vigente (0018) deja leer TODA noticia publicada a anon y
-- authenticated. Si la dejáramos así, el contenido marcado 'delegados'
-- se filtraría por la API pública apenas se cree la primera fila.
--
-- La reemplazamos por una que solo expone las de audiencia 'todos'. Las
-- exclusivas se sirven desde server actions con admin client, que ya
-- validan el rol en código (misma convención que el resto del proyecto).
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS noticias_public_read ON noticias;

CREATE POLICY noticias_public_read ON noticias
  FOR SELECT
  TO anon, authenticated
  USING (publicada = true AND audiencia = 'todos');

COMMENT ON COLUMN noticias.audiencia IS 'Quién ve la noticia. "delegados" NO es accesible por la API pública — solo via server action que valide rol.';
COMMENT ON COLUMN noticias.tema IS 'Agrupa las noticias en las pestañas del panel del delegado (Paritarias / Material / Campañas).';
