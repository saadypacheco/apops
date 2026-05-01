-- Migration: 0012_audit_log
-- Feature: 001-afiliado-auth
-- Created: 2026-05-01
--
-- Tabla audit_log: eventos de seguridad/auditoría. Fuente para rate limiting
-- (research.md decisión 4) y para el cumplimiento de la Ley 25.326 (rastro
-- de operaciones sobre datos personales).
-- Schema según data-model.md sección "Tabla 3 — audit_log".

CREATE TABLE audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento          text NOT NULL CHECK (evento IN (
    'padron_validation_attempt',
    'padron_validation_success',
    'padron_validation_failure',
    'padron_validation_no_afiliacion',
    'magic_link_sent',
    'authentication_success',
    'authentication_failure',
    'logout',
    'pendiente_created',
    'pendiente_approved',
    'pendiente_rejected',
    'rate_limit_exceeded'
  )),
  afiliado_id     uuid REFERENCES afiliados(id) ON DELETE SET NULL,
  dni_intentado   text,
  ip_address      inet,
  user_agent      text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_evento ON audit_log(evento);
CREATE INDEX idx_audit_dni ON audit_log(dni_intentado);
CREATE INDEX idx_audit_ip ON audit_log(ip_address);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_dni_created ON audit_log(dni_intentado, created_at DESC);
CREATE INDEX idx_audit_ip_created ON audit_log(ip_address, created_at DESC);
