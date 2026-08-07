-- Migration: 0038_edificios_whatsapp
-- Created: 2026-08-06
--
-- Corrige el modelo del link al grupo de WhatsApp introducido en 0037.
--
-- El grupo de WhatsApp es del EDIFICIO, no de un delegado: un edificio
-- puede tener varios delegados y todos comparten el mismo grupo. Con el
-- campo por delegado (0037) cada uno cargaba su propio link y el afiliado
-- veía uno u otro según con quién matcheara — inconsistente.
--
-- Acá el link vive una sola vez por edificio. Cualquier delegado de ese
-- edificio lo puede cargar o reemplazar; queda registrado quién fue el
-- último en tocarlo.
--
-- El edificio se identifica por su nombre tal como viene del padrón
-- (`lugar_trabajo_padron`, con fallback a `lugar_trabajo_rrhh`). No hay
-- tabla de edificios normalizada — el padrón ANSES es la fuente y el
-- nombre es texto libre. Guardamos el nombre tal cual, y el matching se
-- hace normalizado en código (igual que delegados/queries.ts).

CREATE TABLE edificios_whatsapp (
  edificio      text PRIMARY KEY,
  link          text NOT NULL,
  cargado_por   uuid REFERENCES afiliados(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE edificios_whatsapp IS 'Link al grupo de WhatsApp de cada edificio. Uno por edificio, compartido por todos sus delegados y visible para los afiliados que trabajan ahí.';
COMMENT ON COLUMN edificios_whatsapp.edificio IS 'Nombre del edificio tal como viene del padrón (lugar_trabajo_padron). Texto libre — el matching se normaliza en código.';
COMMENT ON COLUMN edificios_whatsapp.cargado_por IS 'Último delegado que cargó o actualizó el link. Informativo.';

ALTER TABLE edificios_whatsapp ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: sin policies, solo service_role accede. Las server
-- actions usan admin client y validan permisos en código (convención
-- del proyecto).

-- El campo por delegado de 0037 queda obsoleto.
ALTER TABLE afiliados DROP COLUMN IF EXISTS whatsapp_grupo_link;
