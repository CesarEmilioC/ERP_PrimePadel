// Reporte resumen del estado de la BD tras las migraciones.
import { getAdminClient } from "./lib/supabase.mjs";

const s = getAdminClient();

async function count(t, filter) {
  let q = s.from(t).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}

const [
  nCat, nImp, nLis, nUbi,
  nProd, nProdInv, nServ,
  nPrecios, nStock,
  nHistTotal,
] = await Promise.all([
  count("categorias"),
  count("impuestos"),
  count("listas_precios"),
  count("ubicaciones"),
  count("productos"),
  count("productos", (q) => q.eq("es_inventariable", true)),
  count("productos", (q) => q.eq("tipo", "servicio")),
  count("precios_producto"),
  count("stock_por_ubicacion"),
  count("ventas_historicas_mensuales"),
]);

const { data: porMes } = await s
  .from("ventas_historicas_mensuales")
  .select("anio, mes")
  .order("anio", { ascending: true })
  .order("mes", { ascending: true });

const mesesSet = new Set(porMes?.map((r) => `${r.anio}-${String(r.mes).padStart(2,"0")}`));
const meses = [...mesesSet].sort();

const { data: top5 } = await s
  .from("ventas_historicas_mensuales")
  .select("cantidad_vendida, producto_id, productos!inner(codigo, nombre)")
  .order("cantidad_vendida", { ascending: false })
  .limit(5);

console.log("\n=== Resumen de migración Prime Padel ERP ===\n");
console.log(`Catálogos:`);
console.log(`  Categorías:       ${nCat}`);
console.log(`  Impuestos:        ${nImp}`);
console.log(`  Listas precios:   ${nLis}`);
console.log(`  Ubicaciones:      ${nUbi}`);
console.log(`\nProductos:`);
console.log(`  Total ítems:      ${nProd}`);
console.log(`  Inventariables:   ${nProdInv}`);
console.log(`  Servicios:        ${nServ}`);
console.log(`  Precios cargados: ${nPrecios}`);
console.log(`\nStock:`);
console.log(`  Filas por ubicación: ${nStock}  (pendiente: cargar conteo físico inicial)`);
console.log(`\nHistórico de ventas:`);
console.log(`  Filas totales:    ${nHistTotal}`);
console.log(`  Meses cubiertos:  ${meses.join(", ")}`);
console.log(`\nTop 5 filas más vendidas (un solo mes):`);
for (const r of top5 ?? []) {
  console.log(`  ${r.cantidad_vendida.toString().padStart(4)}  ${r.productos.codigo}  ${r.productos.nombre}`);
}
