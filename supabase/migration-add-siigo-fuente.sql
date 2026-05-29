-- ============================================================================
-- Permite 'siigo' como valor del campo `fuente` en ventas_historicas_mensuales
-- ============================================================================
-- Contexto: el cliente entrega los reportes mensuales de consumo desde Siigo
-- (sistema contable). Antes la tabla solo aceptaba 'alegra', 'manual' u 'otro'.
-- Esta migración añade 'siigo' como valor válido sin tocar las filas viejas.
--
-- Es idempotente: si ya fue ejecutado, el segundo intento simplemente no hace
-- nada porque el constraint ya está en su versión nueva.
-- ============================================================================

alter table ventas_historicas_mensuales
  drop constraint if exists ventas_historicas_mensuales_fuente_check;

alter table ventas_historicas_mensuales
  add constraint ventas_historicas_mensuales_fuente_check
  check (fuente in ('alegra', 'siigo', 'manual', 'otro'));
