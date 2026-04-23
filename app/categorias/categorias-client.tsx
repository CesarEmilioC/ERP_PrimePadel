"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { createCategoria, updateCategoria, deleteCategoria } from "./actions";
import type { Categoria } from "@/types/db";

export function CategoriasClient({ initial, conteoPorCategoria }: { initial: Categoria[]; conteoPorCategoria: Record<string, number> }) {
  const toast = useToast();
  const [rows, setRows] = React.useState<Categoria[]>(initial);
  const [editing, setEditing] = React.useState<Categoria | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [confirming, setConfirming] = React.useState<Categoria | null>(null);

  function refresh(next: Categoria) {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === next.id);
      if (i >= 0) { const copy = [...prev]; copy[i] = next; return copy; }
      return [...prev, next];
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrupa productos y servicios. Útil para filtros del inventario y reportes.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nueva categoría</Button>
      </div>

      <Table>
        <THead>
          <TR><TH>Nombre</TH><TH>Productos</TH><TH>Estado</TH><TH className="text-right">Acciones</TH></TR>
        </THead>
        <TBody>
          {rows.map((c) => (
            <TR key={c.id}>
              <TD className="font-medium text-white">{c.nombre}</TD>
              <TD className="text-muted-foreground">{conteoPorCategoria[c.id] ?? 0}</TD>
              <TD>{c.activa ? <Badge tone="green">Activa</Badge> : <Badge tone="gray">Inactiva</Badge>}</TD>
              <TD className="text-right">
                <div className="inline-flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>Editar</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(c)}>Eliminar</Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <CategoriaForm open={creating} onClose={() => setCreating(false)} onSaved={(c) => { refresh(c); toast.push({ message: "Categoría creada", tone: "success" }); }} />
      <CategoriaForm open={!!editing} initial={editing ?? undefined} onClose={() => setEditing(null)} onSaved={(c) => { refresh(c); toast.push({ message: "Categoría actualizada", tone: "success" }); }} />
      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title="Eliminar categoría"
        message={<>¿Eliminar <strong className="text-white">{confirming?.nombre}</strong>? Si tiene productos asignados se marcará como inactiva.</>}
        onConfirm={async () => {
          if (!confirming) return;
          const res = await deleteCategoria(confirming.id);
          if (res.error) return toast.push({ message: res.error, tone: "error" });
          if (res.softDeleted) {
            setRows((prev) => prev.map((r) => (r.id === confirming.id ? { ...r, activa: false } : r)));
            toast.push({ message: "Categoría marcada como inactiva", tone: "info" });
          } else {
            setRows((prev) => prev.filter((r) => r.id !== confirming.id));
            toast.push({ message: "Categoría eliminada", tone: "success" });
          }
          setConfirming(null);
        }}
      />
    </div>
  );
}

function CategoriaForm({
  open, initial, onClose, onSaved,
}: { open: boolean; initial?: Categoria; onClose: () => void; onSaved: (c: Categoria) => void }) {
  const toast = useToast();
  const [form, setForm] = React.useState({
    nombre: initial?.nombre ?? "",
    descripcion: initial?.descripcion ?? "",
    orden: initial?.orden ?? 99,
    activa: initial?.activa ?? true,
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm({
      nombre: initial?.nombre ?? "",
      descripcion: initial?.descripcion ?? "",
      orden: initial?.orden ?? 99,
      activa: initial?.activa ?? true,
    });
  }, [initial, open]);

  async function submit() {
    if (!form.nombre.trim()) return toast.push({ message: "Nombre requerido", tone: "error" });
    setSaving(true);
    const payload = { ...form, descripcion: form.descripcion?.trim() || null };
    const res = initial ? await updateCategoria(initial.id, payload) : await createCategoria(payload);
    setSaving(false);
    if (res.error) return toast.push({ message: res.error, tone: "error" });
    onSaved({ ...(initial ?? { id: crypto.randomUUID() }), ...payload } as Categoria);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? "Editar categoría" : "Nueva categoría"}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={submit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Nombre *">
          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </Field>
        <Field label="Descripción (opcional)">
          <Textarea rows={2} value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Orden">
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
