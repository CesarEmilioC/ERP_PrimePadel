"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { createUbicacion, updateUbicacion, deleteUbicacion } from "./actions";
import type { Ubicacion } from "@/types/db";

const TIPOS = [
  { value: "bodega", label: "Bodega" },
  { value: "nevera", label: "Nevera" },
  { value: "barra", label: "Barra" },
  { value: "vitrina", label: "Vitrina" },
  { value: "oficina", label: "Oficina" },
  { value: "otro", label: "Otro" },
];

export function UbicacionesClient({ initial }: { initial: Ubicacion[] }) {
  const toast = useToast();
  const [rows, setRows] = React.useState<Ubicacion[]>(initial);
  const [editing, setEditing] = React.useState<Ubicacion | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [confirming, setConfirming] = React.useState<Ubicacion | null>(null);

  function refresh(next: Ubicacion) {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === next.id);
      if (i >= 0) { const copy = [...prev]; copy[i] = next; return copy; }
      return [...prev, next].sort((a, b) => a.orden - b.orden);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ubicaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lugares físicos donde se guarda el inventario. Cada producto puede estar en varias ubicaciones.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nueva ubicación</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No hay ubicaciones" description="Crea la primera para empezar a registrar stock." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Tipo</TH>
              <TH>Descripción</TH>
              <TH>Estado</TH>
              <TH className="text-right">Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((u) => (
              <TR key={u.id}>
                <TD className="font-medium text-white">{u.nombre}</TD>
                <TD><Badge tone="blue">{u.tipo}</Badge></TD>
                <TD className="max-w-md text-muted-foreground">{u.descripcion ?? "—"}</TD>
                <TD>{u.activa ? <Badge tone="green">Activa</Badge> : <Badge tone="gray">Inactiva</Badge>}</TD>
                <TD className="text-right">
                  <div className="inline-flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(u)}>Eliminar</Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <UbicacionForm
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(u) => { refresh(u); toast.push({ message: "Ubicación creada", tone: "success" }); }}
      />
      <UbicacionForm
        open={!!editing}
        initial={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSaved={(u) => { refresh(u); toast.push({ message: "Ubicación actualizada", tone: "success" }); }}
      />
      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title="Eliminar ubicación"
        message={<>¿Seguro que quieres eliminar <strong className="text-white">{confirming?.nombre}</strong>? Si tiene movimientos registrados, se marcará como inactiva en lugar de borrarse.</>}
        onConfirm={async () => {
          if (!confirming) return;
          const res = await deleteUbicacion(confirming.id);
          if (res.error) return toast.push({ message: res.error, tone: "error" });
          if (res.softDeleted) {
            setRows((prev) => prev.map((r) => (r.id === confirming.id ? { ...r, activa: false } : r)));
            toast.push({ message: "Ubicación marcada como inactiva (tiene movimientos)", tone: "info" });
          } else {
            setRows((prev) => prev.filter((r) => r.id !== confirming.id));
            toast.push({ message: "Ubicación eliminada", tone: "success" });
          }
          setConfirming(null);
        }}
      />
    </div>
  );
}

function UbicacionForm({
  open, initial, onClose, onSaved,
}: {
  open: boolean;
  initial?: Ubicacion;
  onClose: () => void;
  onSaved: (u: Ubicacion) => void;
}) {
  const toast = useToast();
  const [form, setForm] = React.useState({
    nombre: initial?.nombre ?? "",
    tipo: initial?.tipo ?? "bodega",
    descripcion: initial?.descripcion ?? "",
    orden: initial?.orden ?? 99,
    activa: initial?.activa ?? true,
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm({
      nombre: initial?.nombre ?? "",
      tipo: initial?.tipo ?? "bodega",
      descripcion: initial?.descripcion ?? "",
      orden: initial?.orden ?? 99,
      activa: initial?.activa ?? true,
    });
  }, [initial, open]);

  async function submit() {
    if (!form.nombre.trim()) return toast.push({ message: "El nombre es obligatorio", tone: "error" });
    setSaving(true);
    const payload = { ...form, descripcion: form.descripcion.trim() || null };
    const res = initial
      ? await updateUbicacion(initial.id, payload)
      : await createUbicacion(payload);
    setSaving(false);
    if (res.error) return toast.push({ message: res.error, tone: "error" });
    onSaved({ ...(initial ?? { id: crypto.randomUUID() }), ...payload } as Ubicacion);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? "Editar ubicación" : "Nueva ubicación"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre *">
          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Nevera Barra 2" />
        </Field>
        <Field label="Tipo *">
          <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Ubicacion["tipo"] })}>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Descripción (opcional)">
          <Textarea value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Orden en listas" hint="Menor = primero">
            <Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Estado">
            <Select value={form.activa ? "si" : "no"} onChange={(e) => setForm({ ...form, activa: e.target.value === "si" })}>
              <option value="si">Activa</option>
              <option value="no">Inactiva</option>
            </Select>
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
