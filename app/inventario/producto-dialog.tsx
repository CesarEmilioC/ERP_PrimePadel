"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea, NumericInput } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createProducto, updateProducto } from "./actions";

type Producto = {
  id: string;
  codigo: string | null;
  nombre: string;
  tipo: "producto" | "servicio";
  categoria_id: string | null;
  es_inventariable: boolean;
  stock_minimo_alerta: number;
  costo_unitario: number;
  impuesto_id: string | null;
  incluye_impuesto_en_precio: boolean;
  unidad_medida: string | null;
  descripcion_larga: string | null;
  referencia_fabrica: string | null;
  codigo_barras: string | null;
  marca: string | null;
  modelo: string | null;
  visible_en_factura: boolean;
  activo: boolean;
};

export function ProductoDialog({
  open, onClose, initial, precios, categorias, impuestos, listasPrecios, isMaestro,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Producto;
  precios?: { lista_precio_id: string; precio: number }[];
  categorias: { id: string; nombre: string }[];
  impuestos: { id: string; nombre: string; porcentaje: number }[];
  listasPrecios: { id: string; codigo: string; nombre: string; es_default: boolean }[];
  isMaestro: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = React.useState(false);
  // "Sin impuesto" debe ser el default cuando es un ítem nuevo.
  const sinImpuestoId = impuestos.find((i) => i.porcentaje === 0)?.id ?? impuestos[0]?.id ?? "";

  const [form, setForm] = React.useState({
    codigo: initial?.codigo ?? "",
    nombre: initial?.nombre ?? "",
    tipo: initial?.tipo ?? "producto",
    categoria_id: initial?.categoria_id ?? categorias[0]?.id ?? "",
    es_inventariable: initial?.es_inventariable ?? true,
    stock_minimo_alerta: initial?.stock_minimo_alerta ?? 0,
    costo_unitario: initial?.costo_unitario ?? 0,
    impuesto_id: initial?.impuesto_id ?? sinImpuestoId,
    incluye_impuesto_en_precio: initial?.incluye_impuesto_en_precio ?? true,
    unidad_medida: initial?.unidad_medida ?? "unidad",
    descripcion_larga: initial?.descripcion_larga ?? "",
    referencia_fabrica: initial?.referencia_fabrica ?? "",
    codigo_barras: initial?.codigo_barras ?? "",
    marca: initial?.marca ?? "",
    modelo: initial?.modelo ?? "",
    visible_en_factura: initial?.visible_en_factura ?? true,
    activo: initial?.activo ?? true,
  });

  const esServicio = form.tipo === "servicio";

  const [preciosState, setPreciosState] = React.useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const l of listasPrecios) {
      const found = precios?.find((p) => p.lista_precio_id === l.id);
      seed[l.id] = found ? String(found.precio) : "";
    }
    return seed;
  });

  // Auto: si es servicio, nunca es inventariable.
  React.useEffect(() => {
    if (form.tipo === "servicio" && form.es_inventariable) {
      setForm((f) => ({ ...f, es_inventariable: false }));
    }
  }, [form.tipo, form.es_inventariable]);

  async function submit() {
    if (!form.nombre.trim()) return toast.push({ message: "Nombre requerido", tone: "error" });
    setSaving(true);
    const payload = {
      ...form,
      codigo: form.codigo?.trim() || null,
      descripcion_larga: form.descripcion_larga?.trim() || null,
      referencia_fabrica: form.referencia_fabrica?.trim() || null,
      codigo_barras: form.codigo_barras?.trim() || null,
      marca: form.marca?.trim() || null,
      modelo: form.modelo?.trim() || null,
      categoria_id: form.categoria_id || null,
      impuesto_id: form.impuesto_id || null,
      unidad_medida: form.unidad_medida?.trim() || null,
      costo_unitario: Number(form.costo_unitario) || 0,
      stock_minimo_alerta: Number(form.stock_minimo_alerta) || 0,
    };
    const preciosPayload = listasPrecios
      .map((l) => ({ lista_precio_id: l.id, precio: Number(preciosState[l.id]) || 0 }))
      .filter((p) => p.precio > 0);

    const res = initial
      ? await updateProducto(initial.id, payload, preciosPayload)
      : await createProducto(payload, preciosPayload);
    setSaving(false);
    if (res.error) return toast.push({ message: res.error, tone: "error" });
    toast.push({ message: initial ? "Ítem actualizado" : "Ítem creado", tone: "success" });
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={initial ? `Editar: ${initial.nombre}` : "Nuevo ítem de inventario"}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={submit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button></>}
    >
      <div className="grid max-h-[70vh] gap-5 overflow-y-auto pr-2 md:grid-cols-2">
        <Field label="Código (SKU)" hint="Único; sirve como referencia corta">
          <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Ej: BRT, 42, CFPP0099" />
        </Field>
        <Field label="Nombre *">
          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </Field>
        <Field label="Tipo">
          <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "producto" | "servicio" })}>
            <option value="producto">Producto (físico, tiene stock)</option>
            <option value="servicio">Servicio (clases, alquileres, etc.)</option>
          </Select>
        </Field>
        <Field label="Categoría">
          <Select value={form.categoria_id ?? ""} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
            <option value="">— sin categoría —</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </Field>
        {!esServicio ? (
          <>
            <Field label="¿Se inventaría?" hint="Productos físicos sin stock (ej. promo): elige No.">
              <Select
                value={form.es_inventariable ? "si" : "no"}
                onChange={(e) => setForm({ ...form, es_inventariable: e.target.value === "si" })}
              >
                <option value="si">Sí</option>
                <option value="no">No</option>
              </Select>
            </Field>
            {form.es_inventariable ? (
              <Field label="Stock mínimo (alerta)">
                <NumericInput value={form.stock_minimo_alerta} onChange={(n) => setForm({ ...form, stock_minimo_alerta: n })} min={0} />
              </Field>
            ) : null}
          </>
        ) : null}
        {isMaestro ? (
          <Field label="Costo unitario">
            <NumericInput value={form.costo_unitario} onChange={(n) => setForm({ ...form, costo_unitario: n })} min={0} />
          </Field>
        ) : null}
        <Field label="Impuesto" hint="Solo informativo. Si no aplica, deja 'Sin impuesto'.">
          <Select value={form.impuesto_id ?? ""} onChange={(e) => setForm({ ...form, impuesto_id: e.target.value })}>
            {impuestos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Unidad de medida" hint={esServicio ? "Ej. hora, sesión, paquete" : "Ej. unidad, gr, ml"}>
          <Input value={form.unidad_medida ?? ""} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} />
        </Field>
        {!esServicio ? (
          <>
            <Field label="Marca">
              <Input value={form.marca ?? ""} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            </Field>
            <Field label="Modelo">
              <Input value={form.modelo ?? ""} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            </Field>
            <Field label="Referencia fábrica">
              <Input value={form.referencia_fabrica ?? ""} onChange={(e) => setForm({ ...form, referencia_fabrica: e.target.value })} />
            </Field>
            <Field label="Código de barras">
              <Input value={form.codigo_barras ?? ""} onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })} />
            </Field>
          </>
        ) : null}
        <Field label="Estado">
          <Select value={form.activo ? "si" : "no"} onChange={(e) => setForm({ ...form, activo: e.target.value === "si" })}>
            <option value="si">Activo</option>
            <option value="no">Inactivo</option>
          </Select>
        </Field>
        <Field label="Descripción" >
          <Textarea rows={2} value={form.descripcion_larga ?? ""} onChange={(e) => setForm({ ...form, descripcion_larga: e.target.value })} />
        </Field>

        {isMaestro ? (
          <div className="md:col-span-2">
            <h3 className="mb-2 mt-2 text-sm font-semibold text-white">Precios por lista</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Deja en blanco o 0 las listas que no apliquen. "Detal" es el precio por defecto al cliente final.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {listasPrecios.map((l) => (
                <Field key={l.id} label={l.nombre + (l.es_default ? " (default)" : "")}>
                  <NumericInput
                    value={Number(preciosState[l.id] ?? 0) || 0}
                    onChange={(n) => setPreciosState({ ...preciosState, [l.id]: n === 0 ? "" : String(n) })}
                    min={0}
                    placeholder="0"
                  />
                </Field>
              ))}
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Los costos y precios solo los gestiona el rol Maestro. Pídele al maestro que los actualice si fuera necesario.
          </div>
        )}
      </div>
    </Dialog>
  );
}
