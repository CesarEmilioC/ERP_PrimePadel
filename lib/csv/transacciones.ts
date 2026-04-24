// Parsing + validación + agrupación del CSV de transacciones masivas.

import Papa from "papaparse";

export type RawRow = Record<string, string | undefined>;

export type ValidRow = {
  rowNumber: number; // 1-based dentro del CSV (sin header)
  fecha: string; // ISO timestamp (UTC)
  tipo: "venta" | "compra";
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  ubicacion_id: string;
  ubicacion_nombre: string;
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
  total: number;
};

export type Catalogo = {
  productos: { id: string; codigo: string | null; nombre: string; activo: boolean; es_inventariable: boolean; stock_por_ubicacion: Record<string, number> }[];
  ubicaciones: { id: string; nombre: string; activa: boolean }[];
};

export const CSV_HEADERS = [
  "fecha",
  "tipo",
  "codigo_producto",
  "ubicacion",
  "cantidad",
  "precio_unitario",
  "notas",
  "ticket",
] as const;

// Plantilla descargable — header + 3 filas de ejemplo comentadas con #.
export const CSV_TEMPLATE = [
  CSV_HEADERS.join(","),
  "# ---------------------------------------------------------------------------",
  "# PLANTILLA — TRANSACCIONES MASIVAS (PRIME PADEL ERP)",
  "# Borra todas las líneas que empiezan con # y llena con tus datos.",
  "# ---------------------------------------------------------------------------",
  "# Columnas obligatorias: fecha, tipo, codigo_producto, ubicacion, cantidad, precio_unitario",
  "# Columnas opcionales:   notas, ticket",
  "#",
  "# fecha:           YYYY-MM-DD  o  YYYY-MM-DD HH:MM   (ej. 2026-05-01 o 2026-05-01 14:30)",
  "# tipo:            venta  |  compra",
  "# codigo_producto: el código (SKU) tal como aparece en el módulo Inventario",
  "# ubicacion:       el nombre exacto de la ubicación (ej. Barra Cajero, Nevera Barra, Bodega Principal)",
  "# cantidad:        entero positivo",
  "#",
  "# >>> precio_unitario — IMPORTANTE: <<<",
  "#   - Si tipo = venta   → precio_unitario es el PRECIO DE VENTA al cliente final",
  "#   - Si tipo = compra  → precio_unitario es el COSTO UNITARIO que le pagamos al proveedor",
  "#",
  "# notas (opcional):  texto libre (cliente, mesa, número de factura, etc.)",
  "# ticket (opcional): código que agrupa varias filas en UNA sola transacción.",
  "#                    Ej: 2 cervezas + 1 agua a la misma mesa = 2 filas con ticket = 'T001'.",
  "# ---------------------------------------------------------------------------",
  "# Ejemplos (borra estas tres líneas antes de subir):",
  '2026-05-01,venta,CERV-001,Barra Cajero,2,8000,mesa 3,T001',
  '2026-05-01,venta,AGUA-001,Barra Cajero,1,3000,mesa 3,T001',
  '2026-05-01,compra,CERV-001,Bodega Principal,24,5500,Proveedor Corona,',
].join("\n");

function parseFechaISO(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s + "T12:00:00").toISOString();
  }
  // YYYY-MM-DD HH:MM
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    return new Date(s.replace(" ", "T")).toISOString();
  }
  return null;
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
  // para validar que las ventas no sobregiren el stock disponible acumuladamente.
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

  (result.data ?? []).forEach((raw, idx) => {
    const rowNumber = idx + 2; // +1 por el header, +1 por 1-based
    const errors: string[] = [];

    const fechaStr = normalize(raw.fecha);
    const tipoStr = normalize(raw.tipo).toLowerCase();
    const codigoStr = normalize(raw.codigo_producto);
    const ubiStr = normalize(raw.ubicacion);
    const cantStr = normalize(raw.cantidad);
    const precioStr = normalize(raw.precio_unitario);
    const notasStr = normalize(raw.notas);
    const ticketStr = normalize(raw.ticket);

    if (!fechaStr && !tipoStr && !codigoStr && !ubiStr && !cantStr && !precioStr) {
      return; // fila completamente vacía — ignorar silenciosamente
    }

    const fechaIso = parseFechaISO(fechaStr);
    if (!fechaIso) errors.push(`fecha inválida ("${fechaStr}") — usa YYYY-MM-DD o YYYY-MM-DD HH:MM`);

    if (tipoStr !== "venta" && tipoStr !== "compra") {
      errors.push(`tipo inválido ("${tipoStr}") — debe ser "venta" o "compra"`);
    }

    const prod = prodByCodigo.get(codigoStr.toLowerCase());
    if (!prod) errors.push(`código "${codigoStr}" no existe en el catálogo`);
    else if (!prod.activo) errors.push(`código "${codigoStr}" está inactivo`);

    const ubi = ubiByNombre.get(ubiStr.toLowerCase());
    if (!ubi) errors.push(`ubicación "${ubiStr}" no encontrada`);
    else if (!ubi.activa) errors.push(`ubicación "${ubiStr}" está desactivada`);

    const cantidad = Number(cantStr.replace(",", "."));
    if (!Number.isFinite(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad)) {
      errors.push(`cantidad inválida ("${cantStr}") — debe ser entero positivo`);
    }

    const precio = Number(precioStr.replace(/[,$ ]/g, ""));
    if (!Number.isFinite(precio) || precio < 0) {
      errors.push(`precio inválido ("${precioStr}")`);
    }

    // Validación de stock para ventas — acumula las filas previas del mismo archivo.
    if (errors.length === 0 && prod && ubi && tipoStr === "venta" && prod.es_inventariable) {
      const disponible = stockActual(prod.id, ubi.id);
      if (disponible < cantidad) {
        errors.push(
          `stock insuficiente: ${prod.codigo ?? prod.nombre} tiene ${disponible} en ${ubi.nombre}, se intenta vender ${cantidad}`,
        );
      }
    }

    if (errors.length > 0) {
      invalid.push({ rowNumber, raw, errors });
      return;
    }

    // Actualizar stock pendiente para validar filas posteriores.
    if (prod!.es_inventariable) {
      const key = `${prod!.id}|${ubi!.id}`;
      const prev = stockActual(prod!.id, ubi!.id);
      const delta = tipoStr === "venta" ? -cantidad : cantidad;
      stockPend.set(key, prev + delta);
    }

    valid.push({
      rowNumber,
      fecha: fechaIso!,
      tipo: tipoStr as "venta" | "compra",
      producto_id: prod!.id,
      producto_codigo: prod!.codigo ?? "",
      producto_nombre: prod!.nombre,
      ubicacion_id: ubi!.id,
      ubicacion_nombre: ubi!.nombre,
      cantidad,
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
  };
}

// Agrupa filas válidas para crear transacciones: filas con mismo `ticket` (no vacío)
// + mismo tipo + misma fecha (truncada al minuto) se bundlean en una sola transacción.
// Filas sin ticket → cada una es su propia transacción.
export type TransaccionAgrupada = {
  tipo: "venta" | "compra";
  fecha: string;
  notas: string | null;
  ticket: string | null;
  items: {
    producto_id: string;
    producto_codigo: string;
    producto_nombre: string;
    ubicacion_id: string;
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
