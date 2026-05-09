-- Migration: 0027_notificaciones
-- Created: 2026-05-08
--
-- Sistema de notificaciones bidireccional entre afiliados/delegados/admins.
-- Modelo: hilos 1-a-1 paralelos.
--
-- Cuando un usuario A envía a [B, C, D] se crean 3 hilos independientes
-- (A↔B, A↔C, A↔D). Si B responde, su mensaje queda solo en el hilo A↔B —
-- C y D no se enteran. Privacidad por defecto.
--
-- RLS deny-by-default. Todo el acceso desde la app va por server actions
-- con admin client (service_role). Las policies sirven como defense in depth.

CREATE TABLE hilos_notificacion (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id            uuid NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,
  destinatario_id     uuid NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,

  asunto              text NOT NULL CHECK (char_length(asunto) BETWEEN 3 AND 200),

  ultimo_mensaje_at   timestamptz NOT NULL DEFAULT now(),

  -- Estado de lectura por cada lado del hilo
  leido_destinatario  boolean NOT NULL DEFAULT false,
  -- El autor "ya vio" su propio mensaje al crearlo. Pasa a false cuando
  -- el destinatario responde (entonces el autor tiene algo nuevo que ver).
  leido_autor         boolean NOT NULL DEFAULT true,

  created_at          timestamptz NOT NULL DEFAULT now(),

  -- Defense in depth: un hilo necesita 2 personas distintas
  CONSTRAINT chk_autor_distinto_destinatario CHECK (autor_id <> destinatario_id)
);

CREATE INDEX idx_hilos_destinatario
  ON hilos_notificacion(destinatario_id, ultimo_mensaje_at DESC);
CREATE INDEX idx_hilos_autor
  ON hilos_notificacion(autor_id, ultimo_mensaje_at DESC);
CREATE INDEX idx_hilos_no_leidos_dest
  ON hilos_notificacion(destinatario_id)
  WHERE leido_destinatario = false;
CREATE INDEX idx_hilos_no_leidos_autor
  ON hilos_notificacion(autor_id)
  WHERE leido_autor = false;

-- ─────────────────────────────────────────────────────────────────────
-- Mensajes individuales del hilo (la conversación)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE mensajes_notificacion (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hilo_id     uuid NOT NULL REFERENCES hilos_notificacion(id) ON DELETE CASCADE,
  autor_id    uuid NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,
  mensaje     text NOT NULL CHECK (char_length(mensaje) BETWEEN 1 AND 5000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensajes_hilo
  ON mensajes_notificacion(hilo_id, created_at);

-- ─────────────────────────────────────────────────────────────────────
-- RLS deny-by-default. Service_role bypassea.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE hilos_notificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_notificacion ENABLE ROW LEVEL SECURITY;
