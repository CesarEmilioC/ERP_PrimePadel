import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireMaestro } from "@/lib/auth";
import { TarifasClient } from "./tarifas-client";

export const dynamic = "force-dynamic";

export default async function TarifasPage() {
  await requireMaestro();
  const sb = sbAdmin();

  const [{ data: listas }, { data: precios }] = await Promise.all([
    sb.from("listas_precios").select("id, codigo, nombre, orden, activa, es_default, descuento_porcentaje").order("orden", { ascending: true }),
    sb.from("precios_producto").select("lista_precio_id"),
  ]);

  const conteo: Record<string, number> = {};
  for (const p of (precios ?? []) as any[]) {
    conteo[p.lista_precio_id] = (conteo[p.lista_precio_id] ?? 0) + 1;
  }

  return (
    <TarifasClient
      tarifas={(listas ?? []).map((l: any) => ({
        id: l.id,
        codigo: l.codigo,
        nombre: l.nombre,
        orden: l.orden,
        activa: l.activa,
        es_default: l.es_default,
        descuento_porcentaje: Number(l.descuento_porcentaje ?? 0),
        productos: conteo[l.id] ?? 0,
      }))}
    />
  );
}
