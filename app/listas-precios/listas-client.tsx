"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, NumericInput, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, Card, EmptyState } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { createLista, updateLista, deleteLista } from "./actions";

type Lista = {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  activa: boolean;
  es_default: boolean;
  productos: number;
};

export function ListasClient({ listas }: { listas: Lista[] }) {
  const router = useRouter();
  const toast = useToast();
  const [creando, setCreando] = React.useState(false);
  const [editando, setEditando] = React.useState<Lista | null>(null);
  const [borrar, setBorrar] = React.useState<Lista | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [codigo, setCodigo] = React.useState("");
  const [nombre, setNombre] = React.useState("");
  const [orden, setOrden] = React.useState(0);
  const [activa, setActiva] = React.useState(true);

  React.useEffect(() => {
    if (editando) {
      setCodigo(editando.codigo);
      setNombre(editando.nombre);
      setOrden(editando.orden);
      setActiva(editando.activa);
    } else if (creando) {
      setCodigo(""); setNombre(""); setOrden((listas.at(-1)?.orden ?? 0) + 10); setActiva(true);
    }
  }, [editando, creando, listas]);

  async function submit() {
    if (saving) return;
    setSaving(true);
    const res = editando
      ? await updateLista(editando.id, { codigo, nombre, orden, activa })
      : await createLista({ codigo, nombre, orden, activa });
    setSaving(false);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });
    toast.push({ message: editando ? "Lista actualizada" : "Lista creada", tone: "success" });
    setCreando(false);
    setEditando(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!borrar) return;
    const res = await deleteLista(borrar.id);
    setBorrar(null);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });
    toast.push({ message: "Lista eliminada o desactivada", tone: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Listas de precios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define los canales o destinatarios con precios diferenciados (ej. público general, equipos, profesores externos).
            La lista marcada como <strong>default</strong> es la que se autocompleta cuando se registra una venta.
          </p>
        </div>
        <Button onClick={() => setCreando(true)}>+ Nueva lista</Button>
      </div>

      {listas.length === 0 ? (
        <EmptyState
          title="Aún no hay listas de precios"
          description="Crea la primera lista con el botón de arriba."
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Código</TH>
                <TH>Nombre</TH>
                <TH className="text-right">Orden</TH>
                <TH className="text-right">Productos con esta lista</TH>
                <TH>Estado</TH>
                <TH>Default</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {listas.map((l) => (
                <TR key={l.id}>
                  <TD className="font-mono text-xs text-muted-foreground">{l.codigo}</TD>
                  <TD className="text-white">{l.nombre}</TD>
                  <TD className="text-right font-mono text-muted-foreground">{l.orden}</TD>
                  <TD className="text-right text-muted-foreground">{l.productos}</TD>
                  <TD>{l.activa ? <Badge tone="green">Activa</Badge> : <Badge tone="gray">Inactiva</Badge>}</TD>
                  <TD>{l.es_default ? <Badge tone="yellow">Default</Badge> : null}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditando(l)}>Editar</Button>
                      {!l.es_default ? (
                        <Button variant="ghost" size="sm" onClick={() => setBorrar(l)}>Eliminar</Button>
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
        title={editando ? `Editar ${editando.nombre}` : "Crear lista de precios"}
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
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Pedro López" autoFocus />
          </Field>
          <div>
            <Field label="Código (interno)">
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="EJ. PEDRO_LOPEZ"
              />
            </Field>
            <p className="mt-1 text-xs text-muted-foreground">2-30 caracteres en mayúsculas, números o guion bajo. Es un identificador interno; el cliente final solo ve el nombre.</p>
          </div>
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
        title="Eliminar lista de precios"
        message={
          borrar ? (
            <>
              <p>Vas a eliminar la lista <strong className="text-white">{borrar.nombre}</strong>.</p>
              {borrar.productos > 0 ? (
                <p className="mt-2">Esta lista tiene {borrar.productos} precios asociados. En lugar de borrarla, se marcará como <strong>inactiva</strong> para preservar el histórico.</p>
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
