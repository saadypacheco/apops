-- Migration: 0028_padron_historico
-- Feature: 005-padron-ingesta + 006-dashboard-cd
-- Created: 2026-05-12
--
-- Habilita carga histórica del padrón: cada Excel mensual del ANSES queda
-- preservado como un snapshot independiente. Permite al dashboard de la
-- Comisión Directiva calcular altas reales, bajas reales, cambios de
-- delegado, cambios de categoría, etc. entre meses.
--
-- Cambios principales:
--   1. Tabla padron_snapshots — metadata de cada carga.
--   2. padron_cotizantes.UNIQUE(dni) → UNIQUE(dni, padron_snapshot_id).
--      El mismo cotizante aparece una vez por snapshot.
--   3. Vista padron_cotizantes_actual = snapshot más reciente cronológicamente.
--      Las queries del día-a-día apuntan acá. Solo el dashboard y el
--      importador tocan la tabla raw padron_cotizantes.
--   4. afiliados.fecha_baja nullable, con CHECK que la fuerza si estado='baja'.
--
-- Compatibilidad: las 5 ubicaciones en código que hacían
-- `from('padron_cotizantes')` deben migrar a `from('padron_cotizantes_actual')`.
-- Esa parte se hace en commit separado, post-aplicación de esta migration.

-- =====================================================================
-- 1. Snapshots: una fila por carga de Excel
-- =====================================================================

CREATE TABLE padron_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Período al que pertenece la carga. Extraído de la celda A1 del Excel
  -- (ej: "PADRON GENERAL - COTIZANTES DE JULIO 2016" → "JULIO 2016", 2016, 7).
  periodo_label       text NOT NULL,
  periodo_year        smallint NOT NULL
    CHECK (periodo_year BETWEEN 2000 AND 2100),
  periodo_month       smallint NOT NULL
    CHECK (periodo_month BETWEEN 1 AND 12),

  -- Auditoría
  importado_at        timestamptz NOT NULL DEFAULT now(),
  importado_por       uuid REFERENCES afiliados(id) ON DELETE SET NULL,
  archivo_nombre      text,

  -- Totales agregados, calculados durante la carga. Sirven al dashboard
  -- sin tener que escanear toda la tabla raw cada vez.
  total_filas         integer NOT NULL DEFAULT 0,
  total_apops         integer NOT NULL DEFAULT 0,
  total_ate           integer NOT NULL DEFAULT 0,
  total_upcn          integer NOT NULL DEFAULT 0,
  total_secasfpi      integer NOT NULL DEFAULT 0,
  total_planta_perm   integer NOT NULL DEFAULT 0,
  total_planta_trans  integer NOT NULL DEFAULT 0,
  total_papel         integer NOT NULL DEFAULT 0,
  total_delegados     integer NOT NULL DEFAULT 0,

  -- Un solo snapshot por período. Si se vuelve a cargar el Excel del mismo
  -- mes (corrección), la server action borra el viejo primero.
  CONSTRAINT uq_periodo UNIQUE (periodo_year, periodo_month)
);

CREATE INDEX idx_snapshots_periodo
  ON padron_snapshots (periodo_year DESC, periodo_month DESC);

ALTER TABLE padron_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE padron_snapshots IS
  'Una fila por carga mensual del padrón ANSES. Permite comparar cualquier dos meses para calcular altas/bajas/cambios reales entre snapshots.';

-- =====================================================================
-- 2. padron_cotizantes: pasa de "padrón único" a "todos los snapshots".
--    UNIQUE(dni) → UNIQUE(dni, padron_snapshot_id).
-- =====================================================================

-- 2a. Crear snapshot inicial para los rows existentes (seed/manual).
-- Usamos UUID fijo y conocido para poder referenciarlo si hace falta.
INSERT INTO padron_snapshots (
  id, periodo_label, periodo_year, periodo_month,
  archivo_nombre, total_filas, importado_at
) VALUES (
  '00000000-0000-4000-9000-000000000099',
  'CARGA INICIAL 2026-05',
  2026, 5,
  'seed.sql',
  (SELECT COUNT(*) FROM padron_cotizantes),
  '2026-05-01 00:00:00'::timestamptz
);

