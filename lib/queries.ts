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
// Costo promedio de compra por producto (ponderado por cantidad). Cae al costo
// del catálogo si el producto no tiene compras registradas. Se usa para valorar
// inventario y calcular utilidades con un costo realista (no el snapshot por venta).
export async function getCostoPromedioPorProducto(): Promise<Map<string, number>> {
  const sb = sbAdmin();
  const [{ data: compras }, { data: productos }] = await Promise.all([
    sb.from("transaccion_items")
      .select("producto_id, cantidad, costo_unitario, precio_unitario, transacciones!inner(tipo)")
      .eq("transacciones.tipo", "compra"),
    sb.from("productos").select("id, costo_unitario"),
  ]);
  const agg = new Map<string, { qty: number; val: number }>();
  for (const it of (compras ?? []) as any[]) {
    const pid = it.producto_id as string;
    const cant = Number(it.cantidad);
    const costo = Number(it.costo_unitario ?? 0) || Number(it.precio_unitario ?? 0);
    if (cant <= 0 || costo <= 0) continue;
    const cur = agg.get(pid) ?? { qty: 0, val: 0 };
    cur.qty += cant;
    cur.val += cant * costo;
    agg.set(pid, cur);
  }
  const out = new Map<string, number>();
  for (const p of (productos ?? []) as any[]) {
    const a = agg.get(p.id);
    out.set(p.id, a && a.qty > 0 ? a.val / a.qty : Number(p.costo_unitario ?? 0));
  }
  for (const [pid, a] of agg) {
    if (!out.has(pid) && a.qty > 0) out.set(pid, a.val / a.qty);
  }
  return out;
}

