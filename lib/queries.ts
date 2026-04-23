import "server-only";
import { sbAdmin } from "@/lib/supabase/admin-server";

export async function getCategorias() {
  const { data, error } = await sbAdmin()
    .from("categorias")
    .select("*")
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getUbicaciones() {
  const { data, error } = await sbAdmin()
    .from("ubicaciones")
    .select("*")
    .order("orden", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getImpuestos() {
  const { data, error } = await sbAdmin()
    .from("impuestos")
    .select("*")
    .order("porcentaje", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getListasPrecios() {
  const { data, error } = await sbAdmin()
    .from("listas_precios")
    .select("*")
    .eq("activa", true)
    .order("orden", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getProductos(opts: { onlyActivos?: boolean; onlyInventariables?: boolean } = {}) {
  let q = sbAdmin()
    .from("productos")
    .select(`
      id, codigo, nombre, tipo, categoria_id, es_inventariable,
      stock_minimo_alerta, costo_unitario, impuesto_id, unidad_medida,
      descripcion_larga, activo,
      categorias(nombre),
      impuestos(nombre, porcentaje)
    `)
    .order("nombre", { ascending: true });
  if (opts.onlyActivos) q = q.eq("activo", true);
  if (opts.onlyInventariables) q = q.eq("es_inventariable", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getProducto(id: string) {
  const { data, error } = await sbAdmin()
    .from("productos")
    .select(`
      *,
      categorias(id, nombre),
      impuestos(id, nombre, porcentaje),
      precios_producto(lista_precio_id, precio, listas_precios(codigo, nombre)),
      stock_por_ubicacion(cantidad, ubicaciones(id, nombre, tipo))
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getStockTotales() {
  const { data, error } = await sbAdmin()
    .from("v_stock_total")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTransaccionesRecientes(limit = 50) {
  const { data, error } = await sbAdmin()
    .from("transacciones")
    .select(`
      id, tipo, fecha, total, notas, origen,
      transaccion_items(id, cantidad, precio_unitario, subtotal, productos(codigo, nombre))
    `)
    .order("fecha", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getVentasHistoricasPorMes() {
  // Fetch historical data together with the Detal price for each product so we
  // can estimate revenue (cantidad_vendida × precio_detal) when the xlsx sheet
  // didn't include monetary columns (total = 0).
  const { data, error } = await sbAdmin()
    .from("ventas_historicas_mensuales")
    .select(`
      anio, mes, cantidad_vendida, total, valor_bruto,
      productos!inner(
        nombre, codigo, tipo, es_inventariable, categorias(nombre),
        precios_producto(precio, listas_precios!inner(es_default))
      )
    `);
  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const precioDefault: number =
      (row.productos?.precios_producto ?? []).find(
        (pp: any) => pp.listas_precios?.es_default === true
      )?.precio ?? 0;
    const totalEstimado =
      Number(row.total) > 0
        ? Number(row.total)
        : Number(row.cantidad_vendida) * precioDefault;
    return {
      anio: row.anio,
      mes: row.mes,
      cantidad_vendida: Number(row.cantidad_vendida),
      total: totalEstimado,
      valor_bruto: Number(row.valor_bruto ?? 0),
      productos: row.productos,
    };
  });
}

export async function getDashboardStats() {
  const sb = sbAdmin();
  const [{ count: nProd }, { count: nInv }, { count: nUbi }, { data: stockBajo }, { data: hist }] = await Promise.all([
    sb.from("productos").select("*", { head: true, count: "exact" }).eq("activo", true),
    sb.from("productos").select("*", { head: true, count: "exact" }).eq("activo", true).eq("es_inventariable", true),
    sb.from("ubicaciones").select("*", { head: true, count: "exact" }).eq("activa", true),
    sb.from("v_stock_total").select("producto_id, nombre, cantidad_total, stock_minimo_alerta, estado_stock").in("estado_stock", ["stock_bajo", "sin_stock"]).limit(10),
    sb.from("ventas_historicas_mensuales").select("anio, mes, cantidad_vendida, total").order("anio", { ascending: false }).order("mes", { ascending: false }).limit(500),
  ]);
  return {
    nProductosActivos: nProd ?? 0,
    nInventariables: nInv ?? 0,
    nUbicaciones: nUbi ?? 0,
    alertasStock: stockBajo ?? [],
    historicoUltimos: hist ?? [],
  };
}
