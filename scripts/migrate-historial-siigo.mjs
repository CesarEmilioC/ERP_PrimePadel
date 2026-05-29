// Migra el histórico de consumo de Siigo del archivo
// oldDatabase/inventario_Abr-May2026.xlsx hacia ventas_historicas_mensuales.
//
// Particularidades:
// - Hoja "abril 24-30": son los días 24-30 de abril. El histórico previo
//   (Alegra/Siigo viejo) ya cubría del 1 al 23 de abril. Por lo tanto se
//   SUMA la cantidad_vendida a la fila existente de (producto, 2026, 4) si
//   ya existe, o se crea una nueva si no.
// - Hoja "mayo 1-28": son los primeros 28 días de mayo 2026. No hay datos
//   previos para ese mes; se inserta directo.
// - Todas las filas nuevas o sumadas quedan con fuente='siigo'. Las filas
//   pre-existentes mantienen su fuente original si solo se les suman
//   cantidades.
// - El archivo trae solo cantidad (no monto). Esto es OK: el dashboard ya
//   estima el monto como cantidad × precio_detal cuando el total es 0.
//
// Uso:
//   node scripts/migrate-historial-siigo.mjs --dry-run
//   node scripts/migrate-historial-siigo.mjs
//
// Pre-requisitos:
// - migrate-catalogo.mjs ejecutado antes (necesita productos existentes).
// - SQL migration supabase/migration-add-siigo-fuente.sql ejecutado (permite
//   fuente='siigo').

import XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAdminClient } from "./lib/supabase.mjs";
import { normalizarCategoria } from "./lib/normalize.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const fileIdx = args.indexOf("--file");
const XLSX_PATH = resolve(
  process.cwd(),
  fileIdx >= 0 ? args[fileIdx + 1] : "oldDatabase/inventario_Abr-May2026.xlsx"
);

// Mapeo de cada hoja → período (año, mes). El archivo cubre días parciales
// pero igual los agregamos al mes correspondiente (esto sigue la convención
// de ventas_historicas_mensuales, que es agregado mensual).
const HOJAS_PERIODOS = {
  "abril 24-30": { anio: 2026, mes: 4, label: "abril 24-30 de 2026" },
  "mayo 1-28":   { anio: 2026, mes: 5, label: "mayo 1-28 de 2026" },
};

// Redirecciones manuales: códigos del Siigo que en realidad corresponden a
// productos ya existentes en la BD con OTRO código. Detectado al revisar
// nombres similares — sin estos mapeos terminaríamos con duplicados.
//   "codigo_en_siigo" → "codigo_en_BD"
const REDIRECCIONES = {
  "GTRCC": "49", // GATROLIT COCO ya existe como código "49"
};

function readSheet(wb, sheetName) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const header = rows[0] ?? [];
  // Esperamos: [Código producto, Nombre producto, Referencia fábrica, Grupo inventario, Cantidad vendida]
  const idxCodigo = header.findIndex((h) => String(h ?? "").toLowerCase().includes("código producto"));
  const idxNombre = header.findIndex((h) => String(h ?? "").toLowerCase().includes("nombre producto"));
  const idxGrupo = header.findIndex((h) => String(h ?? "").toLowerCase().includes("grupo"));
  const idxCantidad = header.findIndex((h) => String(h ?? "").toLowerCase().includes("cantidad vendida"));
  if (idxCodigo === -1 || idxCantidad === -1) {
    throw new Error(`Hoja "${sheetName}" no tiene los encabezados esperados (Código producto / Cantidad vendida)`);
  }
  const filas = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const codigo = row[idxCodigo];
    if (!codigo) continue;
    const cant = Number(row[idxCantidad] ?? 0) || 0;
    if (cant <= 0) continue;
    filas.push({
      codigo: String(codigo).trim(),
      nombre: String(row[idxNombre] ?? "").trim(),
      grupo: idxGrupo >= 0 ? String(row[idxGrupo] ?? "").trim() : "",
      cantidad_vendida: cant,
    });
  }
  return filas;
}

