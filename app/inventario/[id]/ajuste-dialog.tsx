"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { registrarAjusteInventario } from "../actions";
import { formatInt } from "@/lib/utils";

export function AjusteDialog({
  open, onClose, productoId, productoNombre, ubicaciones,
}: {
  open: boolean;
  onClose: () => void;
  productoId: string;
  productoNombre: string;
  ubicaciones: { id: string; nombre: string; cantidad: number }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = React.useState(false);
  const [ubicacionId, setUbicacionId] = React.useState(ubicaciones[0]?.id ?? "");
  const [nueva, setNueva] = React.useState<string>("");
  const [motivo, setMotivo] = React.useState("conteo_fisico");
  const [notas, setNotas] = React.useState("");

  const ubi = ubicaciones.find((u) => u.id === ubicacionId);
  const actual = ubi?.cantidad ?? 0;
  const nuevaNum = nueva === "" ? null : Math.max(0, Number(nueva) || 0);
  const diff = nuevaNum === null ? null : nuevaNum - actual;

  async function submit() {
    if (!ubicacionId) return toast.push({ message: "Selecciona una ubicación", tone: "error" });
    if (nuevaNum === null) return toast.push({ message: "Ingresa la cantidad nueva", tone: "error" });
    setSaving(true);
    const res = await registrarAjusteInventario({
      producto_id: productoId,
      ubicacion_id: ubicacionId,
      cantidad_nueva: nuevaNum,
      motivo,
      notas: notas.trim() || null,
    });
    setSaving(false);
    if (res.error) return toast.push({ message: res.error, tone: "error" });
    toast.push({ message: "Ajuste registrado", tone: "success" });
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={`Ajuste de inventario — ${productoNombre}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={submit} disabled={saving}>{saving ? "Guardando..." : "Registrar ajuste"}</Button></>}
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          Usa este formulario cuando hagas un conteo físico, detectes una merma, rotura o corrección manual.
          Toda modificación queda registrada con fecha, motivo y cantidad anterior.
        </div>

        <Field label="Ubicación">
          <Select value={ubicacionId} onChange={(e) => setUbicacionId(e.target.value)}>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre} (actual: {u.cantidad})</option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Cantidad actual</p>
            <p className="mt-1 text-2xl font-bold text-white">{formatInt(actual)}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Nueva cantidad</p>
            <Input
              type="number"
              min={0}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              className="mt-1 h-10 text-xl"
              placeholder="0"
            />
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Diferencia</p>
            <p className="mt-1 text-2xl font-bold">
              {diff === null ? (
                <span className="text-muted-foreground">—</span>
              ) : diff === 0 ? (
                <Badge tone="gray">Sin cambio</Badge>
              ) : diff > 0 ? (
                <Badge tone="green">+{diff}</Badge>
              ) : (
                <Badge tone="red">{diff}</Badge>
              )}
            </p>
          </div>
        </div>

        <Field label="Motivo del ajuste *">
          <Select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="conteo_fisico">Conteo físico</option>
            <option value="ingreso_inicial">Ingreso inicial (carga del inventario)</option>
            <option value="merma">Merma (vencimiento, daño)</option>
            <option value="rotura">Rotura</option>
            <option value="correccion">Corrección manual</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>

        <Field label="Notas (opcional)">
          <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Conteo del lunes en la mañana, confirmado por Juan" />
        </Field>
      </div>
    </Dialog>
  );
}
