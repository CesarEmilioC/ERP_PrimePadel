import { sbAdmin } from "@/lib/supabase/admin-server";
import { getCategorias, getUbicaciones, getImpuestos, getListasPrecios } from "@/lib/queries";
import { InventarioClient, type InventarioRow } from "./inventario-client";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const sb = sbAdmin();

  const [{ data: productos }, { data: stockRows }, { data: precios }, categorias, ubicaciones, impuestos, listasPrecios] =
    await Promise.all([
      sb.from("productos").select(`
        id, codigo, nombre, tipo, categoria_id, es_inventariable, activo,
        stock_minimo_alerta, costo_unitario,
        categorias(nombre),
        impuestos(porcentaje)
      `).order("nombre", { ascending: true }),
      sb.from("stock_por_ubicacion").select("producto_id, ubicacion_id, cantidad"),
      sb.from("precios_producto").select("producto_id, precio, listas_precios(codigo, es_default)"),
      getCategorias(),
      getUbicaciones(),
      getImpuestos(),
      getListasPrecios(),
    ]);

  const cantidadPorProd = new Map<string, Record<string, number>>();
  const totalPorProd = new Map<string, number>();
  for (const s of stockRows ?? []) {
    if (!cantidadPorProd.has(s.producto_id)) cantidadPorProd.set(s.producto_id, {});
    cantidadPorProd.get(s.producto_id)![s.ubicacion_id] = s.cantidad;
    totalPorProd.set(s.producto_id, (totalPorProd.get(s.producto_id) ?? 0) + s.cantidad);
  }

  const precioDetalPorProd = new Map<string, number>();
  for (const p of precios ?? []) {
    const l = p.listas_precios as unknown as { codigo: string; es_default: boolean } | null;
    if (l?.es_default) precioDetalPorProd.set(p.producto_id, Number(p.precio));
  }

  const rows: InventarioRow[] = (productos ?? []).map((p: any) => {
    const total = totalPorProd.get(p.id) ?? 0;
    let estado: InventarioRow["estado_stock"] = null;
    if (p.es_inventariable) {
      if (total === 0) estado = "sin_stock";
      else if (total <= p.stock_minimo_alerta) estado = "stock_bajo";
      else estado = "ok";
    }
    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      tipo: p.tipo,
      categoria_id: p.categoria_id,
      categoria_nombre: p.categorias?.nombre ?? null,
      es_inventariable: p.es_inventariable,
      activo: p.activo,
      stock_minimo_alerta: p.stock_minimo_alerta,
      costo_unitario: Number(p.costo_unitario),
      impuesto_porcentaje: p.impuestos ? Number(p.impuestos.porcentaje) : null,
      cantidad_total: total,
      precio_detal: precioDetalPorProd.get(p.id) ?? null,
      estado_stock: estado,
      cantidad_por_ubicacion: cantidadPorProd.get(p.id) ?? {},
    };
  });

  return (
    <InventarioClient
      rows={rows}
      categorias={categorias}
      ubicaciones={ubicaciones.filter((u) => u.activa)}
      impuestos={impuestos}
      listasPrecios={listasPrecios}
    />
  );
}
