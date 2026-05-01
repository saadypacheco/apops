-- Migration: 0017_roles_admin_stub
-- Feature: 001-afiliado-auth
-- Created: 2026-05-01
--
-- STUB: reemplazar por migración oficial de feature posterior '002-roles-y-permisos'
-- (o nombre equivalente). Esta feature 001-afiliado-auth NO construye el sistema de
-- roles completo, pero la Edge Function `resolver-pendiente` necesita verificar
-- "es admin?" para los flujos de aprobación/rechazo de solicitudes pendientes.
--
-- Diseño minimalista del stub:
--   - Una fila por afiliado con permiso de admin.
--   - La Edge Function consulta esta tabla con service_role.
--   - Si la tabla no existe (entorno legado), la función responde 503
--     'roles_module_unavailable' (deferred_dependency documentado en
--     contracts/edge-pendiente-actions.json).
--
-- RLS: locked-down. Solo service_role lee/escribe. La feature de roles real
-- definirá políticas más finas (ej. lectura para el propio admin).
--
-- Cuando llegue la feature de roles, esta tabla puede:
--   a) ser reemplazada por una tabla más rica (ej. con columna `rol` y FK
--      a una tabla `roles`), o
--   b) sobrevivir como una vista materializada de "quién es admin" con la
--      misma forma `auth_user_id, granted_at`. La Edge Function solo necesita
--      esa forma.

CREATE TABLE roles_admin (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at   timestamptz NOT NULL DEFAULT now(),
  granted_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notas        text
);

ALTER TABLE roles_admin ENABLE ROW LEVEL SECURITY;
-- Sin policies → solo service_role accede (defense in depth + privacidad).
