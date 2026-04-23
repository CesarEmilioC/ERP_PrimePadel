import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { resolve } from "node:path";

const buf = readFileSync(resolve(process.cwd(), "oldDatabase/inventario_Abr2026.csv"));
const raw = new TextDecoder("windows-1252").decode(buf);
const { data } = Papa.parse(raw, { header: true, skipEmptyLines: true });

const counts = new Map();
const rows = new Map();
for (const f of data) {
  const cod = (f["Código del Producto (obligatorio)"] ?? "").trim();
  if (!cod) continue;
  counts.set(cod, (counts.get(cod) ?? 0) + 1);
  if (!rows.has(cod)) rows.set(cod, []);
  rows.get(cod).push(f["Nombre del Producto / Servicio (obligatorio)"]);
}

console.log("Duplicados (código repetido en el CSV):");
for (const [cod, n] of counts) {
  if (n > 1) console.log(`  "${cod}" × ${n}  →`, rows.get(cod));
}

// Case-insensitive check
const ci = new Map();
for (const f of data) {
  const cod = (f["Código del Producto (obligatorio)"] ?? "").trim().toLowerCase();
  if (!cod) continue;
  if (!ci.has(cod)) ci.set(cod, []);
  ci.get(cod).push({
    codigoOriginal: f["Código del Producto (obligatorio)"],
    nombre: f["Nombre del Producto / Servicio (obligatorio)"],
  });
}
console.log("\nDuplicados case-insensitive:");
for (const [cod, arr] of ci) {
  if (arr.length > 1) console.log(`  "${cod}" →`, arr);
}
