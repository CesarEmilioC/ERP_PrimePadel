// Busca posibles duplicados por nombre en el catalogo para los 14 productos
// del Siigo que no tienen match exacto por codigo.
import { getAdminClient } from "./lib/supabase.mjs";

const sb = getAdminClient();
const { data: productos } = await sb
  .from("productos")
  .select("id, codigo, nombre, activo, tipo")
  .not("codigo", "is", null);

const sinMatch = [
  ["P3", "CLASE 3 PERSONAS"],
  ["CFPP0021", "Pandebonitos X 5"],
  ["CFPP0022", "Pandeyuquitas x 5"],
  ["CFPP0023", "Batido de Proteina con Banano"],
  ["51", "CLUB DORADA NEGRA N96"],
  ["CFPP20", "Brownie con Helado"],
  ["CFPP0024", "Batido de Proteina con Fresa"],
  ["Cubetazo", "CUBETAZO CLUB"],
  ["NG", "CLASE INDIVIDUAL NG"],
  ["NG4", "PAQUETE ESPECIAL 10 CLASES AM NG"],
  ["NG5", "PAQUETE ESPECIAL CLIENTES ANTIGUOS NG"],
  ["NG10", "CLASE INDIVIDUAL PAQUETE ESPECIAL"],
  ["CBTZCOS", "CUBETAZO COSTEÑITA"],
  ["GTRCC", "GATROLIT COCO"],
];

function tokens(s) {
  return new Set(
    String(s).toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  );
}
function score(a, b) {
  const ta = tokens(a), tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

for (const [cod, nom] of sinMatch) {
  const candidatos = productos
    .map((p) => ({ ...p, s: score(nom, p.nombre) }))
    .filter((p) => p.s >= 0.4)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
  if (candidatos.length > 0) {
    console.log(`\n${cod} "${nom}"`);
    for (const c of candidatos) {
      const marca = c.activo ? "" : " (inactivo)";
      console.log(`    → posible duplicado: [${c.codigo}] "${c.nombre}"${marca} — similitud ${(c.s * 100).toFixed(0)}%`);
    }
  } else {
    console.log(`\n${cod} "${nom}" → sin parecidos en BD ✓ producto realmente nuevo`);
  }
}
