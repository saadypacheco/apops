-- Migration: 0020_solicitudes_afiliacion
-- Feature: 003-afiliacion-online
-- Created: 2026-05-04
--
-- Tabla para que cualquier persona (anon) envíe la ficha de afiliación
-- al gremio. El admin la procesa manualmente — futuro: panel admin para
-- aprobar/contactar.
--
-- RLS: anon puede INSERT (formulario público); SELECT/UPDATE solo
-- service_role o admin (futuro panel).

CREATE TABLE solicitudes_afiliacion (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos personales (la mayoría obligatorios per ficha PDF)
  apellido_nombre      text NOT NULL CHECK (char_length(apellido_nombre) BETWEEN 3 AND 200),
  tipo_documento       text NOT NULL CHECK (tipo_documento IN ('DNI','LE','LC','CI','PASAPORTE')),
  numero_documento     text NOT NULL CHECK (numero_documento ~ '^[0-9]{6,12}$'),
  fecha_nacimiento     date NOT NULL,
  estado_civil         text CHECK (estado_civil IN ('soltero','casado','conviviente','divorciado','viudo','otro') OR estado_civil IS NULL),

  -- Domicilio
  domicilio_calle      text,
  domicilio_numero     text,
  domicilio_piso       text,
  domicilio_depto      text,
  domicilio_localidad  text,
  domicilio_provincia  text,
  domicilio_cp         text,

  -- Contacto
  telefono             text NOT NULL,
  celular              text NOT NULL,
  email                text NOT NULL CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  cbu                  text CHECK (cbu IS NULL OR cbu ~ '^[0-9]{22}$'),

  -- Lugar de trabajo
  numero_legajo        text NOT NULL,
  edificio_udai        text,
  trabajo_localidad    text,
  trabajo_domicilio    text,
  trabajo_telefono     text,
  trabajo_email        text CHECK (trabajo_email IS NULL OR trabajo_email ~ '^[^@]+@[^@]+\.[^@]+$'),
  gerencia             text,
  area_udai            text,
  cargo_funcion        text,
  categoria            text,
  tipo_planta          text NOT NULL CHECK (tipo_planta IN ('permanente','transitoria')),

  -- Familia (opcional, JSON para flexibilidad)
  conyuge              jsonb,         -- { apellidoNombre, tipoDoc, numeroDoc, fechaNac }
  familiares           jsonb,         -- [ { apellidoNombre, tipoDoc, numeroDoc, fechaNac, parentesco } ]

  -- Consentimiento (autorización descuento 3% al sueldo)
  acepta_descuento     boolean NOT NULL DEFAULT false CHECK (acepta_descuento = true),

  -- Workflow
  estado               text NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente','en_revision','aprobada','rechazada')),
  motivo_rechazo       text,
  procesado_at         timestamptz,
  procesado_por        uuid REFERENCES afiliados(id) ON DELETE SET NULL,

  -- Metadata
  ip_address           inet,
  user_agent           text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_solic_afil_estado ON solicitudes_afiliacion(estado, created_at DESC);
CREATE INDEX idx_solic_afil_dni    ON solicitudes_afiliacion(numero_documento);
CREATE INDEX idx_solic_afil_legajo ON solicitudes_afiliacion(numero_legajo);

ALTER TABLE solicitudes_afiliacion ENABLE ROW LEVEL SECURITY;

-- Anon puede INSERT (formulario público de afiliación)
CREATE POLICY solic_afil_anon_insert ON solicitudes_afiliacion
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT/UPDATE/DELETE solo service_role (futuro panel admin agregará policy
-- para rol='admin').
