-- Migration: 0009_padron_cotizantes_stub
-- Feature: 001-afiliado-auth
-- Created: 2026-05-01
--
-- STUB: reemplazar por migración oficial de feature precursora 'padron-ingesta'.
-- Esta tabla NO la crea esta feature en producción. La crea la feature de
-- ingesta de padrón. Acá vive un stub funcional para que el flujo de auth
-- pueda desarrollarse y testearse end-to-end sin esperar la otra feature.
--
-- Schema según data-model.md sección "Tabla precursora — padron_cotizantes".

CREATE TABLE padron_cotizantes (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación (críticos para auth, NOT NULL)
  dni                             text UNIQUE NOT NULL CHECK (dni ~ '^[0-9]{7,8}$'),
  nombre                          text NOT NULL,

  -- Identificación adicional (nullable: jubilados pueden no tener legajo)
  legajo                          text,
  cuil                            text,

  -- Fechas (nullable — vienen huecas del Excel)
  fecha_ingreso                   date,
  fecha_nacimiento                date,
  sexo                            text CHECK (sexo IN ('Varón','Mujer','Otro') OR sexo IS NULL),

  -- Lugar de trabajo (nullable, contradictorio entre fuentes)
  lugar_trabajo_rrhh              text,
  unidad_organica_historica       text,
  lugar_trabajo_padron            text,
  lugar_trabajo_relevamiento      text,
  descripcion_lugar_relevamiento  text,
  fecha_actualizacion_delegados   timestamptz,

  -- Categoría y planta
  categoria                       smallint,
  tipo_planta                     text,

  -- Gremios — flags x del Excel (críticos para auth APOPS)
  afiliado_apops                  boolean NOT NULL DEFAULT false,
  cotiza_papel                    boolean NOT NULL DEFAULT false,

  -- Otros gremios (informativos)
  afiliado_ate                    boolean NOT NULL DEFAULT false,
  afiliado_sec                    boolean NOT NULL DEFAULT false,
  afiliado_upcn                   boolean NOT NULL DEFAULT false,
  afiliado_secasfpi               boolean NOT NULL DEFAULT false,

  afiliado_nuevo                  boolean NOT NULL DEFAULT false,

  -- Datos de delegado (nullable)
  representante                   text,
  periodo_mandato                 text,
  vence_mandato_30dias            boolean,

  -- Geo
  provincia                       text,
  regional                        text,

  -- Metadata de carga
  source_batch                    uuid NOT NULL,
  ingestado_at                    timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance del flujo de validación
CREATE INDEX idx_padron_dni ON padron_cotizantes(dni);
CREATE INDEX idx_padron_legajo ON padron_cotizantes(legajo) WHERE legajo IS NOT NULL;

-- Índices parciales para flags críticos de auth
CREATE INDEX idx_padron_apops ON padron_cotizantes(dni) WHERE afiliado_apops = true;
CREATE INDEX idx_padron_cotiza_papel ON padron_cotizantes(dni) WHERE cotiza_papel = true;

-- Legajo único cuando no es null
CREATE UNIQUE INDEX uq_padron_legajo ON padron_cotizantes(legajo) WHERE legajo IS NOT NULL;
