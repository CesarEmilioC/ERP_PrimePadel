import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireProfile } from "@/lib/auth";
import { CargaMasivaClient } from "./carga-masiva-client";

export const dynamic = "force-dynamic";

export default async function CargaMasivaPage() {
  const perfil = await requireProfile();
  const sb = sbAdmin();

  const [{ data: productos }, { data: ubicaciones }, { data: stock }, { data: precios }, { data: tarifas }] = await Promise.all([
    sb.from("productos").select("id, codigo, nombre, activo, es_inventariable").order("nombre"),
    sb.from("ubicaciones").select("id, nombre, tipo, activa").order("orden"),
    sb.from("stock_por_ubicacion").select("producto_id, ubicacion_id, cantidad"),
    sb.from("precios_producto").select("producto_id, lista_precio_id, precio, listas_precios(es_default)"),
    sb.from("listas_precios").select("id, codigo, nombre, es_default, descuento_porcentaje, activa, orden").eq("activa", true).order("orden"),
  ]);

  const stockPorProd: Record<string, Record<string, number>> = {};
  for (const s of stock ?? []) {
    if (!stockPorProd[s.producto_id]) stockPorProd[s.producto_id] = {};
    stockPorProd[s.producto_id][s.ubicacion_id] = Number(s.cantidad);
  }

  // Mismo cálculo de precio_efectivo que el server action de descarga: precio
  // manual por (producto, tarifa) si existe, si no detal × (1 - desc%).
  const precioDetalPorProd: Record<string, number> = {};
  const overridePorProdTarifa = new Map<string, number>();
  for (const p of (precios ?? []) as any[]) {
    overridePorProdTarifa.set(`${p.producto_id}|${p.lista_precio_id}`, Number(p.precio));
    if (p.listas_precios?.es_default === true) {
      precioDetalPorProd[p.producto_id] = Number(p.precio ?? 0);
    }
  }

  const tarifasActivas = ((tarifas ?? []) as any[]).map((t) => ({
    id: t.id as string,
    codigo: t.codigo as string,
    nombre: t.nombre as string,
    es_default: !!t.es_default,
    descuento_porcentaje: Number(t.descuento_porcentaje ?? 0),
    activa: !!t.activa,
  }));

  function precioPorTarifa(productoId: string): Record<string, number> {
    // Permite precio 0 — útil para tarifas de regalo/cortesía con 100% desc.
    const detal = precioDetalPorProd[productoId];
    const out: Record<string, number> = {};
    for (const t of tarifasActivas) {
      const override = overridePorProdTarifa.get(`${productoId}|${t.id}`);
      let p: number | null = null;
      if (override != null && override >= 0) p = override;
      else if (t.es_default) p = detal != null && detal >= 0 ? detal : null;
      else if (detal != null && detal >= 0) p = Math.round(detal * (1 - t.descuento_porcentaje / 100));
      if (p != null && p >= 0) out[t.id] = p;
    }
    return out;
  }

  const productosOpt = (productos ?? []).map((p: any) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    activo: p.activo,
    es_inventariable: p.es_inventariable,
    precio_detal: precioDetalPorProd[p.id] ?? 0,
    stock_por_ubicacion: stockPorProd[p.id] ?? {},
    precios_por_tarifa: precioPorTarifa(p.id),
  }));

  return (
    <CargaMasivaClient
      catalogo={{
        productos: productosOpt,
        ubicaciones: (ubicaciones ?? []).map((u: any) => ({ id: u.id, nombre: u.nombre, tipo: u.tipo, activa: u.activa })),
        tarifas: tarifasActivas,
      }}
      soloVentas={perfil.rol === "recepcion"}
    />
  );
}
