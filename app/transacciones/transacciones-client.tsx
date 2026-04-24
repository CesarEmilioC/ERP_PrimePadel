"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, Card, EmptyState } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { NuevaTransaccion, type EditarPayload } from "./nueva-transaccion";
import { deleteTransaccion } from "./actions";
import { formatCOP, formatDate, formatInt } from "@/lib/utils";

type ItemListado = {
  producto_id: string;
  ubicacion_origen_id: string | null;
  ubicacion_destino_id: string | null;
  cantidad: number;
  precio_unitario: number;
  lista_precio_id: string | null;
  productos: { codigo: string | null; nombre: string };
  ubicacion_origen_nombre: string | null;
  ubicacion_destino_nombre: string | null;
};

type TransaccionLista = {
  id: string;
  tipo: "compra" | "venta" | "traslado";
  fecha: string;
  total: number;
  notas: string | null;
  origen: string;
  usuario_id: string | null;
  items: ItemListado[];
};

export function TransaccionesClient({
  transacciones, productos, ubicaciones, listasPrecios, perfilActual,
}: {
  transacciones: TransaccionLista[];
  productos: any[];
  ubicaciones: { id: string; nombre: string }[];
  listasPrecios: { id: string; codigo: string; nombre: string; es_default: boolean }[];
  perfilActual: { rol: "admin" | "cajero"; user_id: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [showNew, setShowNew] = React.useState(false);
  const [editPayload, setEditPayload] = React.useState<EditarPayload | null>(null);
  const [fTipo, setFTipo] = React.useState<"todas" | "venta" | "compra" | "traslado">("todas");
  const [fDesde, setFDesde] = React.useState<string>("");
  const [fHasta, setFHasta] = React.useState<string>("");
  const [borrar, setBorrar] = React.useState<TransaccionLista | null>(null);

  const filtradas = transacciones.filter((t) => {
    if (fTipo !== "todas" && t.tipo !== fTipo) return false;
    if (fDesde && new Date(t.fecha) < new Date(fDesde + "T00:00:00")) return false;
    if (fHasta && new Date(t.fecha) > new Date(fHasta + "T23:59:59")) return false;
    return true;
  });

  function puedeEditar(t: TransaccionLista) {
    if (perfilActual.rol === "admin") return true;
    if (t.usuario_id !== perfilActual.user_id) return false;
    const fecha = new Date(t.fecha);
    const hoy = new Date();
    return fecha.getFullYear() === hoy.getFullYear()
      && fecha.getMonth() === hoy.getMonth()
      && fecha.getDate() === hoy.getDate();
  }

  function abrirEdicion(t: TransaccionLista) {
    setEditPayload({
      id: t.id,
      tipo: t.tipo,
      fecha: t.fecha,
      notas: t.notas,
      items: t.items.map((it) => ({
        producto_id: it.producto_id,
        ubicacion_origen_id: it.ubicacion_origen_id,
        ubicacion_destino_id: it.ubicacion_destino_id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        lista_precio_id: it.lista_precio_id,
      })),
    });
  }

  async function confirmarBorrar() {
    if (!borrar) return;
    const res = await deleteTransaccion(borrar.id);
    setBorrar(null);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });
    toast.push({ message: "Transacción eliminada — stock revertido", tone: "success" });
    router.refresh();
  }

  function tipoBadge(tipo: TransaccionLista["tipo"]) {
    if (tipo === "venta") return <Badge tone="green">Venta</Badge>;
    if (tipo === "compra") return <Badge tone="blue">Compra</Badge>;
    return <Badge tone="yellow">Traslado</Badge>;
  }

  function renderItems(t: TransaccionLista) {
    return (
      <div className="space-y-0.5 text-sm">
        {t.items.slice(0, 3).map((it, i) => (
          <div key={i} className="text-muted-foreground">
            <span className="font-mono text-xs">{formatInt(it.cantidad)}×</span>{" "}
            <span className="text-white">{it.productos.nombre}</span>
            {t.tipo === "traslado" ? (
              <span className="text-xs text-muted-foreground">
                {" "}— {it.ubicacion_origen_nombre} → {it.ubicacion_destino_nombre}
              </span>
            ) : null}
          </div>
        ))}
        {t.items.length > 3 ? (
          <div className="text-xs text-muted-foreground">+ {t.items.length - 3} más</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transacciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro manual de ventas, compras y traslados. Cada transacción ajusta el inventario automáticamente.
            El historial de Alegra (SEP 2025 – ABR 2026) está en el <a href="/dashboard" className="text-brand-orange hover:underline">Dashboard</a>.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/transacciones/carga-masiva">
            <Button variant="outline">⬆ Carga masiva (CSV)</Button>
          </Link>
          <Button onClick={() => { setEditPayload(null); setShowNew(true); }}>+ Nueva transacción</Button>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Tipo">
            <Select value={fTipo} onChange={(e) => setFTipo(e.target.value as typeof fTipo)}>
              <option value="todas">Todas</option>
              <option value="venta">Ventas</option>
              <option value="compra">Compras</option>
              <option value="traslado">Traslados</option>
            </Select>
          </Field>
          <Field label="Desde">
            <Input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => { setFTipo("todas"); setFDesde(""); setFHasta(""); }}
              className="w-full"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {filtradas.length} de {transacciones.length} transacción(es). Se muestran las últimas 200 por defecto.
        </p>
      </Card>

      {filtradas.length === 0 ? (
        <EmptyState
          title={transacciones.length === 0 ? "Aún no hay transacciones registradas" : "Sin resultados con esos filtros"}
          description={
            transacciones.length === 0
              ? "Registra la primera venta, compra o traslado con el botón de arriba. El histórico de Alegra (SEP 2025–ABR 2026) aparece en el Dashboard como gráficas de consumo mensual."
              : "Ajusta los filtros o límpialos para ver más resultados."
          }
        />
      ) : (
        <Card>
          <Table>
            <THead><TR><TH>Fecha</TH><TH>Tipo</TH><TH>Ítems</TH><TH className="text-right">Total</TH><TH>Notas</TH><TH className="text-right">Acciones</TH></TR></THead>
            <TBody>
              {filtradas.map((t) => {
                const editable = puedeEditar(t);
                const borrable = perfilActual.rol === "admin" || editable;
                return (
                  <TR key={t.id}>
                    <TD className="whitespace-nowrap text-muted-foreground">{formatDate(t.fecha)}</TD>
                    <TD>{tipoBadge(t.tipo)}</TD>
                    <TD className="max-w-md">{renderItems(t)}</TD>
                    <TD className="text-right font-mono font-semibold text-white">
                      {t.tipo === "traslado" ? <span className="text-muted-foreground">—</span> : formatCOP(t.total)}
                    </TD>
                    <TD className="max-w-xs truncate text-muted-foreground">{t.notas ?? "—"}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        {editable ? (
                          <Button variant="ghost" size="sm" onClick={() => abrirEdicion(t)}>
                            Editar
                          </Button>
                        ) : null}
                        {borrable ? (
                          <Button variant="ghost" size="sm" onClick={() => setBorrar(t)}>
                            Eliminar
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}

      <NuevaTransaccion
        open={showNew || !!editPayload}
        onClose={() => { setShowNew(false); setEditPayload(null); }}
        productos={productos}
        ubicaciones={ubicaciones}
        listasPrecios={listasPrecios}
        editar={editPayload}
      />

      <ConfirmDialog
        open={!!borrar}
        onClose={() => setBorrar(null)}
        onConfirm={confirmarBorrar}
        title="Eliminar transacción"
        message={
          borrar ? (
            <>
              <p>Vas a eliminar {borrar.tipo === "venta" ? "la venta" : borrar.tipo === "compra" ? "la compra" : "el traslado"} del {formatDate(borrar.fecha)}.</p>
              <p className="mt-2">El stock de los ítems se revertirá automáticamente y queda registro en el historial de ajustes.</p>
            </>
          ) : ""
        }
        confirmText="Eliminar"
        danger
      />
    </div>
  );
}
