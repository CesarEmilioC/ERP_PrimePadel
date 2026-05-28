// Parsing + validación + agrupación del CSV de transacciones masivas.

import Papa from "papaparse";

export type RawRow = Record<string, string | undefined>;

export type TipoTx = "venta" | "compra" | "traslado";

export type ValidRow = {
  rowNumber: number; // 1-based dentro del CSV (sin header)
  fecha: string; // ISO timestamp (UTC)
  tipo: TipoTx;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  ubicacion_id: string;             // origen en venta/traslado, destino en compra
  ubicacion_nombre: string;
  ubicacion_destino_id?: string;    // solo traslado: ubicación destino
  ubicacion_destino_nombre?: string;
  cantidad: number;
  precio_unitario: number;
  notas: string | null;
  ticket: string | null;
  es_inventariable: boolean;
};

export type RowError = {
  rowNumber: number;
  raw: RawRow;
  errors: string[];
};

export type ParseResult = {
  valid: ValidRow[];
  invalid: RowError[];
  total: number;       // filas relevantes (no contiene las ignoradas con cantidad 0/vacía)
  ignoradas: number;   // filas con cantidad=0 o vacía (el usuario no las tocó)
};

export type Catalogo = {
  productos: {
    id: string;
    codigo: string | null;
    nombre: string;
    activo: boolean;
    es_inventariable: boolean;
    precio_detal?: number | null;
    costo_unitario?: number;
    stock_por_ubicacion: Record<string, number>;
  }[];
  ubicaciones: { id: string; nombre: string; tipo: string; activa: boolean }[];
};

export const CSV_HEADERS = [
  "fecha",
  "tipo",
  "codigo_producto",
  "nombre_producto",   // solo referencia visual para el operario; el mapeo se hace por codigo_producto
  "ubicacion",
  "ubicacion_destino",
  "cantidad",
  "valor_unitario",    // venta → precio al cliente; compra/traslado → costo unitario
  "notas",
  "ticket",
] as const;

// ----------------------------------------------------------------------------
// Plantilla dinámica: una fila por (producto, tipo) con cantidades en 0.
// El usuario llena solo las cantidades de los productos que vendió/movió/compró.
// Filas con cantidad 0 al subir el CSV se ignoran (el usuario no las tocó).
// ----------------------------------------------------------------------------
export type OpcionesPlantilla = {
  incluyeCompras: boolean;  // false para recepción (solo venta + traslado)
  incluyeTraslados: boolean;
};

