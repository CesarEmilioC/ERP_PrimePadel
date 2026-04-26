"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, Card, EmptyState } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { NuevaTransaccion, type EditarPayload } from "./nueva-transaccion";
import { deleteTransaccion } from "./actions";
import { formatCOP, formatDate, formatInt, formatFechaHora } from "@/lib/utils";
import type { Rol } from "@/lib/auth";

type ItemListado = {
  producto_id: string;
  ubicacion_origen_id: string | null;
  ubicacion_destino_id: string | null;
  cantidad: number;
  precio_unitario: number;
  lista_precio_id: string | null;
  productos: { codigo: string | null; nombre: string };
  categoria_id: string | null;
  categoria_nombre: string | null;
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
  usuario_nombre: string | null;
  usuario_username: string | null;
  usuario_rol: "maestro" | "admin" | "recepcion" | null;
  items: ItemListado[];
};

export function TransaccionesClient({
  transacciones, productos, ubicaciones, listasPrecios, perfilActual, categoriasFiltro, productosFiltro,
}: {
  transacciones: TransaccionLista[];
  productos: any[];
  ubicaciones: { id: string; nombre: string }[];
  listasPrecios: { id: string; codigo: string; nombre: string; es_default: boolean }[];
  perfilActual: { rol: Rol; user_id: string };
  categoriasFiltro: { id: string; nombre: string }[];
  productosFiltro: { id: string; nombre: string; codigo: string | null }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [showNew, setShowNew] = React.useState(false);
  const [editPayload, setEditPayload] = React.useState<EditarPayload | null>(null);
  const PAGE_SIZE = 10;
  const [fTipo, setFTipo] = React.useState<"todas" | "venta" | "compra" | "traslado">("todas");
  const [fDesde, setFDesde] = React.useState<string>("");
  const [fHasta, setFHasta] = React.useState<string>("");
  const [fCategorias, setFCategorias] = React.useState<string[]>([]);
  const [fProductos, setFProductos] = React.useState<string[]>([]);
  const [borrar, setBorrar] = React.useState<TransaccionLista | null>(null);
  const [page, setPage] = React.useState(0);

  // Para evitar hydration mismatch: el cálculo de "es hoy" depende de la zona
  // horaria del cliente, así que solo renderizamos los botones de acción tras
  // el mount. Antes del mount no aparecen.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => { setPage(0); }, [fTipo, fDesde, fHasta, fCategorias, fProductos]);

  const esRecepcion = perfilActual.rol === "recepcion";
  const esMaestro = perfilActual.rol === "maestro";

  const filtradas = transacciones.filter((t) => {
    if (fTipo !== "todas" && t.tipo !== fTipo) return false;
    if (fDesde && new Date(t.fecha) < new Date(fDesde + "T00:00:00")) return false;
    if (fHasta && new Date(t.fecha) > new Date(fHasta + "T23:59:59")) return false;
    if (fCategorias.length > 0) {
      const hit = t.items.some((it) => it.categoria_id && fCategorias.includes(it.categoria_id));
      if (!hit) return false;
    }
    if (fProductos.length > 0) {
      const hit = t.items.some((it) => fProductos.includes(it.producto_id));
      if (!hit) return false;
    }
    return true;
  });

  function puedeEditar(t: TransaccionLista) {
    if (esMaestro) return true;
    // Admin puede editar/borrar todo lo que NO haya creado el maestro.
    if (perfilActual.rol === "admin") {
      return t.usuario_rol !== "maestro";
    }
    // Recepción: sus propias ventas o traslados del día (no compras).
    if (t.usuario_id !== perfilActual.user_id) return false;
    if (esRecepcion && t.tipo === "compra") return false;
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transacciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {esRecepcion
              ? "Registra las ventas del turno. Cada transacción queda guardada con tu usuario, fecha y hora."
              : "Registro manual de ventas, compras y traslados. Cada transacción ajusta el inventario automáticamente."}
            {esMaestro ? <> El historial de Alegra (SEP 2025 – ABR 2026) está en el <a href="/dashboard" className="text-brand-orange hover:underline">Dashboard</a>.</> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/transacciones/carga-masiva">
            <Button variant="outline">⬆ Carga masiva (CSV)</Button>
          </Link>
          <Button onClick={() => { setEditPayload(null); setShowNew(true); }}>+ Nueva transacción</Button>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Tipo">
            <Select value={fTipo} onChange={(e) => setFTipo(e.target.value as typeof fTipo)}>
              <option value="todas">Todas</option>
              <option value="venta">Ventas</option>
              {!esRecepcion ? <option value="compra">Compras</option> : null}
              <option value="traslado">Traslados</option>
            </Select>
          </Field>
          <Field label="Desde">
            <Input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} />
          </Field>
          <Field label="Categoría">
            <MultiSelect
              options={categoriasFiltro.map((c) => ({ value: c.id, label: c.nombre }))}
              value={fCategorias}
              onChange={setFCategorias}
              placeholder="Todas las categorías"
            />
          </Field>
          <Field label="Producto">
            <MultiSelect
              options={productosFiltro.map((p) => ({ value: p.id, label: p.codigo ? `${p.codigo} — ${p.nombre}` : p.nombre }))}
              value={fProductos}
              onChange={setFProductos}
              placeholder="Todos los productos"
            />
          </Field>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => { setFTipo("todas"); setFDesde(""); setFHasta(""); setFCategorias([]); setFProductos([]); }}
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

      {filtradas.length > PAGE_SIZE ? (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtradas.length)} de {filtradas.length}
          </span>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded px-2 py-1 hover:text-white disabled:opacity-30">← Ant.</button>
          <span>{page + 1} / {Math.ceil(filtradas.length / PAGE_SIZE)}</span>
          <button disabled={page >= Math.ceil(filtradas.length / PAGE_SIZE) - 1} onClick={() => setPage((p) => p + 1)} className="rounded px-2 py-1 hover:text-white disabled:opacity-30">Sig. →</button>
        </div>
      ) : null}

      {filtradas.length === 0 ? (
        <EmptyState
          title={transacciones.length === 0 ? "Aún no hay transacciones registradas" : "Sin resultados con esos filtros"}
          description={
            transacciones.length === 0
              ? "Registra la primera transacción con el botón de arriba."
              : "Ajusta los filtros o límpialos para ver más resultados."
          }
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Fecha y hora</TH>
                <TH>Tipo</TH>
                <TH>Registró</TH>
                <TH>Ítems</TH>
                <TH className="text-right">Total</TH>
                <TH>Notas</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {filtradas.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((t) => {
                const editable = mounted && puedeEditar(t);
                const borrable = mounted && (esMaestro || editable);
                return (
                  <TR key={t.id}>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatFechaHora(t.fecha)}</TD>
                    <TD>{tipoBadge(t.tipo)}</TD>
                    <TD className="whitespace-nowrap">
                      {t.usuario_username ? (
                        <span className="text-white">
                          <span className="font-mono text-xs">{t.usuario_username}</span>
                          {t.usuario_nombre ? <span className="ml-1 text-xs text-muted-foreground">({t.usuario_nombre})</span> : null}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">desconocido</span>
                      )}
                      {t.origen === "csv" ? (
                        <span className="ml-2 rounded bg-blue-950/40 px-1.5 py-0.5 text-[10px] uppercase text-blue-300">CSV</span>
                      ) : null}
                    </TD>
                    <TD className="max-w-md">{renderItems(t)}</TD>
                    <TD className="text-right font-mono font-semibold text-white">
                      {t.tipo === "traslado" ? <span className="text-muted-foreground">—</span> : formatCOP(t.total)}
                    </TD>
                    <TD className="max-w-xs truncate text-muted-foreground">{t.notas ?? "—"}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        {editable ? <Button variant="ghost" size="sm" onClick={() => abrirEdicion(t)}>Editar</Button> : null}
                        {borrable ? <Button variant="ghost" size="sm" onClick={() => setBorrar(t)}>Eliminar</Button> : null}
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
        rol={perfilActual.rol}
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
