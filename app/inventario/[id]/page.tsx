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

  const [{ data: producto }, { data: stock }, { data: precios }, { data: historial }, { data: ajustes }, { data: transaccionItems }, categorias, ubicaciones, impuestos, listasPrecios] =
    await Promise.all([
      sb.from("productos").select("*, categorias(id, nombre), impuestos(id, nombre, porcentaje)").eq("id", id).single(),
      sb.from("stock_por_ubicacion").select("cantidad, ubicaciones(id, nombre, tipo)").eq("producto_id", id),
      sb.from("precios_producto").select("lista_precio_id, precio, listas_precios(codigo, nombre, es_default, orden)").eq("producto_id", id),
      sb.from("ventas_historicas_mensuales").select("anio, mes, cantidad_vendida, total").eq("producto_id", id).order("anio", { ascending: false }).order("mes", { ascending: false }),
      sb.from("ajustes_inventario").select("id, cantidad_antes, cantidad_despues, diferencia, motivo, notas, fecha, ubicaciones(nombre)").eq("producto_id", id).order("fecha", { ascending: false }),
      // TODAS las transacciones del producto: para análisis de costos (compras) y para histórico.
      sb.from("transaccion_items")
        .select(
          "id, cantidad, costo_unitario, precio_unitario, subtotal, transaccion_id, " +
          "ubicacion_origen_id, ubicacion_destino_id, " +
          "transacciones!inner(id, tipo, fecha, notas, origen)"
        )
        .eq("producto_id", id),
      getCategorias(),
      getUbicaciones(),
      getImpuestos(),
      getListasPrecios(),
    ]);

  if (!producto) notFound();

  // Lookup de nombres de ubicaciones (usadas en cualquier transacción del producto).
  const ubiNombrePorId = new Map((ubicaciones ?? []).map((u) => [u.id, u.nombre as string]));

  // Histórico completo de transacciones (ventas + compras + traslados).
  const historialTx = ((transaccionItems ?? []) as any[])
    .map((it) => ({
      id: it.id as string,
      transaccion_id: it.transaccion_id as string,
      fecha: it.transacciones?.fecha as string,
      tipo: it.transacciones?.tipo as "venta" | "compra" | "traslado",
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precio_unitario ?? 0),
      costo_unitario: Number(it.costo_unitario ?? 0) || Number(it.precio_unitario ?? 0),
      subtotal: Number(it.subtotal ?? 0),
      ubicacion_origen_nombre: it.ubicacion_origen_id ? ubiNombrePorId.get(it.ubicacion_origen_id) ?? null : null,
      ubicacion_destino_nombre: it.ubicacion_destino_id ? ubiNombrePorId.get(it.ubicacion_destino_id) ?? null : null,
      notas: (it.transacciones?.notas as string | null) ?? null,
      origen: (it.transacciones?.origen as string | null) ?? "manual",
    }))
    .filter((t) => t.fecha) // descartar filas sin transacción asociada
    .sort((a, b) => b.fecha.localeCompare(a.fecha)); // más reciente primero

  // Análisis de costos: solo las COMPRAS del histórico.
  const compras = historialTx.filter((t) => t.tipo === "compra" && t.cantidad > 0 && t.costo_unitario > 0);
  const comprasOrdenadas = [...compras].sort((a, b) => a.fecha.localeCompare(b.fecha));
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
      historialTransacciones={historialTx}
      isMaestro={perfil.rol === "maestro"}
    />
  );
}
