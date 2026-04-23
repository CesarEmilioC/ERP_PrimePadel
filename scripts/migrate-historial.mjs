// Migra el histórico mensual de ventas desde oldDatabase/historialConsumo_Abr2026.xlsx
// hacia la tabla ventas_historicas_mensuales. Idempotente: upsert (producto, año, mes).
//
// Uso:
//   node scripts/migrate-historial.mjs
//   node scripts/migrate-historial.mjs --dry-run
//   node scripts/migrate-historial.mjs --file otro/archivo.xlsx
//
// Pre-requisitos: migrate-catalogo.mjs ejecutado antes (necesita productos existentes).

import XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAdminClient } from "./lib/supabase.mjs";
import { parseNombreHoja, parsePrecio } from "./lib/normalize.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const fileIdx = args.indexOf("--file");
const XLSX_PATH = resolve(
  process.cwd(),
  fileIdx >= 0 ? args[fileIdx + 1] : "oldDatabase/historialConsumo_Abr2026.xlsx"
);
// --periodo SEP25  → used as fallback when the sheet name isn't a parseable month code
const periodoIdx = args.indexOf("--periodo");
const PERIODO_FALLBACK = periodoIdx >= 0 ? parseNombreHoja(args[periodoIdx + 1]) : null;

// Nombres de columna esperados (variantes conocidas).
const COL_ALIASES = {
  codigo:              ["Código producto", "Codigo producto", "Código del producto"],
  nombre:              ["Nombre producto", "Nombre del producto"],
  grupo:               ["Grupo inventario", "Grupo"],
  cantidad:            ["Cantidad vendida", "Cantidad"],
  valor_bruto:         ["Valor bruto"],
  descuento:           ["Descuento"],
  subtotal:            ["Subtotal"],
  impuesto_cargo:      ["Impuesto cargo"],
  impuesto_retencion:  ["Impuesto retención", "Impuesto retencion"],
  total:               ["Total"],
};

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i] ?? [];
    const hit = row.some((v) => typeof v === "string" && /código producto/i.test(v));
    if (hit) return i;
  }
  return -1;
}

function buildColIdx(header) {
  const idx = {};
  for (const [key, aliases] of Object.entries(COL_ALIASES)) {
    idx[key] = -1;
    for (const alias of aliases) {
      const i = header.findIndex((h) => String(h ?? "").trim().toLowerCase() === alias.toLowerCase());
      if (i >= 0) { idx[key] = i; break; }
    }
  }
  return idx;
}

function parseHojas(wb) {
  const out = [];
  for (const sheetName of wb.SheetNames) {
    let periodo = parseNombreHoja(sheetName);
    if (!periodo) {
      if (PERIODO_FALLBACK) {
        periodo = PERIODO_FALLBACK;
        console.log(`  (hoja "${sheetName}" → usando período ${periodo.anio}-${String(periodo.mes).padStart(2,"0")} del argumento --periodo)`);
      } else {
        console.log(`  (ignorando hoja "${sheetName}" — nombre no reconocible; usa --periodo MMMaa para forzar)`);
        continue;
      }
    }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
    const h = findHeaderRow(rows);
    if (h === -1) {
      console.warn(`  ⚠️  no encuentro header en hoja ${sheetName}`);
      continue;
    }
    const colIdx = buildColIdx(rows[h]);
    const filas = [];
    for (let i = h + 1; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const codigo = row[colIdx.codigo];
      if (!codigo || String(codigo).toLowerCase().includes("total general")) continue;
      const cantidad = Number(row[colIdx.cantidad] ?? 0) || 0;
      if (cantidad === 0) continue;
      filas.push({
        codigo: String(codigo).trim(),
        nombre: String(row[colIdx.nombre] ?? "").trim(),
        cantidad_vendida: cantidad,
        valor_bruto:        parsePrecio(row[colIdx.valor_bruto])        ?? 0,
        descuento:          parsePrecio(row[colIdx.descuento])          ?? 0,
        subtotal:           parsePrecio(row[colIdx.subtotal])           ?? 0,
        impuesto_cargo:     parsePrecio(row[colIdx.impuesto_cargo])     ?? 0,
        impuesto_retencion: parsePrecio(row[colIdx.impuesto_retencion]) ?? 0,
        total:              parsePrecio(row[colIdx.total])              ?? 0,
      });
    }
    out.push({ periodo, sheetName, filas });
  }
  return out;
}

async function run() {
  console.log(`Leyendo ${XLSX_PATH}...`);
  const buf = readFileSync(XLSX_PATH);
  const wb = XLSX.read(buf, { type: "buffer" });
  console.log(`  Hojas: ${wb.SheetNames.join(", ")}`);

  const hojas = parseHojas(wb);
  console.log(`\n${hojas.length} hojas con datos válidos.`);

  const totalFilas = hojas.reduce((acc, h) => acc + h.filas.length, 0);
  console.log(`  Total ventas: ${totalFilas} registros.`);

  if (DRY) {
    for (const h of hojas) {
      console.log(`\n${h.sheetName} (${h.periodo.anio}-${String(h.periodo.mes).padStart(2,"0")}) — ${h.filas.length} productos`);
      for (const f of h.filas.slice(0, 3)) {
        console.log("   ", f);
      }
      if (h.filas.length > 3) console.log(`    ... +${h.filas.length - 3}`);
    }
    console.log("\n[dry-run] No se escribió nada.");
    return;
  }

  const supabase = getAdminClient();

  // Cargar mapa codigo → producto_id
  const { data: productos, error } = await supabase
    .from("productos")
    .select("id, codigo")
    .not("codigo", "is", null);
  if (error) throw error;
  const prodIdByCodigo = new Map(productos.map((p) => [p.codigo.toLowerCase(), p.id]));
  console.log(`  ${productos.length} productos en BD.`);

  // Construir payload y reportar códigos sin match
  const payload = [];
  const sinMatch = new Map(); // codigo → nombre
  for (const h of hojas) {
    for (const f of h.filas) {
      const pid = prodIdByCodigo.get(f.codigo.toLowerCase());
      if (!pid) {
        if (!sinMatch.has(f.codigo)) sinMatch.set(f.codigo, f.nombre);
        continue;
      }
      payload.push({
        producto_id: pid,
        anio: h.periodo.anio,
        mes: h.periodo.mes,
        cantidad_vendida: f.cantidad_vendida,
        valor_bruto: f.valor_bruto,
        descuento: f.descuento,
        subtotal: f.subtotal,
        impuesto_cargo: f.impuesto_cargo,
        impuesto_retencion: f.impuesto_retencion,
        total: f.total,
        fuente: "alegra",
      });
    }
  }

  if (sinMatch.size > 0) {
    console.warn(`\n⚠️  ${sinMatch.size} códigos del histórico sin producto correspondiente en BD:`);
    for (const [cod, nom] of sinMatch) console.warn(`    ${cod}: ${nom}`);
    console.warn(`  (Se ignoran. Agrégalos al catálogo y reejecuta si los necesitas.)`);
  }

  console.log(`\n→ Upserting ${payload.length} filas de histórico...`);
  const BATCH = 500;
  for (let i = 0; i < payload.length; i += BATCH) {
    const slice = payload.slice(i, i + BATCH);
    const { error } = await supabase
      .from("ventas_historicas_mensuales")
      .upsert(slice, { onConflict: "producto_id,anio,mes", ignoreDuplicates: false });
    if (error) throw error;
  }

  console.log("✅ Migración de histórico completa.");
}

run().catch((e) => {
  console.error("\n❌ Error en migración:", e.message ?? e);
  process.exit(1);
});