-- 2b. Agregar FK al snapshot (nullable primero, para hacer backfill)
ALTER TABLE padron_cotizantes
  ADD COLUMN padron_snapshot_id uuid
    REFERENCES padron_snapshots(id) ON DELETE CASCADE;

-- 2c. Backfill: todas las filas existentes apuntan al snapshot inicial
UPDATE padron_cotizantes
SET padron_snapshot_id = '00000000-0000-4000-9000-000000000099';

ALTER TABLE padron_cotizantes
  ALTER COLUMN padron_snapshot_id SET NOT NULL;

-- 2d. Drop UNIQUE constraints viejos (DNI y legajo globales)
ALTER TABLE padron_cotizantes
  DROP CONSTRAINT padron_cotizantes_dni_key;

DROP INDEX uq_padron_legajo;

-- 2e. Reemplazar por unique compuesto (dni|legajo, snapshot_id)
CREATE UNIQUE INDEX uq_padron_dni_snapshot
  ON padron_cotizantes (dni, padron_snapshot_id);

CREATE UNIQUE INDEX uq_padron_legajo_snapshot
  ON padron_cotizantes (legajo, padron_snapshot_id)
  WHERE legajo IS NOT NULL;

-- 2f. Index para queries del dashboard (filtrar por snapshot)
CREATE INDEX idx_padron_snapshot
  ON padron_cotizantes (padron_snapshot_id);

-- =====================================================================
-- 3. Vista padron_cotizantes_actual: el snapshot más reciente.
--    Las queries del día-a-día (auth, delegados, notificaciones) apuntan
--    acá y no se enteran de que hay histórico debajo.
-- =====================================================================

CREATE VIEW padron_cotizantes_actual AS
SELECT pc.*
FROM padron_cotizantes pc
WHERE pc.padron_snapshot_id = (
  SELECT id FROM padron_snapshots
  ORDER BY periodo_year DESC, periodo_month DESC
  LIMIT 1
);

-- Las vistas no heredan GRANTs de las tablas — re-aplicar.
GRANT SELECT ON padron_cotizantes_actual TO anon, authenticated, service_role;

COMMENT ON VIEW padron_cotizantes_actual IS
  'Snapshot más reciente del padrón. Apuntar acá para queries del día-a-día. Para análisis histórico (dashboard CD), usar la tabla raw padron_cotizantes filtrada por padron_snapshot_id.';

-- =====================================================================
-- 4. afiliados.fecha_baja
-- =====================================================================
--
-- Dos caminos de carga:
--   (a) admin marca baja manualmente desde el dashboard (server action)
--   (b) propagación automática cuando la fila desaparece del padrón nuevo
--       (decisión a tomar en la server action de carga)

ALTER TABLE afiliados
  ADD COLUMN fecha_baja timestamptz;

-- Backfill defensivo: si por algún motivo hay afiliados con estado='baja'
-- ya seteado, usar created_at como placeholder de fecha_baja. Mejor un dato
-- impreciso que un constraint que falla al aplicar.
UPDATE afiliados
SET fecha_baja = created_at
WHERE estado = 'baja' AND fecha_baja IS NULL;

-- Consistencia: estado='baja' implica fecha_baja NOT NULL
ALTER TABLE afiliados
  ADD CONSTRAINT chk_baja_fecha CHECK (
    (estado = 'baja' AND fecha_baja IS NOT NULL)
    OR estado <> 'baja'
  );

COMMENT ON COLUMN afiliados.fecha_baja IS
  'Fecha en que se dio de baja al afiliado de la mutual. NOT NULL cuando estado = baja. Se setea desde el dashboard de admin o automáticamente durante la carga de un nuevo padrón si la persona desapareció.';
