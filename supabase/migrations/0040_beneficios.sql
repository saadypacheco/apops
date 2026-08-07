-- Migration: 0040_beneficios
-- Created: 2026-08-07
--
-- Catálogo de beneficios del gremio — el "hub de servicios" del afiliado.
-- Reemplaza el enfoque provisorio de la migration 0037, que marcaba
-- noticias con categoria='beneficio': un beneficio no es una noticia
-- (no caduca, no tiene fecha de publicación relevante, sí tiene monto,
-- requisitos y un link a dónde tramitarlo).
--
-- El contenido inicial replica los beneficios vigentes publicados en
-- apops.org.ar/beneficios. El admin los gestiona desde /admin/beneficios.
--
-- "Capacitaciones" entra como una categoría más de este catálogo en vez
-- de ocupar un tab propio: la barra inferior ya tiene 5 ítems, que es el
-- máximo cómodo en mobile.

CREATE TABLE beneficios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 120),
  resumen       text NOT NULL CHECK (char_length(resumen) BETWEEN 10 AND 400),
  -- Texto largo con requisitos y cómo tramitarlo. Opcional: varios
  -- beneficios se resuelven con el resumen + el link al sitio.
  detalle       text,
  categoria     text NOT NULL DEFAULT 'otro'
    CHECK (categoria IN (
      'subsidio',      -- matrimonio, nacimiento, bodas de plata
      'salud',         -- óptica, orientación psicológica, farmacias
      'recreacion',    -- Sport Club, turismo
      'educacion',     -- kit escolar
      'legal',         -- asesoramiento
      'capacitacion',  -- cursos y formación
      'otro'
    )),
  -- Emoji que se muestra en la card. Evita depender de imágenes para que
  -- el listado cargue rápido en mobile.
  icono         text,
  imagen_url    text,
  -- A dónde se manda al afiliado para usar el beneficio. Hoy apuntan a
  -- apops.org.ar; el mapa de farmacias es el caso testigo.
  link_externo  text,
  -- Monto o valor destacado ("$400.000", "50% OFF"). Se muestra como pill.
  destaque      text,
  orden         integer NOT NULL DEFAULT 0,
  publicado     boolean NOT NULL DEFAULT true,
  -- Marca los que todavía no están disponibles (ej: capacitaciones).
  proximamente  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_beneficios_publicados
  ON beneficios (categoria, orden) WHERE publicado = true;

ALTER TABLE beneficios ENABLE ROW LEVEL SECURITY;

-- Lectura pública: los beneficios son argumento de afiliación, así que
-- también se muestran a quien todavía no es afiliado.
CREATE POLICY beneficios_public_read ON beneficios
  FOR SELECT
  TO anon, authenticated
  USING (publicado = true);

-- Escritura solo via service_role (server actions con admin client).

COMMENT ON TABLE beneficios IS 'Catálogo de beneficios del gremio. Gestionado desde /admin/beneficios, visible en /beneficios.';

-- ─────────────────────────────────────────────────────────────────────
-- Revertir el enfoque provisorio de 0037: los beneficios ya no son
-- noticias etiquetadas. Dejar ambas fuentes sería tener dos verdades
-- para lo mismo.
-- ─────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_noticias_beneficios;
ALTER TABLE noticias DROP COLUMN IF EXISTS categoria;
