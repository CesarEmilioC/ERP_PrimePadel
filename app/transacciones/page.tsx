import { sbAdmin } from "@/lib/supabase/admin-server";
import { getUbicaciones, getListasPrecios } from "@/lib/queries";
import { TransaccionesClient } from "./transacciones-client";

export const dynamic = "force-dynamic";

export default async function TransaccionesPage() {
  const sb = sbAdmin();

  const [{ data: txs }, { data: productos }, { data: stock }, { data: precios }, ubicaciones, listasPrecios] =
    await Promise.all([
      sb.from("transacciones").select(`
        id, tipo, fecha, total, notas, origen,
        transaccion_items(cantidad, productos(codigo, nombre))
      `).order("fecha", { ascending: false }).limit(100),
      sb.from("productos").select("id, codigo, nombre, tipo, es_inventariable, activo").eq("activo", true).order("nombre", { ascending: true }),
      sb.from("stock_por_ubicacion").select("producto_id, ubicacion_id, cantidad"),
      sb.from("precios_producto").select("producto_id, precio, listas_precios(es_default)"),
      getUbicaciones(),
      getListasPrecios(),
    ]);

  const stockPorProd = new Map<string, Record<string, number>>();
  for (const s of stock ?? []) {
    if (!stockPorProd.has(s.producto_id)) stockPorProd.set(s.producto_id, {});
    stockPorProd.get(s.producto_id)![s.ubicacion_id] = s.cantidad;
  }

  const precioPorProd = new Map<string, number>();
  for (const p of precios ?? []) {
    if ((p.listas_precios as any)?.es_default) {
      precioPorProd.set(p.producto_id, Number(p.precio));
    }
  }

  const productosOpt = (productos ?? []).map((p: any) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    es_inventariable: p.es_inventariable,
    tipo: p.tipo,
    precio_detal: precioPorProd.get(p.id) ?? null,
    stock_por_ubicacion: stockPorProd.get(p.id) ?? {},
  }));

  const transacciones = (txs ?? []).map((t: any) => ({
    id: t.id,
    tipo: t.tipo,
    fecha: t.fecha,
    total: Number(t.total),
    notas: t.notas,
    origen: t.origen,
    items: t.transaccion_items ?? [],
  }));

  return (
    <TransaccionesClient
      transacciones={transacciones}
      productos={productosOpt}
      ubicaciones={ubicaciones.filter((u) => u.activa).map((u) => ({ id: u.id, nombre: u.nombre }))}
      listasPrecios={listasPrecios}
    />
  );
}
