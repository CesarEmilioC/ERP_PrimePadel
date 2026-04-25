"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ProductoDialog } from "../producto-dialog";
import { AjusteDialog } from "./ajuste-dialog";
import { deleteProducto } from "../actions";
import { formatCOP, formatInt, formatDate } from "@/lib/utils";

export type DetalleProps = {
  producto: any;
  ubicacionesConStock: { id: string; nombre: string; tipo: string; cantidad: number }[];
  ubicacionesDisponibles: { id: string; nombre: string; tipo: string }[];
  precios: { lista_precio_id: string; precio: number; codigo: string; nombre: string }[];
  historialMensual: { anio: number; mes: number; cantidad_vendida: number; total: number; total_estimado?: boolean }[];
  ajustes: { id: string; cantidad_antes: number; cantidad_despues: number; diferencia: number; motivo: string; notas: string | null; fecha: string; ubicaciones: { nombre: string } | null }[];
  categorias: { id: string; nombre: string }[];
  impuestos: { id: string; nombre: string; porcentaje: number }[];
  listasPrecios: { id: string; codigo: string; nombre: string; es_default: boolean }[];
  isMaestro: boolean;
};

export function DetalleClient(props: DetalleProps) {
  const { producto, ubicacionesConStock, ubicacionesDisponibles, precios, historialMensual, ajustes, categorias, impuestos, listasPrecios, isMaestro } = props;
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = React.useState(false);
  const [ajustando, setAjustando] = React.useState(false);
  const [eliminando, setEliminando] = React.useState(false);

  const cantidadTotal = ubicacionesConStock.reduce((a, u) => a + u.cantidad, 0);
  const valorCosto = cantidadTotal * Number(producto.costo_unitario ?? 0);

  // Unión: ubicaciones con stock (aunque sea 0 en esta tabla) + disponibles que no tengan stock aún.
  const ubiSet = new Set(ubicacionesConStock.map((u) => u.id));
  const ubisParaAjuste = [
    ...ubicacionesConStock,
    ...ubicacionesDisponibles.filter((u) => !ubiSet.has(u.id)).map((u) => ({ ...u, cantidad: 0 })),
  ];

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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Stock total</p>
          <p className="mt-1 text-3xl font-bold text-white">{producto.es_inventariable ? formatInt(cantidadTotal) : "—"}</p>
          {producto.es_inventariable && producto.stock_minimo_alerta > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Alerta si baja de {producto.stock_minimo_alerta}</p>
          ) : null}
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Costo unitario</p>
          <p className="mt-1 text-3xl font-bold text-white">{formatCOP(Number(producto.costo_unitario ?? 0))}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Valor total en costo</p>
          <p className="mt-1 text-3xl font-bold text-white">{producto.es_inventariable ? formatCOP(valorCosto) : "—"}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Precio Detal</p>
          <p className="mt-1 text-3xl font-bold text-brand-orange">
            {precios.find((p) => p.codigo === "DETAL")?.precio != null
              ? formatCOP(precios.find((p) => p.codigo === "DETAL")!.precio)
              : "—"}
          </p>
        </Card>
      </div>

      {producto.es_inventariable ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Stock por ubicación</h2>
          <Table>
            <THead><TR><TH>Ubicación</TH><TH>Tipo</TH><TH className="text-right">Cantidad</TH></TR></THead>
            <TBody>
              {ubicacionesConStock.length === 0 ? (
                <TR><TD colSpan={3} className="py-6 text-center text-muted-foreground">Sin stock registrado. Usa "Ajuste de inventario" para cargar el conteo inicial.</TD></TR>
              ) : (
                ubicacionesConStock.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium text-white">{u.nombre}</TD>
                    <TD><Badge tone="blue">{u.tipo}</Badge></TD>
                    <TD className="text-right font-mono text-lg">{formatInt(u.cantidad)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </section>
      ) : null}

      {precios.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Precios</h2>
          <Table>
            <THead><TR><TH>Lista</TH><TH className="text-right">Precio</TH></TR></THead>
            <TBody>
              {precios.map((p) => (
                <TR key={p.lista_precio_id}>
                  <TD>{p.nombre}</TD>
                  <TD className="text-right font-mono">{formatCOP(p.precio)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>
      ) : null}

      {historialMensual.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Histórico de ventas (mensual)</h2>
          {historialMensual.some((h) => h.total_estimado) ? (
            <p className="mb-2 text-xs text-muted-foreground">
              Los totales marcados con <span className="text-brand-orange">*</span> son estimados (cantidad × precio detal actual) porque el reporte original solo traía cantidad.
            </p>
          ) : null}
          <Table>
            <THead><TR><TH>Período</TH><TH className="text-right">Cantidad</TH><TH className="text-right">Total</TH></TR></THead>
            <TBody>
              {historialMensual.map((h) => (
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
        </section>
      ) : null}

      {ajustes.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Historial de ajustes</h2>
          <Table>
            <THead><TR><TH>Fecha</TH><TH>Ubicación</TH><TH>Motivo</TH><TH>Antes</TH><TH>Después</TH><TH>Diferencia</TH><TH>Notas</TH></TR></THead>
            <TBody>
              {ajustes.map((a) => (
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
