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

  let creadas = 0;
  const fallidas: { ticket: string | null; razon: string }[] = [];

  for (const g of grupos) {
    const items = g.items.map((it) => ({
      producto_id: it.producto_id,
      ubicacion_origen_id: g.tipo === "venta" ? it.ubicacion_id : null,
      ubicacion_destino_id: g.tipo === "compra" ? it.ubicacion_id : null,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
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
