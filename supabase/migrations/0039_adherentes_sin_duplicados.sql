-- Migration: 0039_adherentes_sin_duplicados
-- Created: 2026-08-07
--
-- La credencial del titular mostraba al mismo adherente varias veces
-- (ej: "Vos y 7 adherentes" para una familia de 3). La query de
-- credencial/queries.ts no tiene joins, así que no podía multiplicar
-- filas: los duplicados estaban en la tabla.
--
-- Causa: los seeds de demo se corrieron varias veces y no eran
-- idempotentes. Peor todavía, distintas corridas usaron convenciones de
-- legajo distintas para el mismo titular (SIEMPREAPOPS vs L-SIEMPREAPOPS),
-- así que ni siquiera colisionaban entre sí.
--
-- Acá se limpian los duplicados existentes y se agrega el índice único
-- que impide que vuelvan a entrar.

-- 1. Borrar duplicados, conservando la fila más antigua de cada persona.
--    "Misma persona" = mismo titular + mismo nombre + mismo vínculo.
DELETE FROM padron_adherentes a
USING padron_adherentes b
WHERE a.titular_dni = b.titular_dni
  AND lower(a.nombre) = lower(b.nombre)
  AND a.vinculo = b.vinculo
  AND (
    a.ingestado_at > b.ingestado_at
    OR (a.ingestado_at = b.ingestado_at AND a.id > b.id)
  );

-- 2. Candado a nivel base.
--
--    Nota: el índice asume que un titular no declara dos adherentes con
--    exactamente el mismo nombre y vínculo (ej. dos hijos homónimos). Es
--    un caso que no existe en el padrón real; si alguna vez aparece, hay
--    que relajarlo a (titular_dni, dni) y tratar el dni nulo aparte.
CREATE UNIQUE INDEX uq_adherente_por_titular
  ON padron_adherentes (titular_dni, lower(nombre), vinculo);

COMMENT ON INDEX uq_adherente_por_titular IS 'Evita adherentes duplicados por titular. Los seeds/cargas deben usar upsert con onConflict sobre estas columnas.';
