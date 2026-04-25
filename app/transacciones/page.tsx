import { sbAdmin } from "@/lib/supabase/admin-server";
import { getUbicaciones, getListasPrecios } from "@/lib/queries";
import { requireProfile, emailToDisplayUsername } from "@/lib/auth";
import { TransaccionesClient } from "./transacciones-client";

export const dynamic = "force-dynamic";

export default async function TransaccionesPage() {
  const perfil = await requireProfile();
  const sb = sbAdmin();

  // Recepción solo ve ventas; admin/maestro ven todo.
  const txsQuery = sb.from("transacciones").select(`
    id, tipo, fecha, total, notas, origen, usuario_id,
    transaccion_items(producto_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, precio_unitario, lista_precio_id, productos(codigo, nombre))
  `).order("fecha", { ascending: false }).limit(200);
  const txsQueryFinal = perfil.rol === "recepcion" ? txsQuery.eq("tipo", "venta") : txsQuery;

  const [
    { data: txs },
    { data: productos },
    { data: stock },
    { data: precios },
    { data: perfilesUsuarios },
    { data: authList },
    ubicaciones,
    listasPrecios,
  ] = await Promise.all([
    txsQueryFinal,
    sb.from("productos").select("id, codigo, nombre, tipo, es_inventariable, activo, costo_unitario").eq("activo", true).order("nombre", { ascending: true }),
    sb.from("stock_por_ubicacion").select("producto_id, ubicacion_id, cantidad"),
    sb.from("precios_producto").select("producto_id, precio, listas_precios(es_default)"),
    sb.from("perfiles").select("user_id, nombre"),
    sb.auth.admin.listUsers({ perPage: 500 }),
    getUbicaciones(),
    getListasPrecios(),
  ]);

  const stockPorProd = new Map<string, Record<string, number>>();
  for (const s of stock ?? []) {
    if (!stockPorProd.has(s.producto_id)) stockPorProd.set(s.producto_id, {});
    stockPorProd.get(s.producto_id)![s.ubicacion_id] = s.cantidad;
  }

  const precioPorProd = new Map<string, number>();
  for (const p of precios ?? []) {
    if ((p.listas_precios as any)?.es_default) {
      precioPorProd.set(p.producto_id, Number(p.precio));
    }
  }

  const productosOpt = (productos ?? []).map((p: any) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    es_inventariable: p.es_inventariable,
    tipo: p.tipo,
    precio_detal: precioPorProd.get(p.id) ?? null,
    costo_unitario: Number(p.costo_unitario ?? 0),
    stock_por_ubicacion: stockPorProd.get(p.id) ?? {},
  }));

  const ubiNombrePorId = new Map(ubicaciones.map((u) => [u.id, u.nombre]));

  // Mapa user_id → { nombre, username }
  const perfilesPorId = new Map((perfilesUsuarios ?? []).map((p: any) => [p.user_id, p.nombre as string]));
  const usernamesPorId = new Map(
    (authList?.users ?? []).map((u) => [u.id, emailToDisplayUsername(u.email ?? null)]),
  );

  const transacciones = (txs ?? []).map((t: any) => ({
    id: t.id,
    tipo: t.tipo,
    fecha: t.fecha,
    total: Number(t.total),
    notas: t.notas,
    origen: t.origen,
    usuario_id: t.usuario_id,
    usuario_nombre: t.usuario_id ? (perfilesPorId.get(t.usuario_id) ?? null) : null,
    usuario_username: t.usuario_id ? (usernamesPorId.get(t.usuario_id) ?? null) : null,
    items: (t.transaccion_items ?? []).map((it: any) => ({
      producto_id: it.producto_id,
      ubicacion_origen_id: it.ubicacion_origen_id,
      ubicacion_destino_id: it.ubicacion_destino_id,
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precio_unitario),
      lista_precio_id: it.lista_precio_id,
      productos: it.productos,
      ubicacion_origen_nombre: it.ubicacion_origen_id ? ubiNombrePorId.get(it.ubicacion_origen_id) ?? null : null,
      ubicacion_destino_nombre: it.ubicacion_destino_id ? ubiNombrePorId.get(it.ubicacion_destino_id) ?? null : null,
    })),
  }));

  return (
    <TransaccionesClient
      transacciones={transacciones}
      productos={productosOpt}
      ubicaciones={ubicaciones.filter((u) => u.activa).map((u) => ({ id: u.id, nombre: u.nombre }))}
      listasPrecios={listasPrecios}
      perfilActual={{ rol: perfil.rol, user_id: perfil.user_id }}
    />
  );
}
