"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, Card, EmptyState } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { NuevaTransaccion } from "./nueva-transaccion";
import { deleteTransaccion } from "./actions";
import { formatCOP, formatDate, formatInt } from "@/lib/utils";

type TransaccionLista = {
  id: string;
  tipo: "compra" | "venta" | "traslado";
  fecha: string;
  total: number;
  notas: string | null;
  origen: string;
  items: { productos: { codigo: string | null; nombre: string }; cantidad: number }[];
};

export function TransaccionesClient({
  transacciones, productos, ubicaciones, listasPrecios,
}: {
  transacciones: TransaccionLista[];
  productos: any[];
  ubicaciones: { id: string; nombre: string }[];
  listasPrecios: { id: string; codigo: string; nombre: string; es_default: boolean }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [showNew, setShowNew] = React.useState(false);
  const [fTipo, setFTipo] = React.useState<"todas" | "venta" | "compra">("todas");
  const [borrar, setBorrar] = React.useState<TransaccionLista | null>(null);

  const filtradas = transacciones.filter((t) => (fTipo === "todas" ? true : t.tipo === fTipo));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transacciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro manual de ventas y compras. Cada transacción ajusta el inventario automáticamente.
            El historial de Alegra (SEP 2025 – ABR 2026) está en el <a href="/dashboard" className="text-brand-orange hover:underline">Dashboard</a>.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ Nueva transacción</Button>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Tipo">
            <Select value={fTipo} onChange={(e) => setFTipo(e.target.value as typeof fTipo)}>
              <option value="todas">Todas</option>
              <option value="venta">Ventas</option>
              <option value="compra">Compras</option>
            </Select>
          </Field>
        </div>
      </Card>

      {filtradas.length === 0 ? (
        <EmptyState
          title="Aún no hay transacciones registradas"
          description="Registra la primera venta o compra con el botón de arriba. El historial histórico de Alegra (SEP 2025–ABR 2026) aparece en el Dashboard como gráficas de consumo mensual."
        />
      ) : (
        <Table>
          <THead><TR><TH>Fecha</TH><TH>Tipo</TH><TH>Ítems</TH><TH className="text-right">Total</TH><TH>Notas</TH><TH className="text-right">Acciones</TH></TR></THead>
          <TBody>
            {filtradas.map((t) => (
              <TR key={t.id}>
                <TD className="whitespace-nowrap text-muted-foreground">{formatDate(t.fecha)}</TD>
                <TD>
                  {t.tipo === "venta" ? <Badge tone="green">Venta</Badge> :
                   t.tipo === "compra" ? <Badge tone="blue">Compra</Badge> :
                   <Badge tone="gray">Traslado</Badge>}
                </TD>
                <TD className="max-w-md">
                  <div className="space-y-0.5 text-sm">
                    {t.items.slice(0, 3).map((it, i) => (
                      <div key={i} className="text-muted-foreground">
                        <span className="font-mono text-xs">{formatInt(it.cantidad)}×</span>{" "}
                        <span className="text-white">{it.productos.nombre}</span>
                      </div>
                    ))}
                    {t.items.length > 3 ? <div className="text-xs text-muted-foreground">+ {t.items.length - 3} más</div> : null}
                  </div>
                </TD>
                <TD className="text-right font-mono font-semibold text-white">{formatCOP(t.total)}</TD>
                <TD className="max-w-xs truncate text-muted-foreground">{t.notas ?? "—"}</TD>
                <TD className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setBorrar(t)}>Eliminar</Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <NuevaTransaccion
        open={showNew}
        onClose={() => setShowNew(false)}
        productos={productos}
        ubicaciones={ubicaciones}
        listasPrecios={listasPrecios}
      />

      <ConfirmDialog
        open={!!borrar}
        onClose={() => setBorrar(null)}
        title="Eliminar transacción"
        message={<>¿Seguro que quieres eliminar esta <strong className="text-white">{borrar?.tipo}</strong> por {borrar ? formatCOP(borrar.total) : ""}? Se revertirá el movimiento de stock correspondiente.</>}
        onConfirm={async () => {
          if (!borrar) return;
          const res = await deleteTransaccion(borrar.id);
          if (res.error) return toast.push({ message: res.error, tone: "error" });
          toast.push({ message: "Transacción eliminada y stock revertido", tone: "success" });
          setBorrar(null);
          router.refresh();
        }}
      />
    </div>
  );
}