// Heurística para clasificar un producto faltante en producto vs servicio
// a partir del nombre de grupo del Siigo. Si el grupo sugiere clase, paquete,
// alquiler, torneo, academia o servicio, lo marcamos como servicio sin stock.
function inferirTipo(grupo) {
  const g = (grupo ?? "").toLowerCase();
  const esServicio = /clase|paquete|academia|alquiler|torneo|servicio|pro\s*team|patrocinio|americano/.test(g);
  return esServicio
    ? { tipo: "servicio", es_inventariable: false }
    : { tipo: "producto", es_inventariable: true };
}

async function run() {
  console.log(`Leyendo ${XLSX_PATH}...`);
  const buf = readFileSync(XLSX_PATH);
  const wb = XLSX.read(buf, { type: "buffer" });
  console.log(`  Hojas: ${wb.SheetNames.join(", ")}`);

  const hojas = [];
  for (const [sheetName, periodo] of Object.entries(HOJAS_PERIODOS)) {
    if (!wb.SheetNames.includes(sheetName)) {
      console.warn(`  ⚠️  hoja "${sheetName}" no encontrada — se omite`);
      continue;
    }
    const filas = readSheet(wb, sheetName);
    hojas.push({ ...periodo, sheetName, filas });
    console.log(`  ✓ ${sheetName} → ${filas.length} filas con cantidad > 0`);
  }
  if (hojas.length === 0) {
    console.error("No hay hojas con datos. Saliendo.");
    process.exit(1);
  }

  const supabase = getAdminClient();

  // 1) Mapa código → producto_id (sin importar capitalización del código).
  console.log("\nConsultando catálogo de productos...");
  const { data: productos, error: eP } = await supabase
    .from("productos")
    .select("id, codigo, nombre")
    .not("codigo", "is", null);
  if (eP) throw eP;
  const prodIdByCodigo = new Map(productos.map((p) => [p.codigo.toLowerCase(), { id: p.id, nombre: p.nombre }]));
  console.log(`  ${productos.length} productos con código en BD.`);

  // 2) Validar matches y reportar. Tres rutas:
  //    - match directo por código → conMatch
  //    - código con redirección manual (REDIRECCIONES) → conMatch al producto real
  //    - sin match → faltantes (los creamos como inactivos más abajo)
  console.log("\n--- VALIDACIÓN DE CÓDIGOS ---");
  const faltantes = new Map(); // codigo siigo → {nombre, grupo, hojas[]}
  const conMatch = []; // {producto_id, anio, mes, cantidad, codigo, nombre, sheetName}
  // Acumulamos las cantidades por (codigoCanonico|anio|mes) — si un código del
  // Siigo aparece en abril y mayo, son filas distintas; si el mismo código
  // aparece dos veces dentro de la misma hoja (no debería pero por seguridad)
  // sumamos.
  const acumPorClave = new Map();

  function resolver(codigoSiigo) {
    const codigoRedirigido = REDIRECCIONES[codigoSiigo] ?? codigoSiigo;
    return prodIdByCodigo.get(codigoRedirigido.toLowerCase());
  }

  for (const h of hojas) {
    let matchCount = 0, missCount = 0, redirCount = 0;
    for (const f of h.filas) {
      const hit = resolver(f.codigo);
      if (!hit) {
        const cur = faltantes.get(f.codigo) ?? { nombre: f.nombre, grupo: f.grupo, hojas: [] };
        cur.hojas.push(h.sheetName);
        faltantes.set(f.codigo, cur);
        missCount++;
        continue;
      }
      if (REDIRECCIONES[f.codigo]) redirCount++;
      matchCount++;
      const clave = `${hit.id}|${h.anio}|${h.mes}`;
      const prev = acumPorClave.get(clave);
      if (prev) {
        prev.cantidad += f.cantidad_vendida;
      } else {
        acumPorClave.set(clave, {
          producto_id: hit.id,
          anio: h.anio,
          mes: h.mes,
          cantidad: f.cantidad_vendida,
          codigo: f.codigo,
          nombre: hit.nombre,
          sheetName: h.sheetName,
        });
      }
    }
    const reditxt = redirCount > 0 ? ` (incluye ${redirCount} redirigido(s))` : "";
    console.log(`  ${h.sheetName}: ${matchCount}/${h.filas.length} con match${reditxt}, ${missCount} sin match`);
  }
  conMatch.push(...acumPorClave.values());

  if (faltantes.size > 0) {
    console.warn(`\n⚠️  ${faltantes.size} código(s) del histórico NO existen en el catálogo:`);
    for (const [codigo, info] of faltantes) {
      console.warn(`    ${codigo}  →  "${info.nombre}"  [grupo: ${info.grupo || "—"}] [${info.hojas.join(", ")}]`);
    }
    console.warn(`  Se crearán como INACTIVOS antes de migrar el histórico.`);
  } else {
    console.log("  ✓ Todos los códigos tienen match en el catálogo.");
  }

  // 2b) Crear los productos faltantes como INACTIVOS antes de migrar.
  //     Esto evita perder cantidades del Siigo: el histórico apunta a un
  //     producto real y el cliente puede revisar/activar después.
  let creados = [];
  if (faltantes.size > 0) {
    // Cargar categorías para resolver categoria_id a partir del grupo.
    const { data: categorias, error: eCat } = await supabase.from("categorias").select("id, nombre");
    if (eCat) throw eCat;
    const catIdByNombre = new Map(categorias.map((c) => [c.nombre.toLowerCase(), c.id]));

    const payloadProductos = [];
    for (const [codigo, info] of faltantes) {
      const catNombre = normalizarCategoria(info.grupo);
      const catId = catIdByNombre.get(catNombre.toLowerCase()) ?? null;
      const tipoInfo = inferirTipo(info.grupo);
      payloadProductos.push({
        codigo,
        nombre: info.nombre,
        tipo: tipoInfo.tipo,
        es_inventariable: tipoInfo.es_inventariable,
        categoria_id: catId,
        activo: false, // INACTIVO: no aparece en ventas nuevas hasta que el cliente lo active
      });
    }

    console.log(`\n--- CREACIÓN DE PRODUCTOS FALTANTES ---`);
    console.log(`  ${payloadProductos.length} producto(s) a crear como inactivos:`);
    for (const p of payloadProductos.slice(0, 30)) {
      console.log(`    ${p.codigo} ${p.nombre}  →  tipo=${p.tipo} categoria=${p.categoria_id ? "OK" : "(sin asignar)"}`);
    }

    if (!DRY) {
      const { data: insertados, error: eIns } = await supabase
        .from("productos")
        .insert(payloadProductos)
        .select("id, codigo");
      if (eIns) throw eIns;
      creados = insertados ?? [];
      console.log(`  ✅ ${creados.length} producto(s) creados.`);
      // Actualizar el mapa para que los códigos recién creados ahora hagan match.
      for (const p of creados) {
        prodIdByCodigo.set(p.codigo.toLowerCase(), { id: p.id, nombre: p.codigo });
      }
      // Re-resolver los items que estaban en faltantes (ahora deben matchear).
      for (const h of hojas) {
        for (const f of h.filas) {
          if (!faltantes.has(f.codigo)) continue;
          const hit = resolver(f.codigo);
          if (!hit) continue;
          const clave = `${hit.id}|${h.anio}|${h.mes}`;
          const prev = acumPorClave.get(clave);
          if (prev) {
            prev.cantidad += f.cantidad_vendida;
          } else {
            acumPorClave.set(clave, {
              producto_id: hit.id,
              anio: h.anio,
              mes: h.mes,
              cantidad: f.cantidad_vendida,
              codigo: f.codigo,
              nombre: f.nombre,
              sheetName: h.sheetName,
            });
          }
        }
      }
      // Reconstruir conMatch desde el mapa actualizado.
      conMatch.length = 0;
      conMatch.push(...acumPorClave.values());
    } else {
      console.log(`  [dry-run] No se crean realmente — re-ejecuta sin --dry-run para hacerlo.`);
    }
  }

  // 3) Consultar registros existentes en abril/mayo 2026 para saber dónde
  //    hay que SUMAR (abril, posiblemente con datos de Alegra) e dónde
  //    INSERTAR limpio (mayo).
  console.log("\n--- VERIFICANDO REGISTROS EXISTENTES ---");
  const periodosAfectados = [...new Set(hojas.map((h) => `${h.anio}-${h.mes}`))];
  const filtros = periodosAfectados.map((p) => {
    const [a, m] = p.split("-").map(Number);
    return { anio: a, mes: m };
  });

  const existentesPorKey = new Map(); // `${prod}|${anio}|${mes}` → row
  for (const f of filtros) {
    const { data, error } = await supabase
      .from("ventas_historicas_mensuales")
      .select("producto_id, anio, mes, cantidad_vendida, fuente")
      .eq("anio", f.anio)
      .eq("mes", f.mes);
    if (error) throw error;
    for (const r of data ?? []) {
      existentesPorKey.set(`${r.producto_id}|${r.anio}|${r.mes}`, r);
    }
    console.log(`  ${f.anio}-${String(f.mes).padStart(2, "0")}: ${data?.length ?? 0} producto(s) ya cargados (fuentes: ${[...new Set((data ?? []).map((r) => r.fuente))].join(", ") || "—"})`);
  }

  // 4) Construir payload: distinguir UPSERT (merge sumando) de INSERT nuevo.
  const upserts = [];     // ya existen → sumamos cantidad
  const inserts = [];     // no existen → crear con fuente='siigo'
  for (const item of conMatch) {
    const key = `${item.producto_id}|${item.anio}|${item.mes}`;
    const existente = existentesPorKey.get(key);
    if (existente) {
      // Sumamos a lo existente; preservamos la fuente original (Alegra).
      const nuevaCant = existente.cantidad_vendida + item.cantidad;
      upserts.push({
        producto_id: item.producto_id,
        anio: item.anio,
        mes: item.mes,
        cantidad_vendida: nuevaCant,
        fuente: existente.fuente, // conserva la original (probablemente 'alegra')
        // resto se conservan en la fila existente (el upsert por columnas seteadas)
        _meta: {
          codigo: item.codigo,
          nombre: item.nombre,
          delta: item.cantidad,
          fuenteOriginal: existente.fuente,
          cantidadAnterior: existente.cantidad_vendida,
          sheetName: item.sheetName,
        },
      });
    } else {
      inserts.push({
        producto_id: item.producto_id,
        anio: item.anio,
        mes: item.mes,
        cantidad_vendida: item.cantidad,
        fuente: "siigo",
        _meta: { codigo: item.codigo, nombre: item.nombre, sheetName: item.sheetName },
      });
    }
  }

  console.log("\n--- PLAN DE ESCRITURA ---");
  console.log(`  ${upserts.length} fila(s) a SUMAR con el histórico existente (abril 2026).`);
  console.log(`  ${inserts.length} fila(s) a INSERTAR nuevas (mayo 2026 o productos sin registro previo).`);

  if (DRY) {
    if (upserts.length > 0) {
      console.log("\n  Ejemplos de suma (primeros 5):");
      for (const u of upserts.slice(0, 5)) {
        console.log(`    ${u._meta.codigo} ${u._meta.nombre}: ${u._meta.cantidadAnterior} + ${u._meta.delta} = ${u.cantidad_vendida}  [fuente preservada: ${u._meta.fuenteOriginal}]`);
      }
    }
    if (inserts.length > 0) {
      console.log("\n  Ejemplos de insert nuevo (primeros 5):");
      for (const i of inserts.slice(0, 5)) {
        console.log(`    ${i._meta.codigo} ${i._meta.nombre} (${i.anio}-${String(i.mes).padStart(2, "0")}): ${i.cantidad_vendida}  [fuente: siigo]`);
      }
    }
    console.log("\n[dry-run] No se escribió nada. Vuelve a correr sin --dry-run para aplicar.");
    return;
  }

  // 5) Ejecutar escritura.
  console.log("\n→ Aplicando cambios en la BD...");
  const BATCH = 300;
  const payloadCombinado = [
    ...upserts.map((u) => {
      const { _meta, ...rest } = u; void _meta; return rest;
    }),
    ...inserts.map((i) => {
      const { _meta, ...rest } = i; void _meta; return rest;
    }),
  ];
  for (let i = 0; i < payloadCombinado.length; i += BATCH) {
    const slice = payloadCombinado.slice(i, i + BATCH);
    const { error } = await supabase
      .from("ventas_historicas_mensuales")
      .upsert(slice, { onConflict: "producto_id,anio,mes", ignoreDuplicates: false });
    if (error) throw error;
    console.log(`  upsert ${i + slice.length}/${payloadCombinado.length}`);
  }

  console.log("\n✅ Migración de Siigo (abr 24 – may 28 2026) completa.");
  console.log("   Dashboard y reportes ya reflejan el nuevo histórico.");
}

run().catch((e) => {
  console.error("\n❌ Error:", e.message ?? e);
  process.exit(1);
});
