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

  const [{ data: producto }, { data: stock }, { data: precios }, { data: historial }, { data: ajustes }, { data: compras }, categorias, ubicaciones, impuestos, listasPrecios] =
    await Promise.all([
      sb.from("productos").select("*, categorias(id, nombre), impuestos(id, nombre, porcentaje)").eq("id", id).single(),
      sb.from("stock_por_ubicacion").select("cantidad, ubicaciones(id, nombre, tipo)").eq("producto_id", id),
      sb.from("precios_producto").select("lista_precio_id, precio, listas_precios(codigo, nombre, es_default, orden)").eq("producto_id", id),
      sb.from("ventas_historicas_mensuales").select("anio, mes, cantidad_vendida, total").eq("producto_id", id).order("anio", { ascending: false }).order("mes", { ascending: false }),
      sb.from("ajustes_inventario").select("id, cantidad_antes, cantidad_despues, diferencia, motivo, notas, fecha, ubicaciones(nombre)").eq("producto_id", id).order("fecha", { ascending: false }).limit(50),
      // Items de COMPRAS para calcular costo promedio, última compra, valor total.
      sb.from("transaccion_items")
        .select("cantidad, costo_unitario, precio_unitario, transacciones!inner(fecha, tipo)")
        .eq("producto_id", id)
        .eq("transacciones.tipo", "compra"),
      getCategorias(),
      getUbicaciones(),
      getImpuestos(),
      getListasPrecios(),
    ]);

  if (!producto) notFound();

  // Análisis de costos según compras registradas.
  const comprasRows = ((compras ?? []) as any[])
    .map((r) => ({
      fecha: r.transacciones?.fecha as string,
      cantidad: Number(r.cantidad),
      // Para compras antiguas costo_unitario puede ser 0; caer a precio_unitario.
      costo_unitario: Number(r.costo_unitario ?? 0) || Number(r.precio_unitario ?? 0),
    }))
    .filter((r) => r.fecha && r.cantidad > 0);
  const comprasOrdenadas = [...comprasRows].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const valorTotalCompras = comprasOrdenadas.reduce((s, r) => s + r.cantidad * r.costo_unitario, 0);
  const cantidadTotalCompras = comprasOrdenadas.reduce((s, r) => s + r.cantidad, 0);
  const costoPromedioCompra = cantidadTotalCompras > 0 ? valorTotalCompras / cantidadTotalCompras : 0;
  const ultimaCompra = comprasOrdenadas.at(-1) ?? null;
  const analisisCostos = {
    numCompras: comprasOrdenadas.length,
    cantidadTotalCompras,
    valorTotalCompras,
    costoPromedioCompra,
    ultimaCompraFecha: ultimaCompra?.fecha ?? null,
    ultimaCompraCosto: ultimaCompra?.costo_unitario ?? null,
    ultimaCompraCantidad: ultimaCompra?.cantidad ?? null,
  };

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
      listasPrecios={listasPrecios.map((l) => ({ id: l.id, codigo: l.codigo, nombre: l.nombre, es_default: l.es_default, descuento_porcentaje: Number(l.descuento_porcentaje ?? 0) }))}
      analisisCostos={analisisCostos}
      isMaestro={perfil.rol === "maestro"}
    />
  );
}
