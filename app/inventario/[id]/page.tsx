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
          "ubicacion_origen_id, ubicacion_destino_id, lista_precio_id, " +
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
  // Lookup de nombres de tarifas (lista_precio_id → nombre).
  const tarifaNombrePorId = new Map((listasPrecios ?? []).map((l) => [l.id, l.nombre as string]));

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
      lista_precio_id: (it.lista_precio_id as string | null) ?? null,
      tarifa_nombre: it.lista_precio_id ? (tarifaNombrePorId.get(it.lista_precio_id) ?? null) : null,
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

  // Ventas (sistema) para "valor total vendido".
  const ventas = historialTx.filter((t) => t.tipo === "venta" && t.cantidad > 0);
  const valorTotalVendido = ventas.reduce((s, r) => s + r.subtotal, 0);
  const cantidadTotalVendida = ventas.reduce((s, r) => s + r.cantidad, 0);

  const analisisCostos = {
    numCompras: comprasOrdenadas.length,
    cantidadTotalCompras,
    valorTotalCompras,
    costoPromedioCompra,
    ultimaCompraFecha: ultimaCompra?.fecha ?? null,
    ultimaCompraCosto: ultimaCompra?.costo_unitario ?? null,
    ultimaCompraCantidad: ultimaCompra?.cantidad ?? null,
    valorTotalVendido,
    cantidadTotalVendida,
    numVentas: ventas.length,
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

  // Histórico mensual = Alegra (importado) + ventas reales registradas en el ERP.
  // Si el histórico de Alegra no trae total (solo cantidad), se estima con precio detal.
  const precioDetal = preciosOrdenados.find((p) => p.codigo === "DETAL")?.precio ?? 0;
  const mensualMap = new Map<string, { anio: number; mes: number; cantidad_vendida: number; total: number; total_estimado: boolean }>();

  for (const h of (historial ?? []) as any[]) {
    const anio = Number(h.anio);
    const mes = Number(h.mes);
    const cantidad = Number(h.cantidad_vendida);
    const totalReal = Number(h.total);
    mensualMap.set(`${anio}-${mes}`, {
      anio, mes,
      cantidad_vendida: cantidad,
      total: totalReal > 0 ? totalReal : cantidad * precioDetal,
      total_estimado: totalReal === 0 && cantidad > 0,
    });
  }

  // Sumar las ventas registradas en el sistema (zona Bogotá), mes a mes.
  for (const v of ventas) {
    const dBogota = new Date(new Date(v.fecha).getTime() - 5 * 60 * 60 * 1000);
    const anio = dBogota.getUTCFullYear();
    const mes = dBogota.getUTCMonth() + 1;
    const key = `${anio}-${mes}`;
    const cur = mensualMap.get(key) ?? { anio, mes, cantidad_vendida: 0, total: 0, total_estimado: false };
    cur.cantidad_vendida += v.cantidad;
    cur.total += v.subtotal;
    mensualMap.set(key, cur);
  }

  const historialEstimado = [...mensualMap.values()].sort(
    (a, b) => b.anio * 12 + b.mes - (a.anio * 12 + a.mes),
  );

  // Historial de ajustes: excluir las reversas automáticas de transacciones
  // (esas tienen notas que empiezan con "Reversa"). Solo quedan los ajustes
  // manuales reales (conteo físico, merma, rotura, corrección, ingreso inicial).
  const ajustesManuales = ((ajustes ?? []) as any[]).filter(
    (a) => !(typeof a.notas === "string" && a.notas.trim().toLowerCase().startsWith("reversa")),
  );

  return (
    <DetalleClient
      producto={producto}
      ubicacionesConStock={ubicacionesConStock}
      ubicacionesDisponibles={ubicaciones.filter((u) => u.activa).map((u) => ({ id: u.id, nombre: u.nombre, tipo: u.tipo }))}
      precios={preciosOrdenados}
      historialMensual={historialEstimado}
      ajustes={ajustesManuales as any}
      categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
      impuestos={impuestos.map((i) => ({ id: i.id, nombre: i.nombre, porcentaje: Number(i.porcentaje) }))}
      listasPrecios={listasPrecios.map((l) => ({ id: l.id, codigo: l.codigo, nombre: l.nombre, es_default: l.es_default, descuento_porcentaje: Number(l.descuento_porcentaje ?? 0) }))}
      analisisCostos={analisisCostos}
      historialTransacciones={historialTx}
      isMaestro={perfil.rol === "maestro"}
    />
  );
}
