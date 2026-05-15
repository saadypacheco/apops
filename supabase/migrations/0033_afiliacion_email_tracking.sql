-- Migration: 0033_afiliacion_email_tracking
-- Feature: notificación por email al recibir solicitud de afiliación
-- Created: 2026-05-15
--
-- Agrega columnas para registrar a quién y cuándo se envió el mail con
-- el PDF firmado de la ficha de afiliación. Audit trail útil para
-- debugging y para mostrar al aspirante en la página de éxito.
--
-- Si Resend está mal configurado o la API falla, los envíos se saltean
-- y estas columnas quedan en NULL — la solicitud igual se guarda.

ALTER TABLE solicitudes_afiliacion
  ADD COLUMN email_aspirante_enviado_at timestamptz,
  ADD COLUMN email_apops_enviado_at     timestamptz,
  ADD COLUMN email_delegado_enviado_at  timestamptz,
  ADD COLUMN email_delegado_destinos    text[],
  ADD COLUMN email_error                text;

COMMENT ON COLUMN solicitudes_afiliacion.email_aspirante_enviado_at IS
  'Timestamp del envío del acuse de recibo + PDF al email del aspirante.';
COMMENT ON COLUMN solicitudes_afiliacion.email_apops_enviado_at IS
  'Timestamp del envío de la solicitud a apops@apops.org.ar con PDF adjunto.';
COMMENT ON COLUMN solicitudes_afiliacion.email_delegado_enviado_at IS
  'Timestamp del envío al/los delegado(s) del edificio declarado, si hubo.';
COMMENT ON COLUMN solicitudes_afiliacion.email_delegado_destinos IS
  'Lista de emails de delegados a los que se envió copia.';
COMMENT ON COLUMN solicitudes_afiliacion.email_error IS
  'Si alguno de los envíos falló, mensaje de error para diagnóstico.';
