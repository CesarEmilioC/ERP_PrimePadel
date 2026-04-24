"use server";

import { revalidatePath } from "next/cache";
import { ubicacionSchema } from "@/lib/validators/producto";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireAdmin } from "@/lib/auth";

export async function createUbicacion(input: unknown) {
  await requireAdmin();
  const parsed = ubicacionSchema.parse(input);
  const { error } = await sbAdmin().from("ubicaciones").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/ubicaciones");
  revalidatePath("/inventario");
  return { ok: true };
}

export async function updateUbicacion(id: string, input: unknown) {
  await requireAdmin();
  const parsed = ubicacionSchema.parse(input);
  const { error } = await sbAdmin().from("ubicaciones").update(parsed).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/ubicaciones");
  revalidatePath("/inventario");
  return { ok: true };
}

export async function deleteUbicacion(id: string) {
  await requireAdmin();
  const sb = sbAdmin();
  // No permitir borrar si tiene stock o transacciones asociadas: desactivamos en ese caso.
  const [{ count: nStock }, { count: nItemsOrig }, { count: nItemsDest }] = await Promise.all([
    sb.from("stock_por_ubicacion").select("*", { head: true, count: "exact" }).eq("ubicacion_id", id),
    sb.from("transaccion_items").select("*", { head: true, count: "exact" }).eq("ubicacion_origen_id", id),
    sb.from("transaccion_items").select("*", { head: true, count: "exact" }).eq("ubicacion_destino_id", id),
  ]);
  const total = (nStock ?? 0) + (nItemsOrig ?? 0) + (nItemsDest ?? 0);
  if (total > 0) {
    const { error } = await sb.from("ubicaciones").update({ activa: false }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/ubicaciones");
    return { ok: true, softDeleted: true };
  }
  const { error } = await sb.from("ubicaciones").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/ubicaciones");
  return { ok: true };
}
