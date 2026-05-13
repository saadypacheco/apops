-- Migration: 0030_drop_initial_seed_snapshot
-- Created: 2026-05-13
--
-- Borra el snapshot "CARGA INICIAL 2026-05" creado por la migration 0028
-- como puente para los 6 cotizantes seed iniciales (Méndez, García, Sosa,
-- Pérez, Rodríguez, Martínez).
--
-- Razón: ese snapshot tenía fecha arbitraria 2026-05 para "no perder el
-- seed", pero cuando se sube un padrón real (típicamente de un mes anterior
-- al actual del calendar), 2026-05 sigue siendo el cronológicamente más
-- reciente y la vista padron_cotizantes_actual mantiene los 6 seeds en vez
-- del padrón real. Resultado: dashboards y queries del día-a-día consultan
-- 6 filas inventadas en vez de los 15k+ cotizantes reales.
--
-- Efectos del DELETE:
--   - ON DELETE CASCADE en padron_cotizantes.padron_snapshot_id borra las 6
--     filas del seed.
--   - ON DELETE SET NULL en afiliados.padron_id deja los 6 afiliados demo
--     (Méndez, García, etc.) con padron_id=NULL. Siguen pudiendo loguearse
--     como demo de roles. El re-link automático del próximo padrón les
--     asignará padron_id si su DNI/legajo matchea.

DELETE FROM padron_snapshots
WHERE id = '00000000-0000-4000-9000-000000000099';

-- Verificación implícita: si el snapshot ya no existía (porque alguien lo
-- borró antes manualmente), el DELETE es no-op silencioso. No falla.
