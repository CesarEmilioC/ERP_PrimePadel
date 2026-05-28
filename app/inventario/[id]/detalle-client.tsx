"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { ProductoDialog } from "../producto-dialog";
import { AjusteDialog } from "./ajuste-dialog";
import { deleteProducto } from "../actions";
import { formatCOP, formatInt, formatDate, formatFechaHora } from "@/lib/utils";

export type HistoricoTx = {
  id: string;
  transaccion_id: string;
  fecha: string;
  tipo: "venta" | "compra" | "traslado";
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
  ubicacion_origen_nombre: string | null;
  ubicacion_destino_nombre: string | null;
  notas: string | null;
  origen: string;
};

export type DetalleProps = {
  producto: any;
  ubicacionesConStock: { id: string; nombre: string; tipo: string; cantidad: number }[];
  ubicacionesDisponibles: { id: string; nombre: string; tipo: string }[];
  precios: { lista_precio_id: string; precio: number; codigo: string; nombre: string }[];
  historialMensual: { anio: number; mes: number; cantidad_vendida: number; total: number; total_estimado?: boolean }[];
  ajustes: { id: string; cantidad_antes: number; cantidad_despues: number; diferencia: number; motivo: string; notas: string | null; fecha: string; ubicaciones: { nombre: string } | null }[];
  categorias: { id: string; nombre: string }[];
  impuestos: { id: string; nombre: string; porcentaje: number }[];
  listasPrecios: { id: string; codigo: string; nombre: string; es_default: boolean; descuento_porcentaje: number }[];
  analisisCostos: {
    numCompras: number;
    cantidadTotalCompras: number;
    valorTotalCompras: number;
    costoPromedioCompra: number;
    ultimaCompraFecha: string | null;
    ultimaCompraCosto: number | null;
    ultimaCompraCantidad: number | null;
    valorTotalVendido: number;
    cantidadTotalVendida: number;
    numVentas: number;
  };
  historialTransacciones: HistoricoTx[];
  isMaestro: boolean;
};

const PAGE_SIZE = 10;

