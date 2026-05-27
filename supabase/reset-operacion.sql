-- ============================================================================
-- LIMPIEZA DE OPERACIÓN — preparar el sistema para entrega al cliente
-- ============================================================================
-- Borra TODO el movimiento y el stock acumulado durante el desarrollo/pruebas,
-- dejando el sistema "en cero" para que el cliente empiece a operar limpio.
--
-- QUÉ BORRA (datos operativos / de prueba):
--   - Todas las transacciones (ventas, compras, traslados) y sus ítems.
--   - Todos los ajustes de inventario.
--   - Todo el stock por ubicación (queda en 0 en todas las ubicaciones).
--
-- QUÉ CONSERVA (configuración / catálogo):
--   - Productos y servicios.
--   - Categorías, ubicaciones, impuestos.
--   - Tarifas (listas_precios) y precios por producto.
--   - Usuarios y perfiles.
--
-- ⚠️  ESTO NO SE PUEDE DESHACER. Haz un respaldo en Supabase antes de correrlo
--     (Database → Backups, o un dump) si quieres poder volver atrás.
--
-- Cómo usar: pega TODO este archivo en el SQL Editor de Supabase y ejecútalo.
-- Es seguro re-ejecutarlo (idempotente).
-- ============================================================================

begin;

-- 1) Transacciones + ítems. Borrar la cabecera arrastra los ítems por el
--    ON DELETE CASCADE de transaccion_items → transacciones.
delete from transaccion_items;   -- por si quedara algún ítem huérfano
delete from transacciones;

-- 2) Ajustes de inventario (conteos, mermas, correcciones, ingresos iniciales).
delete from ajustes_inventario;

-- 3) Stock por ubicación. Al borrar las filas, el stock de cada producto queda
--    en 0 (la vista v_stock_total usa coalesce(sum, 0)).
delete from stock_por_ubicacion;

commit;

-- ----------------------------------------------------------------------------
-- OPCIONAL — Histórico de ventas mensuales importado de Alegra
-- ----------------------------------------------------------------------------
-- El histórico de Alegra (sep 2025 – abr 2026) NO es stock actual: son ventas
-- pasadas que alimentan el Dashboard. Por eso NO se borra por defecto.
--
-- Si el cliente quiere arrancar SIN ese histórico (dashboard totalmente en
-- blanco), descomenta la siguiente línea y vuelve a ejecutar:
--
-- delete from ventas_historicas_mensuales;
--
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- VERIFICACIÓN — debe devolver 0 en las primeras 3 filas (operación limpia).
-- ----------------------------------------------------------------------------
select 'transacciones'        as tabla, count(*) as filas from transacciones
union all
select 'transaccion_items',   count(*) from transaccion_items
union all
select 'ajustes_inventario',  count(*) from ajustes_inventario
union all
select 'stock_por_ubicacion', count(*) from stock_por_ubicacion
union all
select 'productos (se conservan)',   count(*) from productos
union all
select 'ventas_historicas (se conservan salvo que borres arriba)', count(*) from ventas_historicas_mensuales
order by tabla;