export async function getStockPorUbicacion() {
  const sb = sbAdmin();
  const [{ data: stock }, { data: ubicaciones }, costoPorProd] = await Promise.all([
    sb.from("stock_por_ubicacion").select("producto_id, ubicacion_id, cantidad"),
    sb.from("ubicaciones").select("id, nombre, tipo, activa").eq("activa", true),
    getCostoPromedioPorProducto(),
  ]);
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
// Nota: PostgREST no resuelve FK desde una vista, así que las categorías se cargan aparte.
export async function getAlertasDetalladas() {
  const sb = sbAdmin();
  const { data: alertas } = await sb
    .from("v_stock_total")
    .select("producto_id, codigo, nombre, cantidad_total, stock_minimo_alerta, estado_stock")
    .in("estado_stock", ["stock_bajo", "sin_stock"])
    .order("cantidad_total", { ascending: true });

  const ids = (alertas ?? []).map((a: any) => a.producto_id);
  if (ids.length === 0) return [];

  const [{ data: stockUbi }, { data: prods }] = await Promise.all([
    sb.from("stock_por_ubicacion").select("producto_id, cantidad, ubicaciones(nombre)").in("producto_id", ids),
    sb.from("productos").select("id, categorias(nombre)").in("id", ids),
  ]);

  const porProd = new Map<string, { nombre: string; cantidad: number }[]>();
  for (const s of (stockUbi ?? []) as any[]) {
    if (Number(s.cantidad) <= 0) continue; // solo ubicaciones donde sí hay producto
    const arr = porProd.get(s.producto_id) ?? [];
    arr.push({ nombre: s.ubicaciones?.nombre ?? "?", cantidad: Number(s.cantidad) });
    porProd.set(s.producto_id, arr);
  }

  const catPorProd = new Map<string, string | null>();
  for (const p of (prods ?? []) as any[]) {
    catPorProd.set(p.id, p.categorias?.nombre ?? null);
  }

  return (alertas ?? []).map((a: any) => ({
    producto_id: a.producto_id,
    codigo: a.codigo,
    nombre: a.nombre,
    categoria: catPorProd.get(a.producto_id) ?? null,
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

// Stock total por producto (suma de todas las ubicaciones). Útil para análisis predictivo.
export async function getStockTotalPorProducto() {
  const sb = sbAdmin();
  const { data } = await sb
    .from("v_stock_total")
    .select("producto_id, nombre, cantidad_total");
  return (data ?? []).map((r: any) => ({
    producto_id: r.producto_id,
    nombre: r.nombre as string,
    cantidad_total: Number(r.cantidad_total ?? 0),
  }));
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

// Ventas de los últimos 7 días (incluyendo hoy), agrupadas por día en zona Bogotá.
// Devuelve siempre 7 elementos en orden cronológico (día más viejo primero).
export type VentaDia = {
  fechaISO: string;       // YYYY-MM-DD (zona horaria Bogotá)
  diaCorto: string;       // "Lun", "Mar"...
  fechaCorta: string;     // "12/05"
  monto: number;
  transacciones: number;
};

export async function getVentasUltimaSemana(): Promise<VentaDia[]> {
  const sb = sbAdmin();
  const ahora = new Date();
  // Inicio: hace 6 días → cubre 7 días incluyendo hoy.
  const desdeBogota = new Date(ahora.getTime() - 6 * 24 * 60 * 60 * 1000);
  const desdeISO = `${desdeBogota.getUTCFullYear()}-${String(desdeBogota.getUTCMonth() + 1).padStart(2, "0")}-${String(desdeBogota.getUTCDate()).padStart(2, "0")}T00:00:00-05:00`;

  const { data } = await sb
    .from("transacciones")
    .select("fecha, total")
    .eq("tipo", "venta")
    .gte("fecha", desdeISO);

  const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const acc = new Map<string, { monto: number; count: number }>();
  for (const t of (data ?? []) as any[]) {
    const f = new Date(t.fecha);
    // Bogotá = UTC-5 (sin DST). Resto 5h al UTC para obtener fecha local.
    const fBogota = new Date(f.getTime() - 5 * 60 * 60 * 1000);
    const key = `${fBogota.getUTCFullYear()}-${String(fBogota.getUTCMonth() + 1).padStart(2, "0")}-${String(fBogota.getUTCDate()).padStart(2, "0")}`;
    const cur = acc.get(key) ?? { monto: 0, count: 0 };
    cur.monto += Number(t.total ?? 0);
    cur.count += 1;
    acc.set(key, cur);
  }

  const out: VentaDia[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(ahora.getTime() - i * 24 * 60 * 60 * 1000);
    const dBogota = new Date(d.getTime() - 5 * 60 * 60 * 1000);
    const key = `${dBogota.getUTCFullYear()}-${String(dBogota.getUTCMonth() + 1).padStart(2, "0")}-${String(dBogota.getUTCDate()).padStart(2, "0")}`;
    const datos = acc.get(key) ?? { monto: 0, count: 0 };
    out.push({
      fechaISO: key,
      diaCorto: DIAS_CORTOS[dBogota.getUTCDay()],
      fechaCorta: `${String(dBogota.getUTCDate()).padStart(2, "0")}/${String(dBogota.getUTCMonth() + 1).padStart(2, "0")}`,
      monto: datos.monto,
      transacciones: datos.count,
    });
  }
  return out;
}

// Utilidades brutas por producto/servicio: suma de (precio - costo) * cantidad
// sobre todas las ventas registradas en el sistema. Solo cuenta ventas reales,
// no el histórico mensual de Alegra (porque ahí no tenemos costo por venta).
export type UtilidadProducto = {
  producto_id: string;
  codigo: string | null;
  nombre: string;
  tipo: "producto" | "servicio";
  cantidad_vendida: number;
  ingresos: number;
  costos: number;
  utilidad: number;
  margen_pct: number;
};

export async function getUtilidadPorProducto(): Promise<UtilidadProducto[]> {
  const sb = sbAdmin();
  const [{ data }, costoPromedio] = await Promise.all([
    sb.from("transaccion_items")
      .select("cantidad, precio_unitario, producto_id, transacciones!inner(tipo), productos(codigo, nombre, tipo)")
      .eq("transacciones.tipo", "venta"),
    getCostoPromedioPorProducto(),
  ]);

  const acc = new Map<string, UtilidadProducto>();
  for (const it of (data ?? []) as any[]) {
    const pid = it.producto_id as string;
    const cant = Number(it.cantidad);
    const precio = Number(it.precio_unitario ?? 0);
    const cur = acc.get(pid) ?? {
      producto_id: pid,
      codigo: it.productos?.codigo ?? null,
      nombre: it.productos?.nombre ?? "—",
      tipo: (it.productos?.tipo as "producto" | "servicio") ?? "producto",
      cantidad_vendida: 0,
      ingresos: 0,
      costos: 0,
      utilidad: 0,
      margen_pct: 0,
    };
    cur.cantidad_vendida += cant;
    cur.ingresos += cant * precio;
    acc.set(pid, cur);
  }
  // Costo = unidades vendidas × costo promedio de compra del producto.
  for (const cur of acc.values()) {
    cur.costos = cur.cantidad_vendida * (costoPromedio.get(cur.producto_id) ?? 0);
    cur.utilidad = cur.ingresos - cur.costos;
    cur.margen_pct = cur.ingresos > 0 ? Math.round((cur.utilidad / cur.ingresos) * 10000) / 100 : 0;
  }
  return [...acc.values()].sort((a, b) => b.utilidad - a.utilidad);
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