export function DetalleClient(props: DetalleProps) {
  const {
    producto, ubicacionesConStock, ubicacionesDisponibles, precios, historialMensual,
    ajustes, categorias, impuestos, listasPrecios, analisisCostos, historialTransacciones, isMaestro,
  } = props;
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = React.useState(false);
  const [ajustando, setAjustando] = React.useState(false);
  const [eliminando, setEliminando] = React.useState(false);

  const [pageTx, setPageTx] = React.useState(0);
  const [pageHistMes, setPageHistMes] = React.useState(0);
  const [pageAjustes, setPageAjustes] = React.useState(0);

  // Stock por ubicación: solo donde hay cantidad > 0.
  const ubicacionesConStockReal = ubicacionesConStock.filter((u) => u.cantidad > 0);
  const cantidadTotal = ubicacionesConStockReal.reduce((a, u) => a + u.cantidad, 0);

  // Para el dialog de ajuste necesitamos todas las ubicaciones (incl. las vacías).
  const ubiSet = new Set(ubicacionesConStock.map((u) => u.id));
  const ubisParaAjuste = [
    ...ubicacionesConStock,
    ...ubicacionesDisponibles.filter((u) => !ubiSet.has(u.id)).map((u) => ({ ...u, cantidad: 0 })),
  ];

  // Valor del inventario actual usando el costo promedio de compras (no el del catálogo).
  // Si no hay compras registradas, cae al costo del catálogo como fallback.
  const costoReferencia = analisisCostos.numCompras > 0
    ? analisisCostos.costoPromedioCompra
    : Number(producto.costo_unitario ?? 0);
  const valorInventarioActual = cantidadTotal * costoReferencia;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/inventario" className="hover:text-brand-orange">← Inventario</Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{producto.nombre}</h1>
            {producto.tipo === "servicio" ? <Badge tone="blue">Servicio</Badge>
              : producto.es_inventariable ? <Badge tone="gray">Producto</Badge>
              : <Badge tone="gray">No inventariable</Badge>}
            {producto.activo ? null : <Badge tone="red">Inactivo</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {producto.codigo ? `Código: ${producto.codigo}` : "Sin código"}
            {producto.categorias?.nombre ? ` · ${producto.categorias.nombre}` : ""}
            {producto.impuestos ? ` · Impuesto: ${producto.impuestos.nombre}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {producto.es_inventariable ? (
            <Button onClick={() => setAjustando(true)}>Ajuste de inventario</Button>
          ) : null}
          <Button variant="outline" onClick={() => setEditing(true)}>Editar</Button>
          {isMaestro ? <Button variant="ghost" onClick={() => setEliminando(true)}>Eliminar</Button> : null}
        </div>
      </div>

      {/* KPIs principales: basados en COMPRAS/VENTAS reales, no en el catálogo. */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Stock total</p>
          <p className="mt-1 truncate text-2xl font-bold tabular-nums text-white">{producto.es_inventariable ? formatInt(cantidadTotal) : "—"}</p>
          {producto.es_inventariable && producto.stock_minimo_alerta > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Alerta si baja de {producto.stock_minimo_alerta}</p>
          ) : null}
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Costo promedio</p>
          {analisisCostos.numCompras > 0 ? (
            <>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums text-white">
                {formatCOP(Math.round(analisisCostos.costoPromedioCompra))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                ponderado por cantidad de {analisisCostos.numCompras} compra{analisisCostos.numCompras > 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums text-muted-foreground">
                {formatCOP(Number(producto.costo_unitario ?? 0))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                catálogo (sin compras registradas)
              </p>
            </>
          )}
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Última compra</p>
          {analisisCostos.ultimaCompraCosto != null ? (
            <>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums text-white">
                {formatCOP(analisisCostos.ultimaCompraCosto)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatInt(analisisCostos.ultimaCompraCantidad ?? 0)} uds el{" "}
                {analisisCostos.ultimaCompraFecha
                  ? new Date(analisisCostos.ultimaCompraFecha).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })
                  : "—"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums text-muted-foreground">—</p>
              <p className="mt-1 text-xs text-muted-foreground">aún no hay compras</p>
            </>
          )}
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Valor invertido</p>
          {analisisCostos.numCompras > 0 ? (
            <>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums text-brand-orange">
                {formatCOP(Math.round(analisisCostos.valorTotalCompras))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                suma de cantidad × costo en todas las compras ({formatInt(analisisCostos.cantidadTotalCompras)} uds total)
              </p>
            </>
          ) : producto.es_inventariable ? (
            <>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums text-muted-foreground">
                {formatCOP(Math.round(valorInventarioActual))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                estimado con costo del catálogo × stock actual
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums text-muted-foreground">—</p>
              <p className="mt-1 text-xs text-muted-foreground">no aplica</p>
            </>
          )}
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Valor vendido</p>
          {analisisCostos.numVentas > 0 ? (
            <>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums text-green-300">
                {formatCOP(Math.round(analisisCostos.valorTotalVendido))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatInt(analisisCostos.cantidadTotalVendida)} uds vendidas en el sistema
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums text-muted-foreground">—</p>
              <p className="mt-1 text-xs text-muted-foreground">sin ventas registradas</p>
            </>
          )}
        </Card>
      </div>

      {producto.es_inventariable ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Stock por ubicación</h2>
          {ubicacionesConStockReal.length === 0 ? (
            <div className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Sin stock registrado en ninguna ubicación. Usa "Ajuste de inventario" para cargar el conteo inicial.
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Ubicación</TH>
                  <TH>Tipo</TH>
                  <TH className="text-right">Cantidad</TH>
                </TR>
              </THead>
              <TBody>
                {ubicacionesConStockReal.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      <Link href={`/ubicaciones/${u.id}`} className="font-medium text-white hover:text-brand-orange">
                        {u.nombre}
                      </Link>
                    </TD>
                    <TD><Badge tone="blue">{u.tipo}</Badge></TD>
                    <TD className="text-right font-mono text-lg">{formatInt(u.cantidad)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>
      ) : null}

      {listasPrecios.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Precios por tarifa</h2>
          {(() => {
            const detalLista = listasPrecios.find((l) => l.es_default);
            const detalPrecio = detalLista
              ? precios.find((p) => p.lista_precio_id === detalLista.id)?.precio ?? 0
              : 0;
            return (
              <Table>
                <THead>
                  <TR>
                    <TH>Tarifa</TH>
                    <TH className="text-right">Precio</TH>
                    <TH>Origen</TH>
                  </TR>
                </THead>
                <TBody>
                  {listasPrecios.map((l) => {
                    const override = precios.find((p) => p.lista_precio_id === l.id);
                    const tieneOverride = !!override;
                    const autoCalc = l.es_default
                      ? null
                      : detalPrecio > 0
                        ? Math.round(detalPrecio * (1 - l.descuento_porcentaje / 100))
                        : null;
                    const precioMostrado = tieneOverride ? override!.precio : autoCalc;
                    return (
                      <TR key={l.id}>
                        <TD>
                          {l.nombre}
                          {!l.es_default && l.descuento_porcentaje > 0 ? (
                            <span className="ml-2 text-xs text-muted-foreground">−{l.descuento_porcentaje}%</span>
                          ) : null}
                        </TD>
                        <TD className="text-right font-mono">
                          {precioMostrado != null ? formatCOP(precioMostrado) : <span className="text-muted-foreground">—</span>}
                        </TD>
                        <TD className="text-xs">
                          {l.es_default ? (
                            <span className="text-muted-foreground">Precio base</span>
                          ) : tieneOverride ? (
                            <span className="text-yellow-300">Manual</span>
                          ) : autoCalc != null ? (
                            <span className="text-muted-foreground">Auto (Detal − {l.descuento_porcentaje}%)</span>
                          ) : (
                            <span className="text-muted-foreground italic">Falta precio Detal</span>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            );
          })()}
        </section>
      ) : null}

      {/* Histórico de transacciones (ventas + compras + traslados) */}
      {historialTransacciones.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">
            Histórico de transacciones
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({historialTransacciones.length})
            </span>
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Cada vez que se vende, compra o traslada este producto queda una fila aquí. Útil para auditar cómo se calculan el costo promedio y el valor invertido (en compras), y para ver patrones de venta.
          </p>
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Tipo</TH>
                <TH>Ubicación</TH>
                <TH className="text-right">Cantidad</TH>
                <TH className="text-right">Precio unit.</TH>
                <TH className="text-right">Costo unit.</TH>
                <TH className="text-right">Subtotal</TH>
                <TH>Notas</TH>
              </TR>
            </THead>
            <TBody>
              {historialTransacciones.slice(pageTx * PAGE_SIZE, (pageTx + 1) * PAGE_SIZE).map((t) => (
                <TR key={t.id}>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatFechaHora(t.fecha)}</TD>
                  <TD>
                    {t.tipo === "venta" ? <Badge tone="green">Venta</Badge>
                      : t.tipo === "compra" ? <Badge tone="blue">Compra</Badge>
                      : <Badge tone="yellow">Traslado</Badge>}
                    {t.origen === "csv" ? <span className="ml-2 rounded bg-blue-950/40 px-1.5 py-0.5 text-[10px] uppercase text-blue-300">CSV</span> : null}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {t.tipo === "traslado"
                      ? `${t.ubicacion_origen_nombre ?? "—"} → ${t.ubicacion_destino_nombre ?? "—"}`
                      : t.tipo === "venta"
                        ? (t.ubicacion_origen_nombre ?? "—")
                        : (t.ubicacion_destino_nombre ?? "—")}
                  </TD>
                  <TD className="text-right font-mono">{formatInt(t.cantidad)}</TD>
                  <TD className="text-right font-mono">
                    {t.tipo === "venta" ? formatCOP(t.precio_unitario) : <span className="text-muted-foreground">—</span>}
                  </TD>
                  <TD className="text-right font-mono">
                    {t.costo_unitario > 0 ? formatCOP(t.costo_unitario) : <span className="text-muted-foreground">—</span>}
                  </TD>
                  <TD className="text-right font-mono">
                    {t.tipo === "traslado" ? <span className="text-muted-foreground">—</span> : formatCOP(t.subtotal)}
                  </TD>
                  <TD className="max-w-xs truncate text-xs text-muted-foreground">{t.notas ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={pageTx}
            totalPages={Math.ceil(historialTransacciones.length / PAGE_SIZE)}
            onChange={setPageTx}
            totalItems={historialTransacciones.length}
            pageSize={PAGE_SIZE}
          />
        </section>
      ) : null}

      {historialMensual.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">
            Histórico de ventas (mensual)
            <span className="ml-2 text-sm font-normal text-muted-foreground">({historialMensual.length})</span>
          </h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Combina el histórico importado de Alegra con las ventas registradas en este sistema, mes a mes hasta el mes actual.
            {historialMensual.some((h) => h.total_estimado) ? (
              <> Los totales marcados con <span className="text-brand-orange">*</span> son estimados (cantidad × precio detal actual) porque el reporte de Alegra solo traía cantidad.</>
            ) : null}
          </p>
          <Table>
            <THead><TR><TH>Período</TH><TH className="text-right">Cantidad</TH><TH className="text-right">Total</TH></TR></THead>
            <TBody>
              {historialMensual.slice(pageHistMes * PAGE_SIZE, (pageHistMes + 1) * PAGE_SIZE).map((h) => (
                <TR key={`${h.anio}-${h.mes}`}>
                  <TD>{h.anio}-{String(h.mes).padStart(2,"0")}</TD>
                  <TD className="text-right font-mono">{formatInt(h.cantidad_vendida)}</TD>
                  <TD className="text-right font-mono">
                    {formatCOP(h.total)}
                    {h.total_estimado ? <span className="text-brand-orange">*</span> : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={pageHistMes}
            totalPages={Math.ceil(historialMensual.length / PAGE_SIZE)}
            onChange={setPageHistMes}
          />
        </section>
      ) : null}

      {ajustes.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">
            Historial de ajustes
            <span className="ml-2 text-sm font-normal text-muted-foreground">({ajustes.length})</span>
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Conteos físicos, mermas, roturas y correcciones manuales registradas en este producto.
          </p>
          <Table>
            <THead><TR><TH>Fecha</TH><TH>Ubicación</TH><TH>Motivo</TH><TH>Antes</TH><TH>Después</TH><TH>Diferencia</TH><TH>Notas</TH></TR></THead>
            <TBody>
              {ajustes.slice(pageAjustes * PAGE_SIZE, (pageAjustes + 1) * PAGE_SIZE).map((a) => (
                <TR key={a.id}>
                  <TD className="whitespace-nowrap text-muted-foreground">{formatDate(a.fecha)}</TD>
                  <TD>{a.ubicaciones?.nombre ?? "—"}</TD>
                  <TD><Badge tone="gray">{a.motivo}</Badge></TD>
                  <TD className="font-mono">{a.cantidad_antes}</TD>
                  <TD className="font-mono">{a.cantidad_despues}</TD>
                  <TD className="font-mono">
                    {a.diferencia === 0 ? "—" : a.diferencia > 0 ? <span className="text-green-400">+{a.diferencia}</span> : <span className="text-red-400">{a.diferencia}</span>}
                  </TD>
                  <TD className="text-muted-foreground">{a.notas ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={pageAjustes}
            totalPages={Math.ceil(ajustes.length / PAGE_SIZE)}
            onChange={setPageAjustes}
          />
        </section>
      ) : null}

      {editing ? (
        <ProductoDialog
          open
          onClose={() => setEditing(false)}
          initial={producto}
          precios={precios.map((p) => ({ lista_precio_id: p.lista_precio_id, precio: p.precio }))}
          categorias={categorias}
          impuestos={impuestos}
          listasPrecios={listasPrecios}
          isMaestro={isMaestro}
        />
      ) : null}

      {ajustando ? (
        <AjusteDialog
          open
          onClose={() => setAjustando(false)}
          productoId={producto.id}
          productoNombre={producto.nombre}
          ubicaciones={ubisParaAjuste}
        />
      ) : null}

      <ConfirmDialog
        open={eliminando}
        onClose={() => setEliminando(false)}
        title="Eliminar producto"
        message={<>¿Eliminar <strong className="text-white">{producto.nombre}</strong>? Si tiene histórico de ventas se marcará como inactivo.</>}
        onConfirm={async () => {
          const res = await deleteProducto(producto.id);
          if (res.error) return toast.push({ message: res.error, tone: "error" });
          toast.push({
            message: res.softDeleted ? "Producto marcado como inactivo" : "Producto eliminado",
            tone: "success",
          });
          router.push("/inventario");
          router.refresh();
        }}
      />
    </div>
  );
}
