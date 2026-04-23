import XLSX from "xlsx";
import { readFileSync } from "node:fs";

const path = process.argv[2];
const sheetName = process.argv[3];
if (!path) {
  console.error("Uso: node scripts/inspect-xlsx.mjs <ruta> [hoja]");
  process.exit(1);
}
const buf = readFileSync(path);
const wb = XLSX.read(buf, { type: "buffer" });
if (!sheetName) {
  console.log("Hojas:", wb.SheetNames);
  process.exit(0);
}
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
console.log(`=== ${sheetName} (${rows.length} filas) ===`);
for (let i = 0; i < rows.length; i++) {
  console.log(i, JSON.stringify(rows[i]));
}
