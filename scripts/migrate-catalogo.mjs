// Migra el catálogo de productos/servicios desde oldDatabase/inventario_Abr2026.csv
// hacia Supabase. Idempotente: hace upsert por código de producto.
//
// Uso:
//   node scripts/migrate-catalogo.mjs
//   node scripts/migrate-catalogo.mjs --dry-run    (solo imprime, no escribe)
//
// Pre-requisitos: schema.sql y seed.sql aplicados en Supabase.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Papa from "papaparse";
import { getAdminClient } from "./lib/supabase.mjs";
import {
  normalizarCategoria,
  normalizarImpuesto,
  parsePrecio,
  parseBool,
  limpiarTexto,
} from "./lib/normalize.mjs";

const CSV_PATH = resolve(process.cwd(), "oldDatabase/inventario_Abr2026.csv");
const DRY = process.argv.includes("--dry-run");

// Columnas relevantes del CSV → nuestras llaves internas.
const COLS = {
  tipo:           "Tipo de Producto (obligatorio)",
  categoria:      "Categoría de Inventarios / Servicios (obligatorio)",
  codigo:         "Código del Producto (obligatorio)",
  nombre:         "Nombre del Producto / Servicio (obligatorio)",
  inventariable:  "¿Inventariable? (obligatorio)",
  visibleFactura: "Visible en facturas de venta",
  stockMinimo:    "Stock mínimo",
  unidadMedida:   "Unidad de Medida Impresión Factura",
  refFabrica:     "Referencia de Fábrica",
  codigoBarras:   "Código de Barras",
  descripcion:    "Descripción Larga",
  impuestoCargo:  "Código Impuesto Cargo",
  incluyeIva:     "¿Incluye IVA en Precio de Venta?",
  marca:          "Marca",
  modelo:         "Modelo",
};

// Columnas de precio → código de lista_precios. Debe coincidir con seed.sql.
const PRECIO_COLS = [
  ["Precios  Detal consumidor Final", "DETAL"],
  ["Precio Equipo Prime JSDM",        "EQUIPO_PRIME"],
  ["Clases  Kevin Garcia",            "KEVIN_GARCIA"],
  ["Clases Bryan Perafan",            "BRYAN_PERAFAN"],
  ["Precio en 0",                     "ALTERNO_1"],
  ["Precio de venta 6",               "ALTERNO_2"],
  ["Precio de venta 7",               "ALTERNO_3"],
  ["Precio de venta 8",               "ALTERNO_4"],
  ["Precio de venta 9",               "ALTERNO_5"],
  ["Precio de venta 10",              "ALTERNO_6"],
  ["Precio de venta 11",              "ALTERNO_7"],
  ["Precio de venta 12",              "ALTERNO_8"],
];

// ---------------------------------------------------------------------------

function leerCSV() {
  // El archivo puede venir en Windows-1252 (export Alegra) o UTF-8 (si lo re-guardamos).
  // Detectamos por BOM UTF-8 o asumimos Windows-1252.
  const buf = readFileSync(CSV_PATH);
  let raw;
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    raw = buf.slice(3).toString("utf8");
  } else {
    raw = new TextDecoder("windows-1252").decode(buf);
  }
  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    console.warn(`⚠️  ${parsed.errors.length} warnings de parseo CSV (ignorables en la mayoría)`);
  }
  return parsed.data;
}

function mapTipo(raw) {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("servicio")) return "servicio";
  return "producto";
}

