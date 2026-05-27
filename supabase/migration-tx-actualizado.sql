-- ============================================================================
-- Migración: registrar quién y cuándo editó por última vez una transacción
-- ============================================================================
-- Añade actualizado_en / actualizado_por a transacciones para mostrar en la
-- lista la fecha/hora de la última edición y el usuario que la hizo, sin
-- perder quién la registró originalmente (usuario_id).
--
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

set client_min_messages to warning;

alter table transacciones
  add column if not exists actualizado_en  timestamptz,
  add column if not exists actualizado_por uuid references auth.users(id) on delete set null;
