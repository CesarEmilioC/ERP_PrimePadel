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

// Stock total por ubicación (suma de cantidad de todos los productos por ubicación).
export async function getStockPorUbicacion() {
  const sb = sbAdmin();
  const [{ data: stock }, { data: ubicaciones }, { data: productos }] = await Promise.all([
    sb.from("stock_por_ubicacion").select("producto_id, ubicacion_id, cantidad"),
    sb.from("ubicaciones").select("id, nombre, tipo, activa").eq("activa", true),
    sb.from("productos").select("id, costo_unitario").eq("activo", true).eq("es_inventariable", true),
  ]);
  const costoPorProd = new Map((productos ?? []).map((p: any) => [p.id, Number(p.costo_unitario ?? 0)]));
  const acc = new Map<string, { ubicacion_id: string; cantidad: number; valor: number }>();
  for (const s of stock ?? []) {
    const cant = Number(s.cantidad);
    const val = cant * (costoPorProd.get(s.producto_id) ?? 0);
    const cur = acc.get(s.ubicacion_id) ?? { ubicacion_id: s.ubicacion_id, cantidad: 0, valor: 0 };
    cur.cantidad += cant;
    cur.valor += val;
    acc.set(s.ubicacion_id, cur);
  }
  return (ubicaciones ?? []).map((u: any) => {
    const r = acc.get(u.id);
    return {
      ubicacion_id: u.id,
      nombre: u.nombre,
      tipo: u.tipo,
      cantidad: r?.cantidad ?? 0,
      valor: r?.valor ?? 0,
    };
  }).sort((a, b) => b.cantidad - a.cantidad);
}

// Conteo de SKUs por categoría.
export async function getSkusPorCategoria() {
  const sb = sbAdmin();
  const { data } = await sb.from("productos").select("categoria_id, categorias(nombre)").eq("activo", true);
  const acc = new Map<string, number>();
  for (const p of (data ?? []) as any[]) {
    const nombre = p.categorias?.nombre ?? "Sin categoría";
    acc.set(nombre, (acc.get(nombre) ?? 0) + 1);
  }
  return [...acc.entries()].map(([nombre, count]) => ({ nombre, count })).sort((a, b) => b.count - a.count);
}

// Alertas de stock bajo / sin stock con desglose por ubicación.
export async function getAlertasDetalladas() {
  const sb = sbAdmin();
  const { data: alertas } = await sb
    .from("v_stock_total")
    .select("producto_id, codigo, nombre, cantidad_total, stock_minimo_alerta, estado_stock, categorias(nombre)")
    .in("estado_stock", ["stock_bajo", "sin_stock"])
    .order("cantidad_total", { ascending: true });

  const ids = (alertas ?? []).map((a: any) => a.producto_id);
  if (ids.length === 0) return [];

  const { data: stockUbi } = await sb
    .from("stock_por_ubicacion")
    .select("producto_id, cantidad, ubicaciones(nombre)")
    .in("producto_id", ids);

  const porProd = new Map<string, { nombre: string; cantidad: number }[]>();
  for (const s of (stockUbi ?? []) as any[]) {
    const arr = porProd.get(s.producto_id) ?? [];
    arr.push({ nombre: s.ubicaciones?.nombre ?? "?", cantidad: Number(s.cantidad) });
    porProd.set(s.producto_id, arr);
  }

  return (alertas ?? []).map((a: any) => ({
    producto_id: a.producto_id,
    codigo: a.codigo,
    nombre: a.nombre,
    categoria: a.categorias?.nombre ?? null,
    cantidad_total: Number(a.cantidad_total),
    stock_minimo_alerta: Number(a.stock_minimo_alerta),
    estado_stock: a.estado_stock as "stock_bajo" | "sin_stock",
    ubicaciones: (porProd.get(a.producto_id) ?? []).sort((x, y) => y.cantidad - x.cantidad),
  }));
}

// Top productos por día de la semana (basado en transacciones tipo venta).
export async function getTopPorDiaSemana() {
  const sb = sbAdmin();
  const { data } = await sb
    .from("transaccion_items")
    .select("cantidad, transacciones!inner(fecha, tipo), productos(nombre)")
    .eq("transacciones.tipo", "venta");
  // Día de la semana en hora local Bogotá: 0 = domingo, 6 = sábado
  const acc = new Map<string, { nombre: string; porDia: number[] }>();
  for (const it of (data ?? []) as any[]) {
    const fecha = new Date(it.transacciones.fecha);
    const dia = fecha.getDay();
    const nombre = it.productos?.nombre ?? "—";
    const row = acc.get(nombre) ?? { nombre, porDia: [0, 0, 0, 0, 0, 0, 0] };
    row.porDia[dia] += Number(it.cantidad);
    acc.set(nombre, row);
  }
  return [...acc.values()];
}

// Ventas agregadas por día de la semana (cantidad total y monto), todos los productos juntos.
export async function getVentasPorDiaSemana() {
  const sb = sbAdmin();
  const { data } = await sb
    .from("transacciones")
    .select("fecha, total")
    .eq("tipo", "venta");
  const acc = [0, 0, 0, 0, 0, 0, 0].map(() => ({ monto: 0, count: 0 }));
  for (const t of (data ?? []) as any[]) {
    const dia = new Date(t.fecha).getDay();
    acc[dia].monto += Number(t.total ?? 0);
    acc[dia].count += 1;
  }
  return acc;
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
