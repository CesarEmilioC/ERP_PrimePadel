-- ============================================================================
-- Migración: añadir descuento_porcentaje a listas_precios (UI: "Tarifas")
-- ============================================================================
-- Cada tarifa (lista de precios) ahora puede tener un descuento predeterminado
-- en porcentaje. Cuando un producto NO tiene precio configurado para una
-- tarifa específica, el sistema usa:
--
--   precio = precio_detal × (1 − descuento_porcentaje / 100)
--
-- Si el producto SÍ tiene un precio configurado en precios_producto para esa
-- tarifa, ese precio tiene prioridad sobre el cálculo automático.
--
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

set client_min_messages to warning;

alter table listas_precios
  add column if not exists descuento_porcentaje numeric(5,2) not null default 0
  check (descuento_porcentaje >= 0 and descuento_porcentaje <= 100);

-- Forzar 0 en la lista default (no aplica descuento).
update listas_precios set descuento_porcentaje = 0 where es_default = true;
