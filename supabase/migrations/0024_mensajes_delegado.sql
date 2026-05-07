-- Migration: 0024_mensajes_delegado
-- Feature: panel delegados — mensajería interna
-- Created: 2026-05-06
--
-- Buzón unidireccional delegado → CD. El delegado escribe; cualquier admin
-- (la "casilla colectiva" de la CD) los recibe en /admin/mensajes y puede
-- marcarlos como leídos. La respuesta sucede por fuera (WhatsApp / email),
-- al menos en esta primera iteración.
--
-- RLS estricta (deny por default). Todo el acceso desde la app va por
-- server actions con admin client (service_role). Las policies sirven como
-- defense in depth.

CREATE TABLE mensajes_delegado (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegado_id     uuid NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,

  asunto          text NOT NULL CHECK (char_length(asunto) BETWEEN 3 AND 200),
  mensaje         text NOT NULL CHECK (char_length(mensaje) BETWEEN 5 AND 2000),

  leido           boolean NOT NULL DEFAULT false,
  leido_por       uuid REFERENCES afiliados(id) ON DELETE SET NULL,
  leido_at        timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Coherencia: leido true ↔ leido_por y leido_at no null
  CONSTRAINT chk_leido_consistency CHECK (
    (leido = false AND leido_por IS NULL AND leido_at IS NULL)
    OR
    (leido = true  AND leido_por IS NOT NULL AND leido_at IS NOT NULL)
  )
);

CREATE INDEX idx_mensajes_delegado_id ON mensajes_delegado(delegado_id, created_at DESC);
CREATE INDEX idx_mensajes_no_leidos   ON mensajes_delegado(created_at DESC)
  WHERE leido = false;

ALTER TABLE mensajes_delegado ENABLE ROW LEVEL SECURITY;

-- INSERT/SELECT/UPDATE: deny by default. Solo service_role bypassea.
-- Todas las operaciones desde la app van por server actions con admin client.
