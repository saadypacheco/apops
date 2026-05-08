-- Migration: 0025_grants
-- Created: 2026-05-08
--
-- Restaura GRANTs estándar de Supabase para roles anon, authenticated y
-- service_role en el schema public. Necesario cuando el proyecto se crea
-- con la opción "Automatically expose new tables" desmarcada — esa opción
-- es la que normalmente aplica estos grants automáticamente.
--
-- Sin estos grants, las queries dan PostgreSQL 42501 "permission denied"
-- aún antes de evaluar las policies de RLS.
--
-- RLS sigue siendo la última palabra: con grant pero sin policy, RLS
-- bloquea (deny by default). Las policies definidas en migraciones
-- 0013-0017, 0023, 0024 controlan qué filas ve cada role.

-- ─────────────────────────────────────────────────────────────────────
-- service_role: acceso completo (bypassea RLS por design)
-- ─────────────────────────────────────────────────────────────────────
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- anon y authenticated: privilegios DML completos a nivel tabla
-- (RLS controla qué filas afecta cada operación realmente)
-- ─────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Default privileges: para tablas/secuencias creadas por futuras migraciones
-- ─────────────────────────────────────────────────────────────────────
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