async function run() {
  console.log(`Leyendo ${CSV_PATH}...`);
  const filas = leerCSV();
  console.log(`  ${filas.length} filas.`);

  // Extraer categorías únicas normalizadas.
  const catSet = new Set();
  for (const f of filas) catSet.add(normalizarCategoria(f[COLS.categoria]));
  const categorias = [...catSet].sort();

  console.log(`\nCategorías detectadas (${categorias.length}):`);
  for (const c of categorias) console.log("  •", c);

  if (DRY) {
    console.log(`\n[dry-run] Ejemplo de transformación (primeras 3 filas):`);
    for (const f of filas.slice(0, 3)) {
      console.log(JSON.stringify(transformarFila(f, new Map()), null, 2));
    }
    console.log("\n[dry-run] No se escribió nada en la BD.");
    return;
  }

  const supabase = getAdminClient();

  // ---- 1. Upsert categorías ----
  console.log("\n→ Insertando categorías...");
  const { data: catsIns, error: catErr } = await supabase
    .from("categorias")
    .upsert(
      categorias.map((nombre, i) => ({ nombre, orden: i + 1 })),
      { onConflict: "nombre", ignoreDuplicates: false }
    )
    .select("id, nombre");
  if (catErr) throw catErr;
  const catIdByNombre = new Map(catsIns.map((c) => [c.nombre, c.id]));
  console.log(`  ${catsIns.length} categorías upserted.`);

  // ---- 2. Cargar impuestos y listas de precios a mapas ----
  const [{ data: imps }, { data: listas }] = await Promise.all([
    supabase.from("impuestos").select("id, codigo"),
    supabase.from("listas_precios").select("id, codigo"),
  ]);
  const impIdByCodigo = new Map((imps ?? []).map((i) => [i.codigo, i.id]));
  const listaIdByCodigo = new Map((listas ?? []).map((l) => [l.codigo, l.id]));
  if (!impIdByCodigo.has("NINGUNO")) {
    throw new Error("Seed de impuestos no aplicado — corre supabase/seed.sql primero");
  }
  if (!listaIdByCodigo.has("DETAL")) {
    throw new Error("Seed de listas_precios no aplicado — corre supabase/seed.sql primero");
  }

  // ---- 3. Transformar filas + deduplicar por código ----
  const productosPayload = [];
  const preciosPayload = []; // se llena tras insertar productos
  const filasConPrecios = []; // paralelo: { codigo_producto, [{lista_codigo, precio}, ...] }
  const vistosPorCodigo = new Map(); // codigo → nombre (primera ocurrencia)
  const duplicados = []; // {codigo, nombreOriginal, nombreDescartado}

  for (const f of filas) {
    const t = transformarFila(f, impIdByCodigo);
    if (!t.codigo || !t.nombre) continue;
    if (vistosPorCodigo.has(t.codigo)) {
      duplicados.push({
        codigo: t.codigo,
        nombreOriginal: vistosPorCodigo.get(t.codigo),
        nombreDescartado: t.nombre,
      });
      continue;
    }
    vistosPorCodigo.set(t.codigo, t.nombre);
    t.producto.categoria_id = catIdByNombre.get(t.categoria_nombre) ?? null;
    productosPayload.push(t.producto);
    filasConPrecios.push({ codigo: t.producto.codigo, precios: t.precios });
  }

  if (duplicados.length > 0) {
    console.warn(`\n⚠️  ${duplicados.length} códigos duplicados en el CSV (se ignoran, se conserva la PRIMERA ocurrencia):`);
    for (const d of duplicados) {
      console.warn(`   "${d.codigo}": conservado "${d.nombreOriginal}" — descartado "${d.nombreDescartado}"`);
    }
    console.warn(`   → Si querías conservar el descartado, asígnale otro código en el CSV o en la BD después.`);
  }

  // ---- 4. Upsert productos ----
  console.log(`\n→ Insertando ${productosPayload.length} productos...`);
  const { data: prodsIns, error: prodErr } = await supabase
    .from("productos")
    .upsert(productosPayload, { onConflict: "codigo", ignoreDuplicates: false })
    .select("id, codigo");
  if (prodErr) throw prodErr;
  const prodIdByCodigo = new Map(prodsIns.map((p) => [p.codigo, p.id]));
  console.log(`  ${prodsIns.length} productos upserted.`);

  // ---- 5. Preparar y upsert precios_producto ----
  for (const fp of filasConPrecios) {
    const pid = prodIdByCodigo.get(fp.codigo);
    if (!pid) continue;
    for (const { lista_codigo, precio } of fp.precios) {
      const lista_id = listaIdByCodigo.get(lista_codigo);
      if (!lista_id) continue;
      preciosPayload.push({ producto_id: pid, lista_precio_id: lista_id, precio });
    }
  }

  console.log(`\n→ Insertando ${preciosPayload.length} precios...`);
  // Upsert en batches de 200 para no saturar
  const BATCH = 200;
  for (let i = 0; i < preciosPayload.length; i += BATCH) {
    const slice = preciosPayload.slice(i, i + BATCH);
    const { error } = await supabase
      .from("precios_producto")
      .upsert(slice, { onConflict: "producto_id,lista_precio_id", ignoreDuplicates: false });
    if (error) throw error;
  }
  console.log("  OK");

  console.log("\n✅ Migración de catálogo completa.");
}

function transformarFila(f, impIdByCodigo) {
  const codigo = limpiarTexto(f[COLS.codigo]);
  const nombre = limpiarTexto(f[COLS.nombre]);
  const tipo = mapTipo(f[COLS.tipo]);
  const inventariable = parseBool(f[COLS.inventariable]) && tipo === "producto";
  const categoria_nombre = normalizarCategoria(f[COLS.categoria]);
  const impuestoCodigo = normalizarImpuesto(f[COLS.impuestoCargo]);
  const impuesto_id = impIdByCodigo.get(impuestoCodigo) ?? impIdByCodigo.get("NINGUNO") ?? null;

  const stockMinimo = Number(f[COLS.stockMinimo] ?? 0) || 0;

  const producto = {
    codigo,
    nombre,
    tipo,
    es_inventariable: inventariable,
    stock_minimo_alerta: stockMinimo,
    costo_unitario: 0,
    impuesto_id,
    incluye_impuesto_en_precio: parseBool(f[COLS.incluyeIva], true),
    unidad_medida: limpiarTexto(f[COLS.unidadMedida]) ?? "unidad",
    descripcion_larga: limpiarTexto(f[COLS.descripcion]),
    referencia_fabrica: limpiarTexto(f[COLS.refFabrica]),
    codigo_barras: limpiarTexto(f[COLS.codigoBarras]),
    marca: limpiarTexto(f[COLS.marca]),
    modelo: limpiarTexto(f[COLS.modelo]),
    visible_en_factura: parseBool(f[COLS.visibleFactura], true),
    activo: true,
  };

  const precios = [];
  for (const [colName, listaCodigo] of PRECIO_COLS) {
    const val = parsePrecio(f[colName], { treatZeroAsNull: true });
    if (val !== null && val > 0) {
      precios.push({ lista_codigo: listaCodigo, precio: val });
    }
  }

  return { codigo, nombre, categoria_nombre, producto, precios };
}

run().catch((e) => {
  console.error("\n❌ Error en migración:", e.message ?? e);
  process.exit(1);
});
