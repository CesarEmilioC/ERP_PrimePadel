"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { registrarTransaccion, editarTransaccion } from "./actions";
import { formatCOP, formatInt } from "@/lib/utils";

type ProductoOpt = {
  id: string;
  codigo: string | null;
  nombre: string;
  es_inventariable: boolean;
  tipo: "producto" | "servicio";
  precio_detal: number | null;
  costo_unitario: number;
  stock_por_ubicacion: Record<string, number>;
};

type LineItem = {
  producto_id: string;
  ubicacion_origen_id: string | null;
  ubicacion_destino_id: string | null;
  cantidad: number;
  precio_unitario: number;
  lista_precio_id: string | null;
};

export type EditarPayload = {
  id: string;
  tipo: "venta" | "compra" | "traslado";
  fecha: string;
  notas: string | null;
  items: LineItem[];
};

export function NuevaTransaccion({
  open, onClose, productos, ubicaciones, listasPrecios, editar,
}: {
  open: boolean;
  onClose: () => void;
  productos: ProductoOpt[];
  ubicaciones: { id: string; nombre: string }[];
  listasPrecios: { id: string; codigo: string; nombre: string; es_default: boolean }[];
  editar?: EditarPayload | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tipo, setTipo] = React.useState<"venta" | "compra" | "traslado">("venta");
  const [notas, setNotas] = React.useState("");
  const [items, setItems] = React.useState<LineItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [q, setQ] = React.useState("");

  // Cargar datos cuando se abre en modo edición.
  React.useEffect(() => {
    if (open && editar) {
      setTipo(editar.tipo);
      setNotas(editar.notas ?? "");
      setItems(editar.items);
    } else if (open && !editar) {
      setTipo("venta");
      setNotas("");
      setItems([]);
    }
  }, [open, editar]);

  const isEdit = !!editar;

  const listaDefault = listasPrecios.find((l) => l.es_default)?.id ?? null;
  const ubicacionDefault = ubicaciones[0]?.id ?? "";

  const productosFiltrados = React.useMemo(() => {
    const s = q.toLowerCase();
    return productos
      .filter((p) => !q || (p.nombre + " " + (p.codigo ?? "")).toLowerCase().includes(s))
      .slice(0, 25);
  }, [productos, q]);

  function precioDefaultParaTipo(p: ProductoOpt, t: "venta" | "compra" | "traslado") {
    if (t === "venta") return p.precio_detal ?? 0;
    return p.costo_unitario; // compra y traslado usan costo
  }

  function agregar(p: ProductoOpt) {
    // Traslado solo aplica a productos inventariables.
    if (tipo === "traslado" && !p.es_inventariable) {
      toast.push({ message: "Los traslados solo aplican a productos con stock", tone: "error" });
      return;
    }
    const segundaUbi = ubicaciones[1]?.id ?? ubicacionDefault;
    setItems((prev) => [
      ...prev,
      {
        producto_id: p.id,
        ubicacion_origen_id: tipo === "compra" ? null : ubicacionDefault,
        ubicacion_destino_id: tipo === "venta" ? null : (tipo === "traslado" ? segundaUbi : ubicacionDefault),
        cantidad: 1,
        precio_unitario: precioDefaultParaTipo(p, tipo),
        lista_precio_id: listaDefault,
      },
    ]);
    setQ("");
  }

  // Cuando cambia el tipo, refrescar precios + ubicaciones para coincidir con el nuevo modo.
  function cambiarTipo(nuevoTipo: "venta" | "compra" | "traslado") {
    if (nuevoTipo === tipo) return;
    const segundaUbi = ubicaciones[1]?.id ?? ubicacionDefault;
    setTipo(nuevoTipo);
    setItems((prev) =>
      prev
        // Si se cambia a traslado, descartar items no inventariables.
        .filter((it) => {
          if (nuevoTipo !== "traslado") return true;
          const p = productos.find((x) => x.id === it.producto_id);
          return p?.es_inventariable;
        })
        .map((it) => {
          const p = productos.find((x) => x.id === it.producto_id);
          if (!p) return it;
          return {
            ...it,
            precio_unitario: precioDefaultParaTipo(p, nuevoTipo),
            ubicacion_origen_id: nuevoTipo === "compra" ? null : (it.ubicacion_origen_id ?? ubicacionDefault),
            ubicacion_destino_id:
              nuevoTipo === "venta"
                ? null
                : nuevoTipo === "traslado"
                ? (it.ubicacion_destino_id ?? segundaUbi)
                : (it.ubicacion_destino_id ?? ubicacionDefault),
          };
        }),
    );
  }

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const total = items.reduce((acc, it) => acc + (it.cantidad || 0) * (it.precio_unitario || 0), 0);

  async function submit() {
    if (items.length === 0) return toast.push({ message: "Agrega al menos un producto", tone: "error" });

    // Validación cliente de stock (venta y traslado descuentan del origen).
    if (tipo === "venta" || tipo === "traslado") {
      for (const it of items) {
        const p = productos.find((x) => x.id === it.producto_id);
        if (!p?.es_inventariable) continue;
        const disponible = it.ubicacion_origen_id ? (p.stock_por_ubicacion[it.ubicacion_origen_id] ?? 0) : 0;
        if (disponible < it.cantidad) {
          const ubi = ubicaciones.find((u) => u.id === it.ubicacion_origen_id)?.nombre ?? "?";
          return toast.push({ message: `Stock insuficiente para ${p.nombre} en ${ubi} (disponible ${disponible})`, tone: "error" });
        }
      }
    }

    // En traslado: origen ≠ destino y ambos requeridos.
    if (tipo === "traslado") {
      for (const it of items) {
        if (!it.ubicacion_origen_id || !it.ubicacion_destino_id) {
          return toast.push({ message: "Cada ítem de traslado requiere origen y destino", tone: "error" });
        }
        if (it.ubicacion_origen_id === it.ubicacion_destino_id) {
          const p = productos.find((x) => x.id === it.producto_id);
          return toast.push({ message: `${p?.nombre}: origen y destino no pueden ser iguales`, tone: "error" });
        }
      }
    }

    const payload = {
      tipo,
      notas: notas || null,
      origen: isEdit ? "manual" : "manual",
      items: items.map((i) => ({
        producto_id: i.producto_id,
        ubicacion_origen_id: tipo === "compra" ? null : i.ubicacion_origen_id,
        ubicacion_destino_id: tipo === "venta" ? null : i.ubicacion_destino_id,
        cantidad: Number(i.cantidad),
        precio_unitario: Number(i.precio_unitario),
        lista_precio_id: i.lista_precio_id,
      })),
    };

    setSaving(true);
    const res = isEdit && editar
      ? await editarTransaccion(editar.id, payload)
      : await registrarTransaccion(payload);
    setSaving(false);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });
    const msg = isEdit
      ? "Transacción actualizada"
      : tipo === "venta" ? "Venta registrada" : tipo === "compra" ? "Compra registrada" : "Traslado registrado";
    toast.push({ message: msg, tone: "success" });
    setItems([]);
    setNotas("");
    setTipo("venta");
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? "Editar transacción" : "Nueva transacción"}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={submit} disabled={saving}>{saving ? "Guardando..." : isEdit ? `Guardar cambios (${formatCOP(total)})` : `Registrar ${tipo} (${formatCOP(total)})`}</Button></>}
    >
      <div className="space-y-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cambiarTipo("venta")}
            className={`flex-1 rounded-md border px-4 py-3 text-left transition ${tipo === "venta" ? "border-brand-orange bg-brand-orange/10" : "border-border hover:border-brand-orange/50"}`}
          >
            <p className="text-sm font-semibold text-white">Venta</p>
            <p className="text-xs text-muted-foreground">Sale stock de una ubicación. Precio = lo que paga el cliente.</p>
          </button>
          <button
            type="button"
            onClick={() => cambiarTipo("compra")}
            className={`flex-1 rounded-md border px-4 py-3 text-left transition ${tipo === "compra" ? "border-brand-orange bg-brand-orange/10" : "border-border hover:border-brand-orange/50"}`}
          >
            <p className="text-sm font-semibold text-white">Compra / Ingreso</p>
            <p className="text-xs text-muted-foreground">Entra stock a una ubicación. Precio = costo del proveedor.</p>
          </button>
          <button
            type="button"
            onClick={() => cambiarTipo("traslado")}
            className={`flex-1 rounded-md border px-4 py-3 text-left transition ${tipo === "traslado" ? "border-brand-orange bg-brand-orange/10" : "border-border hover:border-brand-orange/50"}`}
          >
            <p className="text-sm font-semibold text-white">Traslado</p>
            <p className="text-xs text-muted-foreground">Mueve stock entre dos ubicaciones del club (no es venta ni compra).</p>
          </button>
        </div>

        <Field label="Buscar producto o servicio">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe nombre o código..." />
        </Field>
        {q ? (
          <div className="max-h-56 overflow-auto rounded-md border border-border">
            {productosFiltrados.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">Sin resultados</p>
            ) : (
              productosFiltrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => agregar(p)}
                  className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="flex-1 truncate text-white">
                    {p.codigo ? <span className="mr-2 font-mono text-xs text-muted-foreground">{p.codigo}</span> : null}
                    {p.nombre}
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    {p.es_inventariable ? <Badge tone="gray">stock</Badge> : <Badge tone="blue">{p.tipo === "servicio" ? "servicio" : "no inv."}</Badge>}
                    {p.precio_detal ? <span className="text-muted-foreground">{formatCOP(p.precio_detal)}</span> : null}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="rounded-md border border-border">
            {/* Header */}
            {tipo === "traslado" ? (
              <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                <div className="col-span-3">Producto</div>
                <div className="col-span-2">Origen</div>
                <div className="col-span-2">Destino</div>
                <div className="col-span-1 text-right">Cant.</div>
                <div className="col-span-2 text-right" title="Costo unitario de referencia — los traslados no afectan ingresos">Costo unit. (ref.)</div>
                <div className="col-span-1 text-right">Subtotal</div>
                <div className="col-span-1"></div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                <div className="col-span-4">Producto</div>
                <div className="col-span-3">Ubicación {tipo === "venta" ? "(origen)" : "(destino)"}</div>
                <div className="col-span-1 text-right">Cant.</div>
                <div className="col-span-2 text-right" title={tipo === "compra" ? "Costo unitario que pagamos al proveedor" : "Precio que paga el cliente"}>
                  {tipo === "compra" ? "Costo unitario" : "Precio venta"}
                </div>
                <div className="col-span-1 text-right">Subtotal</div>
                <div className="col-span-1"></div>
              </div>
            )}

            {items.map((it, i) => {
              const p = productos.find((x) => x.id === it.producto_id)!;
              const isTraslado = tipo === "traslado";
              const ubiSelOrig = it.ubicacion_origen_id;
              const ubiSelDest = it.ubicacion_destino_id;
              const ubiSelSimple = tipo === "venta" ? ubiSelOrig : ubiSelDest;
              const ubiField = tipo === "venta" ? "ubicacion_origen_id" : "ubicacion_destino_id";
              const disponibleOrigen = p?.es_inventariable && ubiSelOrig ? (p.stock_por_ubicacion[ubiSelOrig] ?? 0) : null;
              const necesitaStock = tipo === "venta" || tipo === "traslado";
              const insuf = necesitaStock && p?.es_inventariable && disponibleOrigen !== null && disponibleOrigen < it.cantidad;
              const trasladoMismo = isTraslado && ubiSelOrig && ubiSelDest && ubiSelOrig === ubiSelDest;

              return (
                <div key={i} className="grid grid-cols-12 items-center gap-2 border-b border-border px-3 py-2 text-sm">
                  <div className={isTraslado ? "col-span-3 truncate" : "col-span-4 truncate"}>
                    <span className="block text-white">{p?.nombre}</span>
                    {p?.codigo ? <span className="block text-xs text-muted-foreground">{p.codigo}</span> : null}
                  </div>

                  {isTraslado ? (
                    <>
                      <div className="col-span-2">
                        <Select value={ubiSelOrig ?? ""} onChange={(e) => updateItem(i, { ubicacion_origen_id: e.target.value })}>
                          {ubicaciones.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre} ({p.stock_por_ubicacion[u.id] ?? 0})
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Select value={ubiSelDest ?? ""} onChange={(e) => updateItem(i, { ubicacion_destino_id: e.target.value })}>
                          {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-3">
                      {p?.es_inventariable ? (
                        <Select value={ubiSelSimple ?? ""} onChange={(e) => updateItem(i, { [ubiField]: e.target.value } as any)}>
                          {ubicaciones.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre}{tipo === "venta" ? ` (${p.stock_por_ubicacion[u.id] ?? 0})` : ""}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A (no se inventaría)</span>
                      )}
                    </div>
                  )}

                  <div className="col-span-1">
                    <Input type="number" min={1} value={it.cantidad} onChange={(e) => updateItem(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })} className="h-9 text-right" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={it.precio_unitario} onChange={(e) => updateItem(i, { precio_unitario: Number(e.target.value) || 0 })} className="h-9 text-right font-mono" />
                  </div>
                  <div className="col-span-1 text-right font-mono text-white">{formatCOP(it.cantidad * it.precio_unitario)}</div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => removeItem(i)} className="text-xs text-muted-foreground hover:text-red-400">✕</button>
                  </div>
                  {insuf ? (
                    <div className="col-span-12 -mt-1 text-xs text-red-400">
                      Stock insuficiente: disponible {formatInt(disponibleOrigen!)} en el origen.
                    </div>
                  ) : null}
                  {trasladoMismo ? (
                    <div className="col-span-12 -mt-1 text-xs text-red-400">
                      Origen y destino no pueden ser la misma ubicación.
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-border px-3 py-3">
              <p className="text-sm text-muted-foreground">{items.length} línea(s)</p>
              <p className="text-lg font-bold text-white">
                {tipo === "traslado"
                  ? `Costo movido (ref.): ${formatCOP(total)}`
                  : `Total ${tipo === "compra" ? "compra (costo)" : "venta"}: ${formatCOP(total)}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Busca y agrega productos arriba.
          </div>
        )}

        <Field label="Notas (opcional)">
          <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Referencia, cliente, mesa, etc." />
        </Field>
      </div>
    </Dialog>
  );
}
