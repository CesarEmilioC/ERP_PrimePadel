import { sbAdmin } from "@/lib/supabase/admin-server";
import {
  getCategorias,
  getVentasHistoricasPorMes,
  getStockPorUbicacion,
  getStockTotalPorProducto,
  getSkusPorCategoria,
  getAlertasDetalladas,
  getTopPorDiaSemana,
  getVentasPorDiaSemana,
} from "@/lib/queries";
import { requireMaestro } from "@/lib/auth";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireMaestro();
  const sb = sbAdmin();

  const [
    { count: nProductos },
    { count: nInv },
    { count: nUbi },
    { data: stockTotales },
    { count: nAlertas },
    historico,
    categorias,
    stockPorUbi,
    skusPorCategoria,
    alertasDet,
    topPorDia,
    ventasPorDia,
  ] = await Promise.all([
    sb.from("productos").select("*", { head: true, count: "exact" }).eq("activo", true),
    sb.from("productos").select("*", { head: true, count: "exact" }).eq("activo", true).eq("es_inventariable", true),
    sb.from("ubicaciones").select("*", { head: true, count: "exact" }).eq("activa", true),
    sb.from("v_stock_total").select("cantidad_total, valor_total_costo, estado_stock"),
    sb.from("v_stock_total").select("*", { head: true, count: "exact" }).in("estado_stock", ["stock_bajo", "sin_stock"]),
    getVentasHistoricasPorMes(),
    getCategorias(),
    getStockPorUbicacion(),
    getSkusPorCategoria(),
    getAlertasDetalladas(),
    getTopPorDiaSemana(),
    getVentasPorDiaSemana(),
  ]);
  const stockTotalPorProducto = await getStockTotalPorProducto();

  const totalStock = (stockTotales ?? []).reduce((a: number, r: any) => a + Number(r.cantidad_total ?? 0), 0);
  const valorInv = (stockTotales ?? []).reduce((a: number, r: any) => a + Number(r.valor_total_costo ?? 0), 0);

  return (
    <DashboardClient
      stats={{
        nProductosActivos: nProductos ?? 0,
        nInventariables: nInv ?? 0,
        nUbicaciones: nUbi ?? 0,
        totalStockActual: totalStock,
        valorInventario: valorInv,
        nAlertas: nAlertas ?? 0,
      }}
      historico={(historico as any[]).map((h) => ({
        anio: h.anio,
        mes: h.mes,
        cantidad_vendida: Number(h.cantidad_vendida),
        total: Number(h.total),
        productos: h.productos,
      }))}
      categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
      stockPorUbicacion={stockPorUbi}
      skusPorCategoria={skusPorCategoria}
      alertasDetalladas={alertasDet}
      topPorDiaSemana={topPorDia}
      ventasPorDiaSemana={ventasPorDia}
      stockTotalPorProducto={stockTotalPorProducto}
    />
  );
}
