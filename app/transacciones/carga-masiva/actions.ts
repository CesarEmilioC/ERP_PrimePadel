"use server";

import { revalidatePath } from "next/cache";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireProfile } from "@/lib/auth";
import { buildPlantillaCSV, type Catalogo, type TransaccionAgrupada } from "@/lib/csv/transacciones";

export type ImportResult = {
  ok: boolean;
  creadas: number;
  fallidas: { ticket: string | null; razon: string }[];
};

export async function importarTransacciones(grupos: TransaccionAgrupada[]): Promise<ImportResult> {
  const perfil = await requireProfile();
  const sb = sbAdmin();

  // Pre-cargar costo actual de los productos involucrados (para snapshot en ventas).
  const prodIds = Array.from(new Set(grupos.flatMap((g) => g.items.map((it) => it.producto_id))));
  const { data: productosCosto } = prodIds.length
    ? await sb.from("productos").select("id, costo_unitario").in("id", prodIds)
    : { data: [] as { id: string; costo_unitario: number }[] };
  const costoPorProd = new Map(
    (productosCosto ?? []).map((p: any) => [p.id as string, Number(p.costo_unitario ?? 0)]),
  );

  let creadas = 0;
  const fallidas: { ticket: string | null; razon: string }[] = [];

  for (const g of grupos) {
    // Recepción no puede importar compras.
    if (perfil.rol === "recepcion" && g.tipo === "compra") {
      fallidas.push({ ticket: g.ticket, razon: "Tu rol no permite registrar compras." });
      continue;
    }
    const items = g.items.map((it) => ({
      producto_id: it.producto_id,
      // venta: origen. compra: destino. traslado: ambos.
      ubicacion_origen_id: g.tipo === "compra" ? null : it.ubicacion_id,
      ubicacion_destino_id: g.tipo === "venta" ? null : (g.tipo === "traslado" ? it.ubicacion_destino_id : it.ubicacion_id),
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      // En compra/traslado el costo coincide con el precio del CSV.
      // En venta usamos el costo actual del producto (snapshot).
      costo_unitario: g.tipo === "compra" || g.tipo === "traslado"
        ? it.precio_unitario
        : (costoPorProd.get(it.producto_id) ?? 0),
      lista_precio_id: null,
    }));

    const { error } = await sb.rpc("registrar_transaccion", {
      p_tipo: g.tipo,
      p_fecha: g.fecha,
      p_usuario: perfil.user_id,
      p_notas: g.notas,
      p_origen: "csv",
      p_items: items,
    });

    if (error) {
      fallidas.push({ ticket: g.ticket, razon: error.message });
    } else {
      creadas++;
    }
  }

  revalidatePath("/transacciones");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");

  return { ok: fallidas.length === 0, creadas, fallidas };
}

// ---------------------------------------------------------------------------
// Descargar plantilla CSV dinámica con una fila por (producto × tipo).
// Recepción solo recibe venta y traslado; admin/maestro reciben los 3 tipos.
// ---------------------------------------------------------------------------
export async function descargarPlantillaCSV(): Promise<{ ok: true; csv: string; filename: string } | { error: string }> {
  const perfil = await requireProfile();
  const sb = sbAdmin();

  const [{ data: productos }, { data: ubicaciones }, { data: precios }, { data: stock }] = await Promise.all([
    sb.from("productos").select("id, codigo, nombre, activo, es_inventariable, costo_unitario").eq("activo", true).order("nombre"),
    sb.from("ubicaciones").select("id, nombre, tipo, activa").eq("activa", true).order("orden"),
    sb.from("precios_producto").select("producto_id, precio, listas_precios!inner(es_default)").eq("listas_precios.es_default", true),
    sb.from("stock_por_ubicacion").select("producto_id, ubicacion_id, cantidad"),
  ]);

  const precioDetalPorProd = new Map<string, number>();
  for (const p of (precios ?? []) as any[]) {
    precioDetalPorProd.set(p.producto_id, Number(p.precio ?? 0));
  }

  const stockPorProd = new Map<string, Record<string, number>>();
  for (const s of (stock ?? []) as any[]) {
    if (!stockPorProd.has(s.producto_id)) stockPorProd.set(s.producto_id, {});
    stockPorProd.get(s.producto_id)![s.ubicacion_id] = Number(s.cantidad);
  }

  const catalogo: Catalogo = {
    productos: (productos ?? []).map((p: any) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      activo: p.activo,
      es_inventariable: p.es_inventariable,
      precio_detal: precioDetalPorProd.get(p.id) ?? 0,
      costo_unitario: Number(p.costo_unitario ?? 0),
      stock_por_ubicacion: stockPorProd.get(p.id) ?? {},
    })),
    ubicaciones: (ubicaciones ?? []).map((u: any) => ({ id: u.id, nombre: u.nombre, tipo: u.tipo, activa: u.activa })),
  };

  const esRecepcion = perfil.rol === "recepcion";
  const csv = buildPlantillaCSV(catalogo, {
    incluyeCompras: !esRecepcion,
    incluyeTraslados: true,
  });

  const fecha = new Date().toISOString().slice(0, 10);
  const filename = `plantilla-transacciones-${fecha}.csv`;
  return { ok: true, csv, filename };
}
