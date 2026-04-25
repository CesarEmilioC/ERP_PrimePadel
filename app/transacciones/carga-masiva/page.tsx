import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireProfile } from "@/lib/auth";
import { CargaMasivaClient } from "./carga-masiva-client";

export const dynamic = "force-dynamic";

export default async function CargaMasivaPage() {
  const perfil = await requireProfile();
  const sb = sbAdmin();

  const [{ data: productos }, { data: ubicaciones }, { data: stock }] = await Promise.all([
    sb.from("productos").select("id, codigo, nombre, activo, es_inventariable").order("nombre"),
    sb.from("ubicaciones").select("id, nombre, activa").order("orden"),
    sb.from("stock_por_ubicacion").select("producto_id, ubicacion_id, cantidad"),
  ]);

  const stockPorProd: Record<string, Record<string, number>> = {};
  for (const s of stock ?? []) {
    if (!stockPorProd[s.producto_id]) stockPorProd[s.producto_id] = {};
    stockPorProd[s.producto_id][s.ubicacion_id] = Number(s.cantidad);
  }

  const productosOpt = (productos ?? []).map((p: any) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    activo: p.activo,
    es_inventariable: p.es_inventariable,
    stock_por_ubicacion: stockPorProd[p.id] ?? {},
  }));

  return (
    <CargaMasivaClient
      catalogo={{
        productos: productosOpt,
        ubicaciones: (ubicaciones ?? []).map((u: any) => ({ id: u.id, nombre: u.nombre, activa: u.activa })),
      }}
      soloVentas={perfil.rol === "recepcion"}
    />
  );
}
