"use server";

import { revalidatePath } from "next/cache";
import { transaccionSchema } from "@/lib/validators/producto";
import { sbAdmin } from "@/lib/supabase/admin-server";

export async function registrarTransaccion(input: unknown) {
  const parsed = transaccionSchema.parse(input);
  const { data, error } = await sbAdmin().rpc("registrar_transaccion", {
    p_tipo: parsed.tipo,
    p_fecha: parsed.fecha ?? null,
    p_usuario: null,
    p_notas: parsed.notas ?? null,
    p_origen: parsed.origen,
    p_items: parsed.items,
  });
  if (error) return { error: error.message };
  revalidatePath("/transacciones");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
  return { ok: true, id: data as string };
}

export async function deleteTransaccion(id: string) {
  const sb = sbAdmin();
  // Revertir stock: obtenemos items, los deshacemos manualmente, luego borramos.
  const { data: tx, error: e0 } = await sb
    .from("transacciones")
    .select("id, tipo, transaccion_items(producto_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, productos(es_inventariable))")
    .eq("id", id)
    .single();
  if (e0) return { error: e0.message };
  if (!tx) return { error: "Transacción no encontrada" };

  for (const it of (tx as any).transaccion_items ?? []) {
    if (!it.productos?.es_inventariable) continue;
    if (tx.tipo === "compra" && it.ubicacion_destino_id) {
      await sb.rpc("registrar_ajuste_inventario", {
        p_producto: it.producto_id,
        p_ubicacion: it.ubicacion_destino_id,
        p_cantidad_nueva: await cantidadActual(sb, it.producto_id, it.ubicacion_destino_id) - it.cantidad,
        p_motivo: "correccion",
        p_notas: `Reversa por borrado de transacción ${id}`,
        p_usuario: null,
      });
    } else if (tx.tipo === "venta" && it.ubicacion_origen_id) {
      await sb.rpc("registrar_ajuste_inventario", {
        p_producto: it.producto_id,
        p_ubicacion: it.ubicacion_origen_id,
        p_cantidad_nueva: await cantidadActual(sb, it.producto_id, it.ubicacion_origen_id) + it.cantidad,
        p_motivo: "correccion",
        p_notas: `Reversa por borrado de transacción ${id}`,
        p_usuario: null,
      });
    }
  }

  const { error } = await sb.from("transacciones").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/transacciones");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
  return { ok: true };
}

async function cantidadActual(sb: any, producto_id: string, ubicacion_id: string): Promise<number> {
  const { data } = await sb.from("stock_por_ubicacion").select("cantidad").eq("producto_id", producto_id).eq("ubicacion_id", ubicacion_id).maybeSingle();
  return Number(data?.cantidad ?? 0);
}
