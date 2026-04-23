// Helpers compartidos para scripts de migración.

// Mapa de normalización de categorías del CSV original → nombre canónico.
// Claves en lowercase + trim.
const CATEGORIA_MAP = new Map([
  ["1 servicios",                             "Servicios generales"],
  ["servicios",                               "Servicios generales"],
  ["2 bebidas gaseosas",                      "Bebidas gaseosas y energizantes"],
  ["21 bebidas gaseosas y energizantes",      "Bebidas gaseosas y energizantes"],
  ["bebidas gaseosas",                        "Bebidas gaseosas y energizantes"],
  ["bebidas gaseosas y energizantes",         "Bebidas gaseosas y energizantes"],
  ["3 bedidas deportivas",                    "Bebidas hidratantes y deportivas"],
  ["19 bebidas hidratantes y deportivas",     "Bebidas hidratantes y deportivas"],
  ["bedidas deportivas",                      "Bebidas hidratantes y deportivas"],
  ["bebidas hidratantes y deportivas",        "Bebidas hidratantes y deportivas"],
  ["4 bebidas con alcohol",                   "Bebidas con alcohol"],
  ["bebidas con alcohol",                     "Bebidas con alcohol"],
  ["5 bebidas sin alcohol",                   "Bebidas sin alcohol"],
  ["bebidas sin alcohol",                     "Bebidas sin alcohol"],
  ["6 confiteria y snack",                    "Confitería y snacks"],
  ["confiteria y snack",                      "Confitería y snacks"],
  ["7 implementos para padel",                "Implementos para pádel"],
  ["24 implementos y accesorios para padel",  "Implementos para pádel"],
  ["implementos para padel",                  "Implementos para pádel"],
  ["8 clases & paquetes prime padel",         "Clases y paquetes Prime Padel"],
  ["clases & paquetes prime padel",           "Clases y paquetes Prime Padel"],
  ["9 alquiler de canchas",                   "Alquiler de canchas"],
  ["alquiler de canchas",                     "Alquiler de canchas"],
  ["10 torneos de padel",                     "Torneos de pádel"],
  ["torneos de padel",                        "Torneos de pádel"],
  ["11 academias prime padel",                "Academias Prime Padel"],
  ["academias prime padel",                   "Academias Prime Padel"],
  ["16 alquiler locales prefabricado",        "Alquiler de locales"],
  ["alquiler locales prefabricado",           "Alquiler de locales"],
  ["17 alquiler terreno cancha voleibol",     "Alquiler cancha vóley"],
  ["alquiler terreno cancha voleibol",        "Alquiler cancha vóley"],
  ["25 servicio de patrocinio",               "Patrocinio"],
  ["servicio de patrocinio",                  "Patrocinio"],
  ["26 pro team",                             "Pro Team"],
  ["pro team",                                "Pro Team"],
  ["27 cafeteria prime padel",                "Cafetería Prime Padel"],
  ["cafeteria prime padel",                   "Cafetería Prime Padel"],
  ["clases y paquetes lolo arrechea",         "Clases y paquetes — Lolo Arrechea"],
]);

export function normalizarCategoria(raw) {
  if (!raw) return "Sin categoría";
  const key = String(raw).trim().toLowerCase();
  return CATEGORIA_MAP.get(key) ?? capitalizarTitulo(String(raw).trim());
}

function capitalizarTitulo(s) {
  return s
    .replace(/^[0-9]+\s+/, "")
    .toLowerCase()
    .replace(/\b([a-záéíóúñ])/g, (m) => m.toUpperCase());
}

// "10,000.00" → 10000.00. null, "", "0.00" → null o 0 según flag.
export function parsePrecio(raw, { treatZeroAsNull = false } = {}) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const clean = s.replace(/[, ]/g, "");
  const n = Number(clean);
  if (Number.isNaN(n)) return null;
  if (treatZeroAsNull && n === 0) return null;
  return n;
}

// Mapea código de impuesto del CSV al codigo interno.
// '1-IVA 19%' → 'IVA_19', '16-Impoconsumo 8%' → 'IMPOCONSUMO_8', vacío → 'NINGUNO'.
export function normalizarImpuesto(raw) {
  if (!raw) return "NINGUNO";
  const s = String(raw).trim().toLowerCase();
  if (s.includes("iva 19")) return "IVA_19";
  if (s.includes("impoconsumo 8")) return "IMPOCONSUMO_8";
  return "NINGUNO";
}

// SI/NO/true/false → boolean, default al fallback.
export function parseBool(raw, fallback = false) {
  if (raw === null || raw === undefined) return fallback;
  const s = String(raw).trim().toLowerCase();
  if (["si", "sí", "true", "yes", "y", "1"].includes(s)) return true;
  if (["no", "false", "n", "0"].includes(s)) return false;
  return fallback;
}

export function limpiarTexto(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}

// Mapa MES abreviado (texto de nombre de hoja) → número.
const MES_MAP = new Map([
  ["ENE", 1], ["FEB", 2], ["MAR", 3], ["ABR", 4], ["MAY", 5], ["JUN", 6],
  ["JUL", 7], ["AGO", 8], ["SEP", 9], ["OCT", 10], ["NOV", 11], ["DIC", 12],
]);

// "OCT25" → { anio: 2025, mes: 10 }, "ABR26" → { anio: 2026, mes: 4 }.
export function parseNombreHoja(nombre) {
  const m = /^([A-Z]{3})(\d{2})$/.exec(String(nombre).trim().toUpperCase());
  if (!m) return null;
  const mes = MES_MAP.get(m[1]);
  if (!mes) return null;
  const anio = 2000 + Number(m[2]);
  return { anio, mes };
}
