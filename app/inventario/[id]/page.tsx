import { notFound } from "next/navigation";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { getCategorias, getImpuestos, getListasPrecios, getUbicaciones } from "@/lib/queries";
import { requireAdmin } from "@/lib/auth";
import { DetalleClient } from "./detalle-client";

export const dynamic = "force-dynamic";

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const perfil = await requireAdmin();
  const { id } = await params;
  const sb = sbAdmin();

  const [{ data: producto }, { data: stock }, { data: precios }, { data: historial }, { data: ajustes }, categorias, ubicaciones, impuestos, listasPrecios] =
    await Promise.all([
      sb.from("productos").select("*, categorias(id, nombre), impuestos(id, nombre, porcentaje)").eq("id", id).single(),
      sb.from("stock_por_ubicacion").select("cantidad, ubicaciones(id, nombre, tipo)").eq("producto_id", id),
      sb.from("precios_producto").select("lista_precio_id, precio, listas_precios(codigo, nombre, es_default, orden)").eq("producto_id", id),
      sb.from("ventas_historicas_mensuales").select("anio, mes, cantidad_vendida, total").eq("producto_id", id).order("anio", { ascending: false }).order("mes", { ascending: false }),
      sb.from("ajustes_inventario").select("id, cantidad_antes, cantidad_despues, diferencia, motivo, notas, fecha, ubicaciones(nombre)").eq("producto_id", id).order("fecha", { ascending: false }).limit(50),
      getCategorias(),
      getUbicaciones(),
      getImpuestos(),
      getListasPrecios(),
    ]);

  if (!producto) notFound();

  const ubicacionesConStock = (stock ?? [])
    .map((s: any) => ({ id: s.ubicaciones.id, nombre: s.ubicaciones.nombre, tipo: s.ubicaciones.tipo, cantidad: s.cantidad }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const preciosOrdenados = (precios ?? [])
    .map((p: any) => ({
      lista_precio_id: p.lista_precio_id,
      precio: Number(p.precio),
      codigo: p.listas_precios?.codigo ?? "",
      nombre: p.listas_precios?.nombre ?? "",
      orden: p.listas_precios?.orden ?? 999,
    }))
    .sort((a, b) => a.orden - b.orden);

  // Si el histórico no tiene total monetario (xlsx sin columnas de plata), estimar con precio detal.
  const precioDetal = preciosOrdenados.find((p) => p.codigo === "DETAL")?.precio ?? 0;
  const historialEstimado = (historial ?? []).map((h: any) => {
    const totalReal = Number(h.total);
    const cantidad = Number(h.cantidad_vendida);
    return {
      ...h,
      cantidad_vendida: cantidad,
      total: totalReal > 0 ? totalReal : cantidad * precioDetal,
      total_estimado: totalReal === 0 && cantidad > 0,
    };
  });

  return (
    <DetalleClient
      producto={producto}
      ubicacionesConStock={ubicacionesConStock}
      ubicacionesDisponibles={ubicaciones.filter((u) => u.activa).map((u) => ({ id: u.id, nombre: u.nombre, tipo: u.tipo }))}
      precios={preciosOrdenados}
      historialMensual={historialEstimado}
      ajustes={(ajustes ?? []) as any}
      categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
      impuestos={impuestos.map((i) => ({ id: i.id, nombre: i.nombre, porcentaje: Number(i.porcentaje) }))}
      listasPrecios={listasPrecios.map((l) => ({ id: l.id, codigo: l.codigo, nombre: l.nombre, es_default: l.es_default }))}
      isMaestro={perfil.rol === "maestro"}
    />
  );
}
