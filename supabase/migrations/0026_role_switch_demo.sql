-- Migration: 0026_role_switch_demo
-- Created: 2026-05-08
--
-- Habilita el "switcher de rol" para usuarios marcados como demo.
-- Cualquier afiliado con permite_role_switch=true puede cambiar su propio
-- rol entre afiliado/delegado/admin desde la UI durante una demo, sin
-- tener que cerrar sesión y entrar con otra cuenta.
--
-- En producción real esta columna debe quedar SIEMPRE en false para todos
-- los usuarios reales. Solo se activa en cuentas de presentación.

ALTER TABLE afiliados
  ADD COLUMN permite_role_switch boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN afiliados.permite_role_switch IS
  'Si true, el usuario puede cambiar su rol desde la UI. SOLO para demo. '
  'En producción real debe estar false para todos los afiliados reales.';
