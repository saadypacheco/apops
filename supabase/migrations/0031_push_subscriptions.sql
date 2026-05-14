-- Migration: 0031_push_subscriptions
-- Created: 2026-05-14
--
-- Almacena subscripciones Web Push de cada afiliado por dispositivo.
-- Cada navegador genera una subscription única (endpoint + claves) cuando
-- el usuario acepta recibir notificaciones. Un mismo afiliado puede tener
-- varias subscriptions (celular + tablet + desktop).
--
-- Cuando se envía push, leemos todas las subscriptions del destinatario y
-- disparamos uno a cada endpoint. Si el endpoint responde 410 Gone (la
-- subscription caducó), borramos el row.

CREATE TABLE push_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id     uuid NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,

  -- Datos de la subscription (los manda el browser tras navigator.serviceWorker.pushManager.subscribe)
  endpoint        text NOT NULL,
  p256dh          text NOT NULL,   -- clave pública del cliente
  auth            text NOT NULL,   -- secret compartido para autenticación

  -- Metadata
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz NOT NULL DEFAULT now(),

  -- El mismo endpoint nunca debería repetirse (cada browser genera uno
  -- único). Si el usuario "reactiva" la subscription, hacemos upsert.
  CONSTRAINT uq_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_push_subs_afiliado
  ON push_subscriptions (afiliado_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: el dueño puede leer sus propias subs (para mostrar "tenés N dispositivos
-- activos"). Insert/update/delete via server action con service_role.

CREATE POLICY "afiliado lee sus subs"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (
    afiliado_id IN (
      SELECT id FROM afiliados WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON TABLE push_subscriptions IS
  'Subscripciones Web Push por afiliado x dispositivo. Un afiliado puede tener varias (celular, tablet, etc.). Cuando un endpoint devuelve 410 Gone, el server-side housekeeping borra el row.';