function fechaHoyDDMMAAAA(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Heurística simple para sugerir ubicaciones por tipo.
function ubicacionesSugeridas(ubicaciones: Catalogo["ubicaciones"]) {
  const activas = ubicaciones.filter((u) => u.activa);
  const venta = activas.find((u) => ["barra", "vitrina", "nevera"].includes(u.tipo)) ?? activas[0];
  const bodega = activas.find((u) => u.tipo === "bodega") ?? activas[0];
  const trasladoOrigen = bodega;
  const trasladoDestino = venta && venta.id !== bodega?.id ? venta : activas.find((u) => u.id !== bodega?.id) ?? activas[0];
  return { venta, bodega, trasladoOrigen, trasladoDestino };
}

function escapeCSV(s: string): string {
  if (s == null) return "";
  const str = String(s);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fila(values: (string | number)[]): string {
  return values.map((v) => escapeCSV(String(v))).join(",");
}

export function buildPlantillaCSV(catalogo: Catalogo, opciones: OpcionesPlantilla): string {
  const productos = catalogo.productos.filter((p) => p.activo);
  const { venta, bodega, trasladoOrigen, trasladoDestino } = ubicacionesSugeridas(catalogo.ubicaciones);
  const fecha = fechaHoyDDMMAAAA();

  // Solo encabezados + filas de productos (las instrucciones viven en la webapp).
  const lineas: string[] = [];
  lineas.push(CSV_HEADERS.join(","));

  for (const p of productos) {
    const codigo = p.codigo ?? "";
    if (!codigo) continue; // sin código no se puede referenciar
    const nombre = p.nombre ?? "";

    // Venta: todos los productos activos (servicios incluidos).
    if (venta) {
      lineas.push(fila([
        fecha,
        "venta",
        codigo,
        nombre,
        venta.nombre,
        "",
        0,
        p.precio_detal ?? 0,
        "",
        "",
      ]));
    }

    // Solo productos inventariables admiten traslado / compra.
    if (!p.es_inventariable) continue;

    if (opciones.incluyeTraslados && trasladoOrigen && trasladoDestino && trasladoOrigen.id !== trasladoDestino.id) {
      lineas.push(fila([
        fecha,
        "traslado",
        codigo,
        nombre,
        trasladoOrigen.nombre,
        trasladoDestino.nombre,
        0,
        p.costo_unitario ?? 0,
        "",
        "",
      ]));
    }

    if (opciones.incluyeCompras && bodega) {
      lineas.push(fila([
        fecha,
        "compra",
        codigo,
        nombre,
        bodega.nombre,
        "",
        0,
        p.costo_unitario ?? 0,
        "",
        "",
      ]));
    }
  }

  return lineas.join("\n");
}

// ----------------------------------------------------------------------------
// Parseo
// ----------------------------------------------------------------------------

function parseFechaISO(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();

  // Separar fecha y hora (si hay). Si no se especifica hora, las transacciones
  // importadas por CSV quedan a las 00:01 del día — así aparecen al inicio del
  // día y se distinguen de las que se registran manualmente durante el día.
  const [fechaStr, horaStr] = s.split(/[ T]/, 2);
  const hora = horaStr && /^\d{1,2}:\d{2}(:\d{2})?$/.test(horaStr) ? horaStr : "00:01";

  let yyyy: string | null = null;
  let mm: string | null = null;
  let dd: string | null = null;

  // YYYY-MM-DD o YYYY/MM/DD
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(fechaStr);
  if (m) {
    yyyy = m[1]; mm = m[2]; dd = m[3];
  } else {
    // DD/MM/YYYY o DD-MM-YYYY
    m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(fechaStr);
    if (m) { dd = m[1]; mm = m[2]; yyyy = m[3]; }
  }

  if (!yyyy || !mm || !dd) return null;

  // La hora del CSV se interpreta SIEMPRE como zona Bogotá (UTC-5, sin DST),
  // sin importar desde dónde se sube el archivo. Así un CSV con "01/05/2026"
  // queda exactamente a las 00:01 del 1 de mayo en Cali, incluso si el
  // navegador del usuario está en otro huso horario.
  const horaCompleta = hora.length === 5 ? hora + ":00" : hora;
  const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${horaCompleta}-05:00`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalize(s: string | undefined) {
  return (s ?? "").trim();
}

export function parseCSV(text: string, catalogo: Catalogo): ParseResult {
  // Quitar líneas-comentario (#) antes de parsear.
  const withoutComments = text
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");

  const result = Papa.parse<RawRow>(withoutComments, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const prodByCodigo = new Map(
    catalogo.productos
      .filter((p) => p.codigo)
      .map((p) => [p.codigo!.toLowerCase(), p]),
  );
  const ubiByNombre = new Map(
    catalogo.ubicaciones.map((u) => [u.nombre.toLowerCase(), u]),
  );

  // Pre-calcular stock esperado por (producto, ubicación) después de aplicar cada fila,
  // para validar que las ventas/traslados no sobregiren el stock disponible acumuladamente.
  const stockPend = new Map<string, number>(); // key = `${producto_id}|${ubicacion_id}`
  function stockActual(productoId: string, ubicacionId: string): number {
    const key = `${productoId}|${ubicacionId}`;
    if (stockPend.has(key)) return stockPend.get(key)!;
    const p = catalogo.productos.find((x) => x.id === productoId);
    const inicial = p?.stock_por_ubicacion?.[ubicacionId] ?? 0;
    stockPend.set(key, inicial);
    return inicial;
  }

  const valid: ValidRow[] = [];
  const invalid: RowError[] = [];
  let ignoradas = 0;

  (result.data ?? []).forEach((raw, idx) => {
    const rowNumber = idx + 2; // +1 por el header, +1 por 1-based
    const errors: string[] = [];

    const fechaStr = normalize(raw.fecha);
    const tipoStr = normalize(raw.tipo).toLowerCase();
    const codigoStr = normalize(raw.codigo_producto);
    const ubiStr = normalize(raw.ubicacion);
    const ubiDestStr = normalize(raw.ubicacion_destino);
    const cantStr = normalize(raw.cantidad);
    // valor_unitario es el nombre nuevo; precio_unitario se acepta por compatibilidad
    // con plantillas viejas. La columna nombre_producto es solo visual y se ignora.
    const precioStr = normalize(raw.valor_unitario ?? raw.precio_unitario);
    const notasStr = normalize(raw.notas);
    const ticketStr = normalize(raw.ticket);

    if (!fechaStr && !tipoStr && !codigoStr && !ubiStr && !cantStr && !precioStr) {
      return; // fila completamente vacía — ignorar silenciosamente
    }

    // Si cantidad es 0 o vacía → fila no fue tocada por el usuario, se ignora.
    const cantidadParsed = Number((cantStr || "0").replace(",", "."));
    if (!Number.isFinite(cantidadParsed) || cantidadParsed === 0) {
      ignoradas++;
      return;
    }

    const fechaIso = parseFechaISO(fechaStr);
    if (!fechaIso) errors.push(`Fecha inválida ("${fechaStr}") — usa DD/MM/AAAA o AAAA-MM-DD`);

    if (tipoStr !== "venta" && tipoStr !== "compra" && tipoStr !== "traslado") {
      errors.push(`Tipo inválido ("${tipoStr}") — debe ser "venta", "compra" o "traslado"`);
    }

    const prod = prodByCodigo.get(codigoStr.toLowerCase());
    if (!prod) errors.push(`No se encontró producto con código "${codigoStr}"`);
    else if (!prod.activo) errors.push(`El producto "${prod.nombre}" está inactivo`);

    const ubi = ubiByNombre.get(ubiStr.toLowerCase());
    if (!ubi) errors.push(`Ubicación "${ubiStr}" no encontrada`);
    else if (!ubi.activa) errors.push(`Ubicación "${ubiStr}" está desactivada`);

    let ubiDest = undefined as { id: string; nombre: string; activa: boolean } | undefined;
    if (tipoStr === "traslado") {
      if (!ubiDestStr) {
        errors.push(`Traslado requiere "ubicacion_destino"`);
      } else {
        ubiDest = ubiByNombre.get(ubiDestStr.toLowerCase());
        if (!ubiDest) errors.push(`Ubicación destino "${ubiDestStr}" no encontrada`);
        else if (!ubiDest.activa) errors.push(`Ubicación destino "${ubiDestStr}" está desactivada`);
        else if (ubi && ubiDest.id === ubi.id) errors.push(`Traslado: origen y destino deben ser distintos`);
      }
    }

    // Servicios no aplican para compras ni traslados (no tienen stock).
    if (prod && !prod.es_inventariable && (tipoStr === "compra" || tipoStr === "traslado")) {
      errors.push(`"${prod.nombre}" no se inventaría (servicio); no admite ${tipoStr}s`);
    }

    if (!Number.isInteger(cantidadParsed) || cantidadParsed < 0) {
      errors.push(`Cantidad inválida ("${cantStr}") — debe ser entero positivo`);
    }

    const precio = Number((precioStr || "0").replace(/[,$ ]/g, ""));
    if (!Number.isFinite(precio) || precio < 0) {
      errors.push(`Valor unitario inválido ("${precioStr}")`);
    }

    // Validación de stock para ventas y traslados — acumula las filas previas.
    if (errors.length === 0 && prod && ubi && (tipoStr === "venta" || tipoStr === "traslado") && prod.es_inventariable) {
      const disponible = stockActual(prod.id, ubi.id);
      if (disponible < cantidadParsed) {
        errors.push(
          `Stock insuficiente: "${prod.nombre}" tiene ${disponible} en ${ubi.nombre}, se intenta ${tipoStr === "venta" ? "vender" : "mover"} ${cantidadParsed}`,
        );
      }
    }

    if (errors.length > 0) {
      invalid.push({ rowNumber, raw, errors });
      return;
    }

    // Actualizar stock pendiente para validar filas posteriores.
    if (prod!.es_inventariable) {
      if (tipoStr === "venta") {
        const key = `${prod!.id}|${ubi!.id}`;
        stockPend.set(key, stockActual(prod!.id, ubi!.id) - cantidadParsed);
      } else if (tipoStr === "compra") {
        const key = `${prod!.id}|${ubi!.id}`;
        stockPend.set(key, stockActual(prod!.id, ubi!.id) + cantidadParsed);
      } else if (tipoStr === "traslado" && ubiDest) {
        const keyOrig = `${prod!.id}|${ubi!.id}`;
        const keyDest = `${prod!.id}|${ubiDest.id}`;
        stockPend.set(keyOrig, stockActual(prod!.id, ubi!.id) - cantidadParsed);
        stockPend.set(keyDest, stockActual(prod!.id, ubiDest.id) + cantidadParsed);
      }
    }

    valid.push({
      rowNumber,
      fecha: fechaIso!,
      tipo: tipoStr as TipoTx,
      producto_id: prod!.id,
      producto_codigo: prod!.codigo ?? "",
      producto_nombre: prod!.nombre,
      ubicacion_id: ubi!.id,
      ubicacion_nombre: ubi!.nombre,
      ubicacion_destino_id: ubiDest?.id,
      ubicacion_destino_nombre: ubiDest?.nombre,
      cantidad: cantidadParsed,
      precio_unitario: precio,
      notas: notasStr || null,
      ticket: ticketStr || null,
      es_inventariable: prod!.es_inventariable,
    });
  });

  return {
    valid,
    invalid,
    total: valid.length + invalid.length,
    ignoradas,
  };
}

// ----------------------------------------------------------------------------
// Agrupación por ticket
// ----------------------------------------------------------------------------
export type TransaccionAgrupada = {
  tipo: TipoTx;
  fecha: string;
  notas: string | null;
  ticket: string | null;
  items: {
    producto_id: string;
    producto_codigo: string;
    producto_nombre: string;
    ubicacion_id: string;
    ubicacion_destino_id?: string;
    cantidad: number;
    precio_unitario: number;
    es_inventariable: boolean;
  }[];
};

export function agruparPorTicket(rows: ValidRow[]): TransaccionAgrupada[] {
  const grupos = new Map<string, TransaccionAgrupada>();
  const sueltas: TransaccionAgrupada[] = [];

  for (const r of rows) {
    const item = {
      producto_id: r.producto_id,
      producto_codigo: r.producto_codigo,
      producto_nombre: r.producto_nombre,
      ubicacion_id: r.ubicacion_id,
      ubicacion_destino_id: r.ubicacion_destino_id,
      cantidad: r.cantidad,
      precio_unitario: r.precio_unitario,
      es_inventariable: r.es_inventariable,
    };
    if (r.ticket) {
      const key = `${r.ticket}|${r.tipo}|${r.fecha.slice(0, 16)}`;
      const g = grupos.get(key);
      if (g) {
        g.items.push(item);
        if (!g.notas && r.notas) g.notas = r.notas;
      } else {
        grupos.set(key, {
          tipo: r.tipo,
          fecha: r.fecha,
          notas: r.notas,
          ticket: r.ticket,
          items: [item],
        });
      }
    } else {
      sueltas.push({
        tipo: r.tipo,
        fecha: r.fecha,
        notas: r.notas,
        ticket: null,
        items: [item],
      });
    }
  }

  return [...grupos.values(), ...sueltas];
}
