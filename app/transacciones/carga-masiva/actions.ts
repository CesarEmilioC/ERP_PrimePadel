"use server";

import { revalidatePath } from "next/cache";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireProfile } from "@/lib/auth";
import type { TransaccionAgrupada } from "@/lib/csv/transacciones";

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
      ubicacion_origen_id: g.tipo === "venta" ? it.ubicacion_id : null,
      ubicacion_destino_id: g.tipo === "compra" ? it.ubicacion_id : null,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      // En compra el costo coincide con el precio del CSV (era el costo del
      // proveedor). En venta usamos el costo actual del producto en BD.
      costo_unitario: g.tipo === "compra" ? it.precio_unitario : (costoPorProd.get(it.producto_id) ?? 0),
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
