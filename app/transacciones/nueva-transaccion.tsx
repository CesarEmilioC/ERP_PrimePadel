"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { registrarTransaccion } from "./actions";
import { formatCOP, formatInt } from "@/lib/utils";

type ProductoOpt = {
  id: string;
  codigo: string | null;
  nombre: string;
  es_inventariable: boolean;
  tipo: "producto" | "servicio";
  precio_detal: number | null;
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

export function NuevaTransaccion({
  open, onClose, productos, ubicaciones, listasPrecios,
}: {
  open: boolean;
  onClose: () => void;
  productos: ProductoOpt[];
  ubicaciones: { id: string; nombre: string }[];
  listasPrecios: { id: string; codigo: string; nombre: string; es_default: boolean }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tipo, setTipo] = React.useState<"venta" | "compra">("venta");
  const [notas, setNotas] = React.useState("");
  const [items, setItems] = React.useState<LineItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [q, setQ] = React.useState("");

  const listaDefault = listasPrecios.find((l) => l.es_default)?.id ?? null;
  const ubicacionDefault = ubicaciones[0]?.id ?? "";

  const productosFiltrados = React.useMemo(() => {
    const s = q.toLowerCase();
    return productos
      .filter((p) => !q || (p.nombre + " " + (p.codigo ?? "")).toLowerCase().includes(s))
      .slice(0, 25);
  }, [productos, q]);

  function agregar(p: ProductoOpt) {
    setItems((prev) => [
      ...prev,
      {
        producto_id: p.id,
        ubicacion_origen_id: tipo === "venta" ? ubicacionDefault : null,
        ubicacion_destino_id: tipo === "compra" ? ubicacionDefault : null,
        cantidad: 1,
        precio_unitario: p.precio_detal ?? 0,
        lista_precio_id: listaDefault,
      },
    ]);
    setQ("");
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

    // Validación cliente de stock (solo venta, productos inventariables)
    if (tipo === "venta") {
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

    setSaving(true);
    const res = await registrarTransaccion({
      tipo,
      notas: notas || null,
      origen: "manual",
      items: items.map((i) => ({
        producto_id: i.producto_id,
        ubicacion_origen_id: tipo === "venta" ? i.ubicacion_origen_id : null,
        ubicacion_destino_id: tipo === "compra" ? i.ubicacion_destino_id : null,
        cantidad: Number(i.cantidad),
        precio_unitario: Number(i.precio_unitario),
        lista_precio_id: i.lista_precio_id,
      })),
    });
    setSaving(false);
    if (res.error) return toast.push({ message: res.error, tone: "error" });
    toast.push({ message: tipo === "venta" ? "Venta registrada" : "Compra registrada", tone: "success" });
    setItems([]);
    setNotas("");
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Nueva transacción"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={submit} disabled={saving}>{saving ? "Registrando..." : `Registrar ${tipo} (${formatCOP(total)})`}</Button></>}
    >
      <div className="space-y-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo("venta")}
            className={`flex-1 rounded-md border px-4 py-3 text-left transition ${tipo === "venta" ? "border-brand-orange bg-brand-orange/10" : "border-border hover:border-brand-orange/50"}`}
          >
            <p className="text-sm font-semibold text-white">Venta</p>
            <p className="text-xs text-muted-foreground">Sale stock desde una ubicación</p>
          </button>
          <button
            type="button"
            onClick={() => setTipo("compra")}
            className={`flex-1 rounded-md border px-4 py-3 text-left transition ${tipo === "compra" ? "border-brand-orange bg-brand-orange/10" : "border-border hover:border-brand-orange/50"}`}
          >
            <p className="text-sm font-semibold text-white">Compra / Ingreso</p>
            <p className="text-xs text-muted-foreground">Entra stock a una ubicación</p>
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
            <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
              <div className="col-span-4">Producto</div>
              <div className="col-span-3">Ubicación {tipo === "venta" ? "(origen)" : "(destino)"}</div>
              <div className="col-span-1 text-right">Cant.</div>
              <div className="col-span-2 text-right">Precio</div>
              <div className="col-span-1 text-right">Subtotal</div>
              <div className="col-span-1"></div>
            </div>
            {items.map((it, i) => {
              const p = productos.find((x) => x.id === it.producto_id)!;
              const ubiField = tipo === "venta" ? "ubicacion_origen_id" : "ubicacion_destino_id";
              const ubiSel = tipo === "venta" ? it.ubicacion_origen_id : it.ubicacion_destino_id;
              const disponible = p?.es_inventariable && ubiSel ? p.stock_por_ubicacion[ubiSel] ?? 0 : null;
              const insuf = tipo === "venta" && p?.es_inventariable && disponible !== null && disponible < it.cantidad;
              return (
                <div key={i} className="grid grid-cols-12 items-center gap-2 border-b border-border px-3 py-2 text-sm">
                  <div className="col-span-4 truncate">
                    <span className="block text-white">{p?.nombre}</span>
                    {p?.codigo ? <span className="block text-xs text-muted-foreground">{p.codigo}</span> : null}
                  </div>
                  <div className="col-span-3">
                    {p?.es_inventariable ? (
                      <Select value={ubiSel ?? ""} onChange={(e) => updateItem(i, { [ubiField]: e.target.value } as any)}>
                        {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}{tipo === "venta" ? ` (${p.stock_por_ubicacion[u.id] ?? 0})` : ""}</option>)}
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A (no se inventaría)</span>
                    )}
                  </div>
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
                      Stock insuficiente: disponible {formatInt(disponible!)} en esta ubicación.
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-border px-3 py-3">
              <p className="text-sm text-muted-foreground">{items.length} línea(s)</p>
              <p className="text-lg font-bold text-white">Total: {formatCOP(total)}</p>
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
