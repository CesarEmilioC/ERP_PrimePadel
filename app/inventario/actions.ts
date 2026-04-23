"use server";

import { revalidatePath } from "next/cache";
import { productoSchema, ajusteInventarioSchema } from "@/lib/validators/producto";
import { sbAdmin } from "@/lib/supabase/admin-server";

export async function createProducto(input: unknown, precios: { lista_precio_id: string; precio: number }[] = []) {
  const parsed = productoSchema.parse(input);
  const sb = sbAdmin();
  const { data, error } = await sb.from("productos").insert(parsed).select("id").single();
  if (error) return { error: error.message };
  if (precios.length > 0) {
    const payload = precios.filter((p) => p.precio > 0).map((p) => ({ ...p, producto_id: data.id }));
    if (payload.length > 0) {
      const { error: e2 } = await sb.from("precios_producto").insert(payload);
      if (e2) return { error: e2.message };
    }
  }
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}

export async function updateProducto(id: string, input: unknown, precios: { lista_precio_id: string; precio: number }[] = []) {
  const parsed = productoSchema.parse(input);
  const sb = sbAdmin();
  const { error } = await sb.from("productos").update(parsed).eq("id", id);
  if (error) return { error: error.message };
  // Reemplazar precios: borramos y reinsertamos las listas entregadas.
  if (precios.length > 0) {
    const ids = precios.map((p) => p.lista_precio_id);
    await sb.from("precios_producto").delete().eq("producto_id", id).in("lista_precio_id", ids);
    const payload = precios.filter((p) => p.precio > 0).map((p) => ({ ...p, producto_id: id }));
    if (payload.length > 0) {
      const { error: e2 } = await sb.from("precios_producto").insert(payload);
      if (e2) return { error: e2.message };
    }
  }
  revalidatePath("/inventario");
  revalidatePath(`/inventario/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteProducto(id: string) {
  const sb = sbAdmin();
  // Si tiene histórico o transacciones, soft-delete.
  const [{ count: histCount }, { count: txItems }] = await Promise.all([
    sb.from("ventas_historicas_mensuales").select("*", { head: true, count: "exact" }).eq("producto_id", id),
    sb.from("transaccion_items").select("*", { head: true, count: "exact" }).eq("producto_id", id),
  ]);
  if ((histCount ?? 0) + (txItems ?? 0) > 0) {
    const { error } = await sb.from("productos").update({ activo: false }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/inventario");
    return { ok: true, softDeleted: true };
  }
  const { error } = await sb.from("productos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/inventario");
  return { ok: true };
}

export async function registrarAjusteInventario(input: unknown) {
  const parsed = ajusteInventarioSchema.parse(input);
  const sb = sbAdmin();
  const { data, error } = await sb.rpc("registrar_ajuste_inventario", {
    p_producto: parsed.producto_id,
    p_ubicacion: parsed.ubicacion_id,
    p_cantidad_nueva: parsed.cantidad_nueva,
    p_motivo: parsed.motivo,
    p_notas: parsed.notas ?? null,
    p_usuario: null,
  });
  if (error) return { error: error.message };
  revalidatePath("/inventario");
  revalidatePath(`/inventario/${parsed.producto_id}`);
  revalidatePath("/dashboard");
  return { ok: true, id: data as string };
}
