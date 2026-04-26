"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { parseCSV, agruparPorTicket, CSV_TEMPLATE, type Catalogo, type ParseResult } from "@/lib/csv/transacciones";
import { importarTransacciones } from "./actions";
import { formatCOP, formatDate } from "@/lib/utils";

export function CargaMasivaClient({ catalogo, soloVentas }: { catalogo: Catalogo; soloVentas?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ParseResult | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [resumen, setResumen] = React.useState<{ creadas: number; fallidas: { ticket: string | null; razon: string }[] } | null>(null);

  function descargarPlantilla() {
    const blob = new Blob(["﻿" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-transacciones.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File) {
    setFileName(file.name);
    setResumen(null);
    const text = await file.text();
    const parsed = parseCSV(text, catalogo);
    // Si el usuario es recepción, marcamos las filas de compra como inválidas.
    if (soloVentas) {
      const movidos: typeof parsed.invalid = [];
      const validasFinal = parsed.valid.filter((r) => {
        if (r.tipo === "compra") {
          movidos.push({
            rowNumber: r.rowNumber,
            raw: { fecha: r.fecha, tipo: r.tipo, codigo_producto: r.producto_codigo, ubicacion: r.ubicacion_nombre, cantidad: String(r.cantidad) },
            errors: [`Tu rol no permite registrar compras (solo ventas y traslados).`],
          });
          return false;
        }
        return true;
      });
      setResult({ valid: validasFinal, invalid: [...parsed.invalid, ...movidos], total: parsed.total });
    } else {
      setResult(parsed);
    }
  }

  async function confirmar() {
    if (!result || result.invalid.length > 0 || result.valid.length === 0) return;
    setSubmitting(true);
    const grupos = agruparPorTicket(result.valid);
    const res = await importarTransacciones(grupos);
    setSubmitting(false);
    setResumen({ creadas: res.creadas, fallidas: res.fallidas });
    if (res.fallidas.length === 0) {
      toast.push({ message: `${res.creadas} transacciones importadas`, tone: "success" });
    } else {
      toast.push({ message: `${res.creadas} creadas, ${res.fallidas.length} con error`, tone: "error" });
    }
    router.refresh();
  }

  function reset() {
    setFileName(null);
    setResult(null);
    setResumen(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const totalImporte = result?.valid.reduce((a, r) => a + r.cantidad * r.precio_unitario, 0) ?? 0;
  const gruposPreview = result ? agruparPorTicket(result.valid) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Carga masiva de transacciones</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Sube un archivo CSV con múltiples ventas o compras. Ideal para cargar un fin de semana
            completo o migrar registros atrasados.{" "}
            <Link href="/transacciones" className="text-brand-orange hover:underline">Volver a transacciones →</Link>
          </p>
        </div>
      </div>

      {!result ? (
        <>
          <Card>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-white">1. Descarga la plantilla</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  El CSV ya trae las columnas correctas y ejemplos que puedes borrar.
                </p>
              </div>
              <Button variant="outline" onClick={descargarPlantilla}>
                ⬇ Descargar plantilla CSV
              </Button>
            </div>
          </Card>

          <Card>
            <p className="text-sm font-medium text-white">2. Llena el archivo</p>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <p><strong className="text-white">Columnas obligatorias:</strong> fecha, tipo, codigo_producto, ubicacion, cantidad, precio_unitario</p>
              <p><strong className="text-white">Columnas opcionales:</strong> notas, ticket</p>
              <p><strong className="text-white">fecha</strong> acepta <code className="text-brand-orange">DD/MM/AAAA</code>, <code className="text-brand-orange">DD-MM-AAAA</code> o <code className="text-brand-orange">AAAA-MM-DD</code>. Opcionalmente con hora: <code className="text-brand-orange">DD/MM/AAAA HH:MM</code>.</p>
              <p><strong className="text-white">tipo</strong> = <code className="text-brand-orange">venta</code> o <code className="text-brand-orange">compra</code>.</p>
              <p><strong className="text-white">codigo_producto</strong> debe existir en el catálogo (revisa en <Link href="/inventario" className="text-brand-orange hover:underline">Inventario</Link>).</p>
              <p><strong className="text-white">ubicacion</strong> debe ser el nombre exacto de una ubicación activa (Barra Cajero, Nevera Barra, etc.).</p>
              <p><strong className="text-white">ticket</strong> (opcional) agrupa varias filas en una sola transacción. Ej: una venta de 2 cervezas + 1 gatorade al mismo cliente = 2 filas con el mismo valor en ticket.</p>
            </div>
            <div className="mt-3 rounded border border-brand-orange/40 bg-brand-orange/5 p-3 text-xs">
              <p className="font-semibold text-brand-orange">⚠ Importante — sobre <code>precio_unitario</code>:</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>• En filas con <code className="text-brand-orange">tipo = venta</code> → escribe el <strong className="text-white">precio de venta al cliente</strong>.</li>
                <li>• En filas con <code className="text-brand-orange">tipo = compra</code> → escribe el <strong className="text-white">costo unitario que pagamos al proveedor</strong>.</li>
              </ul>
            </div>
          </Card>

          <Card>
            <p className="text-sm font-medium text-white">3. Sube el archivo</p>
            <div className="mt-3">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-12 text-center hover:border-brand-orange">
                <p className="text-sm text-muted-foreground">Haz click o arrastra un archivo .csv aquí</p>
                <p className="text-xs text-muted-foreground">Máximo recomendado: 500 filas por archivo.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                />
              </label>
            </div>
          </Card>
        </>
      ) : resumen ? (
        // Pantalla de resultado final
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Importación completada</h2>
              <p className="mt-1 text-sm text-muted-foreground">{fileName}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded border border-green-900/50 bg-green-950/20 p-3">
                <p className="text-xs uppercase text-green-300">Creadas</p>
                <p className="mt-1 text-3xl font-bold text-green-300">{resumen.creadas}</p>
              </div>
              <div className="rounded border border-red-900/50 bg-red-950/20 p-3">
                <p className="text-xs uppercase text-red-300">Con error</p>
                <p className="mt-1 text-3xl font-bold text-red-300">{resumen.fallidas.length}</p>
              </div>
            </div>

            {resumen.fallidas.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-white">Detalle de errores:</p>
                <div className="space-y-1 rounded border border-red-900/40 bg-red-950/10 p-3 text-xs">
                  {resumen.fallidas.map((f, i) => (
                    <div key={i} className="text-red-300">
                      {f.ticket ? <strong>Ticket {f.ticket}: </strong> : null}
                      {f.razon}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex gap-2 pt-2">
              <Button onClick={reset}>Subir otro archivo</Button>
              <Link href="/transacciones">
                <Button variant="outline">Ver lista de transacciones</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        // Pantalla de preview
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">📄 {fileName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.total} filas leídas · {result.valid.length} válidas · {result.invalid.length} con error
                  {result.valid.length > 0 ? (
                    <>
                      {" "}· se crearán <strong className="text-white">{gruposPreview.length}</strong> transacciones
                      {" "}por <strong className="text-white">{formatCOP(totalImporte)}</strong>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Cambiar archivo</Button>
                <Button
                  onClick={confirmar}
                  disabled={submitting || result.invalid.length > 0 || result.valid.length === 0}
                >
                  {submitting ? "Importando..." : `Confirmar e importar (${gruposPreview.length})`}
                </Button>
              </div>
            </div>
            {result.invalid.length > 0 ? (
              <p className="mt-3 rounded border border-red-900/40 bg-red-950/20 p-2 text-xs text-red-300">
                No se puede importar mientras haya filas con error. Corrige el CSV y súbelo de nuevo.
              </p>
            ) : null}
          </Card>

          {result.invalid.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-red-300">Filas con error ({result.invalid.length})</h2>
              <div className="overflow-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Fila</TH>
                      <TH>Fecha</TH>
                      <TH>Tipo</TH>
                      <TH>Código</TH>
                      <TH>Ubicación</TH>
                      <TH className="text-right">Cantidad</TH>
                      <TH>Errores</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {result.invalid.map((row) => (
                      <TR key={row.rowNumber} className="bg-red-950/10">
                        <TD className="text-muted-foreground">{row.rowNumber}</TD>
                        <TD className="text-muted-foreground">{row.raw.fecha ?? "—"}</TD>
                        <TD className="text-muted-foreground">{row.raw.tipo ?? "—"}</TD>
                        <TD className="text-muted-foreground">{row.raw.codigo_producto ?? "—"}</TD>
                        <TD className="text-muted-foreground">{row.raw.ubicacion ?? "—"}</TD>
                        <TD className="text-right text-muted-foreground">{row.raw.cantidad ?? "—"}</TD>
                        <TD>
                          <ul className="space-y-0.5 text-xs text-red-300">
                            {row.errors.map((e, i) => <li key={i}>• {e}</li>)}
                          </ul>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </Card>
          ) : null}

          {result.valid.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-green-300">Filas válidas ({result.valid.length})</h2>
              <div className="max-h-96 overflow-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Fila</TH>
                      <TH>Fecha</TH>
                      <TH>Tipo</TH>
                      <TH>Producto</TH>
                      <TH>Ubicación</TH>
                      <TH className="text-right">Cant.</TH>
                      <TH className="text-right" title="Para ventas: precio al cliente. Para compras: costo unitario.">
                        Precio / Costo
                      </TH>
                      <TH>Ticket</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {result.valid.map((r) => (
                      <TR key={r.rowNumber}>
                        <TD className="text-muted-foreground">{r.rowNumber}</TD>
                        <TD className="text-xs text-muted-foreground">{formatDate(r.fecha)}</TD>
                        <TD>
                          {r.tipo === "venta" ? <Badge tone="green">Venta</Badge> : <Badge tone="blue">Compra</Badge>}
                        </TD>
                        <TD className="text-white">
                          <span className="mr-2 font-mono text-xs text-muted-foreground">{r.producto_codigo}</span>
                          {r.producto_nombre}
                        </TD>
                        <TD className="text-muted-foreground">{r.ubicacion_nombre}</TD>
                        <TD className="text-right font-mono">{r.cantidad}</TD>
                        <TD className="text-right font-mono">{formatCOP(r.precio_unitario)}</TD>
                        <TD className="text-xs text-muted-foreground">{r.ticket ?? "—"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
