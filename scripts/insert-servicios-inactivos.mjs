// Inserta los 14 códigos huérfanos del histórico como servicios INACTIVOS.
// Así el migrate-historial posterior sí los enlaza, aunque no aparezcan en el
// selector del cajero (porque activo=false).
import { getAdminClient } from "./lib/supabase.mjs";

const HUERFANOS = [
  { codigo: "productogenericonube", nombre: "Producto genérico Siigo Nube (POS - WhatsApp)", categoria: "Servicios generales", tipo: "producto", es_inventariable: false },
  { codigo: "SCJP01", nombre: "Clase individual Jose Pantoja",               categoria: "Clases y paquetes Prime Padel", tipo: "servicio", es_inventariable: false },
  { codigo: "SCJP02", nombre: "Clases en pareja Jose Pantoja",               categoria: "Clases y paquetes Prime Padel", tipo: "servicio", es_inventariable: false },
  { codigo: "SCJP03", nombre: "Clases por 3 personas Jose Pantoja",          categoria: "Clases y paquetes Prime Padel", tipo: "servicio", es_inventariable: false },
  { codigo: "SCJP04", nombre: "Clase por 4 personas Jose Pantoja",           categoria: "Clases y paquetes Prime Padel", tipo: "servicio", es_inventariable: false },
  { codigo: "SCJP05", nombre: "Clase persona adicional Jose Pantoja",        categoria: "Clases y paquetes Prime Padel", tipo: "servicio", es_inventariable: false },
  { codigo: "SCJP08", nombre: "Paquete 4 clases por 1 persona Jose Pantoja", categoria: "Clases y paquetes Prime Padel", tipo: "servicio", es_inventariable: false },
  { codigo: "SCJP13", nombre: "Paquete 8 clases por 2 personas Jose Pantoja", categoria: "Clases y paquetes Prime Padel", tipo: "servicio", es_inventariable: false },
  { codigo: "L1",  nombre: "Clase individual Lolo",        categoria: "Clases y paquetes — Lolo Arrechea", tipo: "servicio", es_inventariable: false },
  { codigo: "P2",  nombre: "Clase dos personas (histórico)", categoria: "Clases y paquetes — Lolo Arrechea", tipo: "servicio", es_inventariable: false },
  { codigo: "P5",  nombre: "Paquete individual x4 (histórico)", categoria: "Clases y paquetes — Lolo Arrechea", tipo: "servicio", es_inventariable: false },
  { codigo: "P6",  nombre: "Paquete pareja x4 (histórico)",     categoria: "Clases y paquetes — Lolo Arrechea", tipo: "servicio", es_inventariable: false },
  { codigo: "P9",  nombre: "Paquete individual x8 (histórico)", categoria: "Clases y paquetes — Lolo Arrechea", tipo: "servicio", es_inventariable: false },
  { codigo: "P13", nombre: "Paquete individual x12 (histórico)", categoria: "Clases y paquetes — Lolo Arrechea", tipo: "servicio", es_inventariable: false },
];

const supabase = getAdminClient();

// Asegurar que la categoría existe
const categoriasNuevas = [...new Set(HUERFANOS.map((h) => h.categoria))];
const { data: catsExist } = await supabase.from("categorias").select("id, nombre");
const existeNombre = new Set(catsExist.map((c) => c.nombre));
const toInsert = categoriasNuevas.filter((n) => !existeNombre.has(n)).map((nombre, i) => ({ nombre, orden: 100 + i }));
if (toInsert.length > 0) {
  const { data, error } = await supabase.from("categorias").insert(toInsert).select("id, nombre");
  if (error) throw error;
  console.log(`Categorías nuevas: ${data.map((c) => c.nombre).join(", ")}`);
  for (const d of data) catsExist.push(d);
}
const catIdByNombre = new Map(catsExist.map((c) => [c.nombre, c.id]));

const { data: ningunoImp } = await supabase.from("impuestos").select("id").eq("codigo", "NINGUNO").single();

const payload = HUERFANOS.map((h) => ({
  codigo: h.codigo,
  nombre: h.nombre,
  tipo: h.tipo,
  categoria_id: catIdByNombre.get(h.categoria),
  es_inventariable: h.es_inventariable,
  stock_minimo_alerta: 0,
  costo_unitario: 0,
  impuesto_id: ningunoImp?.id ?? null,
  incluye_impuesto_en_precio: true,
  unidad_medida: "unidad",
  descripcion_larga: "Ítem histórico (inactivo). No aparece en listas de venta.",
  visible_en_factura: false,
  activo: false,  // ← marcado INACTIVO
}));

const { data: ins, error } = await supabase
  .from("productos")
  .upsert(payload, { onConflict: "codigo", ignoreDuplicates: false })
  .select("id, codigo, nombre, activo");

if (error) throw error;
console.log(`\n✅ ${ins.length} servicios inactivos insertados/actualizados:`);
for (const r of ins) console.log(`  ${r.codigo}  ${r.activo ? "[ACTIVO]" : "[INACTIVO]"}  ${r.nombre}`);
