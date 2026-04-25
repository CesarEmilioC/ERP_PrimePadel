"use server";

import { revalidatePath } from "next/cache";
import { transaccionSchema } from "@/lib/validators/producto";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireProfile } from "@/lib/auth";

type ActionResult<T = unknown> =
  T extends object ? ({ ok: true } & T) | { error: string } : { ok: true } | { error: string };

// ---------------------------------------------------------------------------
// Crear transacción
// ---------------------------------------------------------------------------
export async function registrarTransaccion(input: unknown): Promise<ActionResult<{ id: string }>> {
  const perfil = await requireProfile();
  const parsed = transaccionSchema.parse(input);
  // Recepción solo puede registrar ventas.
  if (perfil.rol === "recepcion" && parsed.tipo !== "venta") {
    return { error: "Tu rol solo permite registrar ventas. Pídele a un admin que registre las compras y traslados." };
  }
  const { data, error } = await sbAdmin().rpc("registrar_transaccion", {
    p_tipo: parsed.tipo,
    p_fecha: parsed.fecha ?? null,
    p_usuario: perfil.user_id,
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

// ---------------------------------------------------------------------------
// Eliminar transacción (admin, o cajero dueño del mismo día)
// ---------------------------------------------------------------------------
export async function deleteTransaccion(id: string): Promise<ActionResult> {
  const perfil = await requireProfile();
  const tx = await fetchTxParaReversa(id);
  if (!tx) return { error: "Transacción no encontrada" };

  const permiso = checarPermisoEdicion(perfil, tx);
  if (!permiso.ok) return { error: permiso.error };

  const reversa = await aplicarReversaStock(tx);
  if (reversa.error) return { error: reversa.error };

  const { error } = await sbAdmin().from("transacciones").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/transacciones");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Editar transacción: borra original + crea nueva, con rollback si falla
// ---------------------------------------------------------------------------
export async function editarTransaccion(id: string, input: unknown): Promise<ActionResult<{ newId: string }>> {
  const perfil = await requireProfile();
  const parsed = transaccionSchema.parse(input);

  // Recepción solo puede tener ventas.
  if (perfil.rol === "recepcion" && parsed.tipo !== "venta") {
    return { error: "Tu rol solo permite editar ventas." };
  }

  const original = await fetchTxParaReversa(id);
  if (!original) return { error: "Transacción no encontrada" };

  const permiso = checarPermisoEdicion(perfil, original);
  if (!permiso.ok) return { error: permiso.error };

  // Snapshot completo de la original para poder rehacerla si la nueva falla.
  const snapshot = await fetchTxCompleta(id);
  if (!snapshot) return { error: "No se pudo capturar la transacción original" };

  // 1. Borrar original (revierte stock + DELETE row).
  const reversa = await aplicarReversaStock(original);
  if (reversa.error) return { error: "Error al revertir la transacción original: " + reversa.error };
  const { error: eDel } = await sbAdmin().from("transacciones").delete().eq("id", id);
  if (eDel) return { error: "Error al eliminar la transacción original: " + eDel.message };

  // 2. Crear nueva.
  const { data: newId, error: eIns } = await sbAdmin().rpc("registrar_transaccion", {
    p_tipo: parsed.tipo,
    p_fecha: parsed.fecha ?? snapshot.fecha,
    p_usuario: perfil.user_id,
    p_notas: parsed.notas ?? null,
    p_origen: parsed.origen,
    p_items: parsed.items,
  });

  if (eIns) {
    // 3. Rollback: rehacer la original con sus mismos datos.
    const { error: eRoll } = await sbAdmin().rpc("registrar_transaccion", {
      p_tipo: snapshot.tipo,
      p_fecha: snapshot.fecha,
      p_usuario: snapshot.usuario_id,
      p_notas: snapshot.notas,
      p_origen: snapshot.origen,
      p_items: snapshot.items,
    });
    if (eRoll) {
      return {
        error: `Error al editar (${eIns.message}). El rollback también falló (${eRoll.message}). Revisa el inventario manualmente.`,
      };
    }
    return { error: "Error al editar: " + eIns.message + " — Se restauró la versión original." };
  }

  revalidatePath("/transacciones");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
  return { ok: true, newId: newId as string };
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

type TxParaReversa = {
  id: string;
  tipo: "compra" | "venta" | "traslado";
  usuario_id: string | null;
  usuario_rol: "maestro" | "admin" | "recepcion" | null;
  fecha: string;
  items: {
    producto_id: string;
    ubicacion_origen_id: string | null;
    ubicacion_destino_id: string | null;
    cantidad: number;
    es_inventariable: boolean;
  }[];
};

async function fetchTxParaReversa(id: string): Promise<TxParaReversa | null> {
  const sb = sbAdmin();
  const { data, error } = await sb
    .from("transacciones")
    .select(
      "id, tipo, usuario_id, fecha, transaccion_items(producto_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, productos(es_inventariable))",
    )
    .eq("id", id)
    .single();
  if (error || !data) return null;

  let usuario_rol: TxParaReversa["usuario_rol"] = null;
  if (data.usuario_id) {
    const { data: perfilCreador } = await sb
      .from("perfiles")
      .select("rol")
      .eq("user_id", data.usuario_id)
      .maybeSingle();
    usuario_rol = (perfilCreador?.rol ?? null) as TxParaReversa["usuario_rol"];
  }

  return {
    id: data.id,
    tipo: data.tipo,
    usuario_id: data.usuario_id,
    usuario_rol,
    fecha: data.fecha,
    items: ((data as any).transaccion_items ?? []).map((it: any) => ({
      producto_id: it.producto_id,
      ubicacion_origen_id: it.ubicacion_origen_id,
      ubicacion_destino_id: it.ubicacion_destino_id,
      cantidad: Number(it.cantidad),
      es_inventariable: !!it.productos?.es_inventariable,
    })),
  };
}

type TxCompleta = {
  tipo: "compra" | "venta" | "traslado";
  fecha: string;
  usuario_id: string | null;
  notas: string | null;
  origen: string;
  items: any[];
};

async function fetchTxCompleta(id: string): Promise<TxCompleta | null> {
  const { data, error } = await sbAdmin()
    .from("transacciones")
    .select(
      "tipo, fecha, usuario_id, notas, origen, transaccion_items(producto_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, precio_unitario, lista_precio_id)",
    )
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return {
    tipo: data.tipo,
    fecha: data.fecha,
    usuario_id: data.usuario_id,
    notas: data.notas,
    origen: data.origen,
    items: ((data as any).transaccion_items ?? []).map((it: any) => ({
      producto_id: it.producto_id,
      ubicacion_origen_id: it.ubicacion_origen_id,
      ubicacion_destino_id: it.ubicacion_destino_id,
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precio_unitario),
      lista_precio_id: it.lista_precio_id,
    })),
  };
}

function checarPermisoEdicion(
  perfil: { rol: "maestro" | "admin" | "recepcion"; user_id: string },
  tx: TxParaReversa,
): { ok: true } | { ok: false; error: string } {
  // Maestro tiene control total.
  if (perfil.rol === "maestro") return { ok: true };

  // Admin: puede editar/eliminar cualquier transacción que NO haya sido creada por un maestro.
  if (perfil.rol === "admin") {
    if (tx.usuario_rol === "maestro") {
      return { ok: false, error: "Solo el rol Maestro puede modificar transacciones creadas por otro Maestro." };
    }
    return { ok: true };
  }

  // Recepción: solo sus propias transacciones del día actual.
  const esSuya = tx.usuario_id === perfil.user_id;
  const esHoy = mismaFechaLocal(tx.fecha, new Date());
  if (esSuya && esHoy) return { ok: true };
  return {
    ok: false,
    error: "Solo puedes modificar tus propias transacciones del día actual.",
  };
}

function mismaFechaLocal(iso: string, ref: Date) {
  const a = new Date(iso);
  return a.getFullYear() === ref.getFullYear()
    && a.getMonth() === ref.getMonth()
    && a.getDate() === ref.getDate();
}

// Revierte el efecto de una transacción sobre el stock (compra/venta/traslado).
async function aplicarReversaStock(tx: TxParaReversa): Promise<{ ok?: true; error?: string }> {
  const sb = sbAdmin();
  for (const it of tx.items) {
    if (!it.es_inventariable) continue;

    if (tx.tipo === "compra" && it.ubicacion_destino_id) {
      const actual = await cantidadActual(sb, it.producto_id, it.ubicacion_destino_id);
      const { error } = await sb.rpc("registrar_ajuste_inventario", {
        p_producto: it.producto_id,
        p_ubicacion: it.ubicacion_destino_id,
        p_cantidad_nueva: actual - it.cantidad,
        p_motivo: "correccion",
        p_notas: `Reversa de transacción ${tx.id}`,
        p_usuario: null,
      });
      if (error) return { error: error.message };
    } else if (tx.tipo === "venta" && it.ubicacion_origen_id) {
      const actual = await cantidadActual(sb, it.producto_id, it.ubicacion_origen_id);
      const { error } = await sb.rpc("registrar_ajuste_inventario", {
        p_producto: it.producto_id,
        p_ubicacion: it.ubicacion_origen_id,
        p_cantidad_nueva: actual + it.cantidad,
        p_motivo: "correccion",
        p_notas: `Reversa de transacción ${tx.id}`,
        p_usuario: null,
      });
      if (error) return { error: error.message };
    } else if (tx.tipo === "traslado" && it.ubicacion_origen_id && it.ubicacion_destino_id) {
      // En traslado: origen perdió cantidad, destino ganó. Reversa: origen + cant, destino - cant.
      const actualOrig = await cantidadActual(sb, it.producto_id, it.ubicacion_origen_id);
      const r1 = await sb.rpc("registrar_ajuste_inventario", {
        p_producto: it.producto_id,
        p_ubicacion: it.ubicacion_origen_id,
        p_cantidad_nueva: actualOrig + it.cantidad,
        p_motivo: "correccion",
        p_notas: `Reversa de traslado ${tx.id} (origen)`,
        p_usuario: null,
      });
      if (r1.error) return { error: r1.error.message };
      const actualDest = await cantidadActual(sb, it.producto_id, it.ubicacion_destino_id);
      const r2 = await sb.rpc("registrar_ajuste_inventario", {
        p_producto: it.producto_id,
        p_ubicacion: it.ubicacion_destino_id,
        p_cantidad_nueva: actualDest - it.cantidad,
        p_motivo: "correccion",
        p_notas: `Reversa de traslado ${tx.id} (destino)`,
        p_usuario: null,
      });
      if (r2.error) return { error: r2.error.message };
    }
  }
  return { ok: true };
}

async function cantidadActual(sb: any, producto_id: string, ubicacion_id: string): Promise<number> {
  const { data } = await sb
    .from("stock_por_ubicacion")
    .select("cantidad")
    .eq("producto_id", producto_id)
    .eq("ubicacion_id", ubicacion_id)
    .maybeSingle();
  return Number(data?.cantidad ?? 0);
}
