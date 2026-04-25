-- ============================================================================
-- Migración: pasar de 2 a 3 roles (maestro, admin, recepcion)
-- Ejecutar UNA VEZ en Supabase → SQL Editor → Run.
-- Idempotente: se puede correr varias veces sin error.
-- ============================================================================

-- 1. Reemplazar la constraint del rol para soportar tres valores.
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check
  check (rol in ('maestro', 'admin', 'recepcion'));

-- 2. Migrar valores anteriores:
--    'admin' antiguo (único super-usuario) → 'maestro'
--    'cajero' antiguo (operación)         → 'recepcion'
update perfiles set rol = 'maestro' where rol = 'admin';
update perfiles set rol = 'recepcion' where rol = 'cajero';
