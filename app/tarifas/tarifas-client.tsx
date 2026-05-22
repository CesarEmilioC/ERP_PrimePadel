"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, NumericInput, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, Card, EmptyState } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { createTarifa, updateTarifa, deleteTarifa } from "./actions";

type Tarifa = {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  activa: boolean;
  es_default: boolean;
  descuento_porcentaje: number;
  productos: number;
};

export function TarifasClient({ tarifas }: { tarifas: Tarifa[] }) {
  const router = useRouter();
  const toast = useToast();
  const [creando, setCreando] = React.useState(false);
  const [editando, setEditando] = React.useState<Tarifa | null>(null);
  const [borrar, setBorrar] = React.useState<Tarifa | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [codigo, setCodigo] = React.useState("");
  const [nombre, setNombre] = React.useState("");
  const [orden, setOrden] = React.useState(0);
  const [activa, setActiva] = React.useState(true);
  const [descuento, setDescuento] = React.useState(0);

  React.useEffect(() => {
    if (editando) {
      setCodigo(editando.codigo);
      setNombre(editando.nombre);
      setOrden(editando.orden);
      setActiva(editando.activa);
      setDescuento(editando.descuento_porcentaje);
    } else if (creando) {
      setCodigo("");
      setNombre("");
      setOrden((tarifas.at(-1)?.orden ?? 0) + 10);
      setActiva(true);
      setDescuento(0);
    }
  }, [editando, creando, tarifas]);

  async function submit() {
    if (saving) return;
    setSaving(true);
    const payload = { codigo, nombre, orden, activa, descuento_porcentaje: descuento };
    const res = editando ? await updateTarifa(editando.id, payload) : await createTarifa(payload);
    setSaving(false);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });
    toast.push({ message: editando ? "Tarifa actualizada" : "Tarifa creada", tone: "success" });
    setCreando(false);
    setEditando(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!borrar) return;
    const res = await deleteTarifa(borrar.id);
    setBorrar(null);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });
    toast.push({ message: "Tarifa eliminada o desactivada", tone: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarifas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define los canales o destinatarios con precios diferenciados (ej. público general, equipo del club, profesores externos).
            Cada tarifa tiene un <strong>descuento %</strong> predeterminado: si un producto no tiene precio configurado para esa tarifa, se usa <code className="text-xs">precio Detal × (1 − descuento%)</code>.
            La tarifa marcada como <strong>default</strong> es la que se autocompleta cuando se registra una venta (normalmente Detal, sin descuento).
          </p>
        </div>
        <Button onClick={() => setCreando(true)}>+ Nueva tarifa</Button>
      </div>

      {tarifas.length === 0 ? (
        <EmptyState
          title="Aún no hay tarifas"
          description="Crea la primera tarifa con el botón de arriba."
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Código</TH>
                <TH>Nombre</TH>
                <TH className="text-right">Descuento %</TH>
                <TH className="text-right">Orden</TH>
                <TH className="text-right">Productos con precio propio</TH>
                <TH>Estado</TH>
                <TH>Default</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {tarifas.map((t) => (
                <TR key={t.id}>
                  <TD className="font-mono text-xs text-muted-foreground">{t.codigo}</TD>
                  <TD className="text-white">{t.nombre}</TD>
                  <TD className="text-right font-mono">
                    {t.es_default ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="text-white">{t.descuento_porcentaje}%</span>
                    )}
                  </TD>
                  <TD className="text-right font-mono text-muted-foreground">{t.orden}</TD>
                  <TD className="text-right text-muted-foreground">{t.productos}</TD>
                  <TD>{t.activa ? <Badge tone="green">Activa</Badge> : <Badge tone="gray">Inactiva</Badge>}</TD>
                  <TD>{t.es_default ? <Badge tone="yellow">Default</Badge> : null}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditando(t)}>Editar</Button>
                      {!t.es_default ? (
                        <Button variant="ghost" size="sm" onClick={() => setBorrar(t)}>Eliminar</Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={creando || !!editando}
        onClose={() => { setCreando(false); setEditando(null); }}
        title={editando ? `Editar ${editando.nombre}` : "Crear tarifa"}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCreando(false); setEditando(null); }}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Guardando..." : (editando ? "Guardar cambios" : "Crear")}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nombre">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Staff Prime Padel" autoFocus />
          </Field>
          <div>
            <Field label="Código (interno)">
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="EJ. STAFF_PRIME"
              />
            </Field>
            <p className="mt-1 text-xs text-muted-foreground">2-30 caracteres en mayúsculas, números o guion bajo. Es un identificador interno; el cliente final solo ve el nombre.</p>
          </div>
          {editando?.es_default ? (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Esta es la tarifa <strong>default</strong> (Detal). El descuento no aplica porque es la tarifa base de la que se calculan las demás.
            </p>
          ) : (
            <div>
              <Field label="Descuento predeterminado (%)">
                <NumericInput value={descuento} onChange={setDescuento} min={0} max={100} step={1} />
              </Field>
              <p className="mt-1 text-xs text-muted-foreground">
                Si un producto no tiene precio configurado para esta tarifa, se calculará automáticamente como
                <code className="ml-1 text-white"> precio Detal × (1 − {descuento}%)</code>.
                Si configuras un precio puntual desde la ficha del producto, ese precio tiene prioridad sobre el cálculo automático.
              </p>
            </div>
          )}
          <Field label="Orden">
            <NumericInput value={orden} onChange={setOrden} min={0} />
          </Field>
          <Field label="Estado">
            <Select value={activa ? "si" : "no"} onChange={(e) => setActiva(e.target.value === "si")}>
              <option value="si">Activa</option>
              <option value="no">Inactiva</option>
            </Select>
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!borrar}
        onClose={() => setBorrar(null)}
        onConfirm={confirmDelete}
        title="Eliminar tarifa"
        message={
          borrar ? (
            <>
              <p>Vas a eliminar la tarifa <strong className="text-white">{borrar.nombre}</strong>.</p>
              {borrar.productos > 0 ? (
                <p className="mt-2">Esta tarifa tiene {borrar.productos} precios asociados. En lugar de borrarla, se marcará como <strong>inactiva</strong> para preservar el histórico.</p>
              ) : null}
            </>
          ) : ""
        }
        confirmText="Eliminar"
        danger
      />
    </div>
  );
}
