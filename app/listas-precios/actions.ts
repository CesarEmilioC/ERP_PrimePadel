"use server";

import { revalidatePath } from "next/cache";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireMaestro } from "@/lib/auth";

type ActionResult = { ok: true } | { error: string };

function validarCodigo(s: string): string | null {
  if (!/^[A-Z0-9_]{2,30}$/.test(s)) {
    return "El código debe tener 2-30 caracteres en mayúsculas, números o guion bajo (ej. KEVIN_GARCIA).";
  }
  return null;
}

export async function createLista(input: { codigo: string; nombre: string; orden: number; activa: boolean }): Promise<ActionResult> {
  await requireMaestro();
  const codigo = input.codigo.trim().toUpperCase();
  const nombre = input.nombre.trim();
  if (!nombre) return { error: "El nombre es obligatorio." };
  const errCodigo = validarCodigo(codigo);
  if (errCodigo) return { error: errCodigo };

  const { error } = await sbAdmin().from("listas_precios").insert({
    codigo,
    nombre,
    orden: input.orden,
    activa: input.activa,
    es_default: false,
  });
  if (error) return { error: error.message };
  revalidatePath("/listas-precios");
  revalidatePath("/inventario");
  return { ok: true };
}

export async function updateLista(id: string, input: { codigo?: string; nombre?: string; orden?: number; activa?: boolean }): Promise<ActionResult> {
  await requireMaestro();
  const payload: Record<string, unknown> = {};
  if (input.nombre !== undefined) payload.nombre = input.nombre.trim();
  if (input.codigo !== undefined) {
    const codigo = input.codigo.trim().toUpperCase();
    const errCodigo = validarCodigo(codigo);
    if (errCodigo) return { error: errCodigo };
    payload.codigo = codigo;
  }
  if (input.orden !== undefined) payload.orden = input.orden;
  if (input.activa !== undefined) payload.activa = input.activa;

  const { error } = await sbAdmin().from("listas_precios").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/listas-precios");
  revalidatePath("/inventario");
  return { ok: true };
}

export async function deleteLista(id: string): Promise<ActionResult> {
  await requireMaestro();
  const sb = sbAdmin();
  // No permitir borrar la lista default.
  const { data: lista } = await sb.from("listas_precios").select("es_default").eq("id", id).maybeSingle();
  if (lista?.es_default) return { error: "No se puede eliminar la lista de precios marcada como default (Detal)." };

  // Si tiene precios asociados, marcamos como inactiva en lugar de borrar.
  const { count } = await sb.from("precios_producto").select("*", { head: true, count: "exact" }).eq("lista_precio_id", id);
  if ((count ?? 0) > 0) {
    const { error } = await sb.from("listas_precios").update({ activa: false }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/listas-precios");
    return { ok: true };
  }
  const { error } = await sb.from("listas_precios").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/listas-precios");
  return { ok: true };
}
