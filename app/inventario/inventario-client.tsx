"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Field, Select } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, Card } from "@/components/ui/table";
import { ProductoDialog } from "./producto-dialog";
import { formatCOP, formatInt } from "@/lib/utils";

export type InventarioRow = {
  id: string;
  codigo: string | null;
  nombre: string;
  tipo: "producto" | "servicio";
  categoria_id: string | null;
  categoria_nombre: string | null;
  es_inventariable: boolean;
  activo: boolean;
  stock_minimo_alerta: number;
  costo_unitario: number;
  impuesto_porcentaje: number | null;
  cantidad_total: number;
  precio_detal: number | null;
  estado_stock: "ok" | "stock_bajo" | "sin_stock" | null;
  cantidad_por_ubicacion: Record<string, number>;
};

export function InventarioClient({
  rows, categorias, ubicaciones, impuestos, listasPrecios, isMaestro,
}: {
  rows: InventarioRow[];
  categorias: { id: string; nombre: string }[];
  ubicaciones: { id: string; nombre: string }[];
  impuestos: { id: string; nombre: string; porcentaje: number }[];
  listasPrecios: { id: string; codigo: string; nombre: string; es_default: boolean }[];
  isMaestro: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [fCats, setFCats] = React.useState<string[]>([]);
  const [fUbis, setFUbis] = React.useState<string[]>([]);
  const [fTipo, setFTipo] = React.useState<"todos" | "producto" | "servicio">("todos");
  const [fEstado, setFEstado] = React.useState<"todos" | "solo_activos" | "solo_inactivos">("solo_activos");
  const [fStock, setFStock] = React.useState<"todos" | "stock_bajo" | "sin_stock" | "con_stock">("todos");
  const [min, setMin] = React.useState("");
  const [max, setMax] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (q) {
        const s = q.toLowerCase();
        const hay = (r.nombre + " " + (r.codigo ?? "")).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (fCats.length > 0 && (!r.categoria_id || !fCats.includes(r.categoria_id))) return false;
      if (fUbis.length > 0) {
        const enAlguna = fUbis.some((uid) => (r.cantidad_por_ubicacion[uid] ?? 0) > 0);
        if (!enAlguna) return false;
      }
      if (fTipo !== "todos" && r.tipo !== fTipo) return false;
      if (fEstado === "solo_activos" && !r.activo) return false;
      if (fEstado === "solo_inactivos" && r.activo) return false;
      if (fStock !== "todos" && r.es_inventariable) {
        if (fStock === "stock_bajo" && r.estado_stock !== "stock_bajo") return false;
        if (fStock === "sin_stock" && r.estado_stock !== "sin_stock") return false;
        if (fStock === "con_stock" && r.estado_stock !== "ok") return false;
      }
      const minN = min === "" ? null : Number(min);
      const maxN = max === "" ? null : Number(max);
      if (minN !== null && r.cantidad_total < minN) return false;
      if (maxN !== null && r.cantidad_total > maxN) return false;
      return true;
    });
  }, [rows, q, fCats, fUbis, fTipo, fEstado, fStock, min, max]);

  const stats = {
    total: rows.length,
    inv: rows.filter((r) => r.es_inventariable).length,
    alertas: rows.filter((r) => r.es_inventariable && r.activo && (r.estado_stock === "stock_bajo" || r.estado_stock === "sin_stock")).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.total} ítems · {stats.inv} con stock físico · {stats.alertas} con alerta de stock
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nuevo ítem</Button>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Buscar">
            <Input placeholder="Nombre o código..." value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
          <Field label="Categoría">
            <MultiSelect
              options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
              value={fCats}
              onChange={setFCats}
              placeholder="Todas"
            />
          </Field>
          <Field label="Ubicación (tiene stock)">
            <MultiSelect
              options={ubicaciones.map((u) => ({ value: u.id, label: u.nombre }))}
              value={fUbis}
              onChange={setFUbis}
              placeholder="Todas"
            />
          </Field>
          <Field label="Tipo">
            <Select value={fTipo} onChange={(e) => setFTipo(e.target.value as typeof fTipo)}>
              <option value="todos">Todos</option>
              <option value="producto">Productos</option>
              <option value="servicio">Servicios</option>
            </Select>
          </Field>
          <Field label="Estado de stock">
            <Select value={fStock} onChange={(e) => setFStock(e.target.value as typeof fStock)}>
              <option value="todos">Todos</option>
              <option value="con_stock">Con stock</option>
              <option value="stock_bajo">Stock bajo</option>
              <option value="sin_stock">Sin stock</option>
            </Select>
          </Field>
          <Field label="Activo / Inactivo">
            <Select value={fEstado} onChange={(e) => setFEstado(e.target.value as typeof fEstado)}>
              <option value="solo_activos">Solo activos</option>
              <option value="solo_inactivos">Solo inactivos</option>
              <option value="todos">Todos</option>
            </Select>
          </Field>
          <Field label="Cantidad mín.">
            <Input type="number" value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Cantidad máx.">
            <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} placeholder="∞" />
          </Field>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {rows.length} ítems
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Código</TH>
            <TH>Nombre</TH>
            <TH>Categoría</TH>
            <TH>Tipo</TH>
            <TH className="text-right">Stock</TH>
            <TH className="text-right">Precio detal</TH>
            <TH>IVA</TH>
            <TH className="text-center">Estado</TH>
            <TH className="text-right">Acciones</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.slice(0, 500).map((r) => (
            <TR key={r.id}>
              <TD className="font-mono text-xs text-muted-foreground">{r.codigo ?? "—"}</TD>
              <TD className="max-w-sm">
                <Link href={`/inventario/${r.id}`} className="font-medium text-white hover:text-brand-orange">{r.nombre}</Link>
              </TD>
              <TD className="text-muted-foreground">{r.categoria_nombre ?? "—"}</TD>
              <TD>
                {r.tipo === "servicio" ? <Badge tone="blue">Servicio</Badge> : r.es_inventariable ? <Badge tone="gray">Producto</Badge> : <Badge tone="gray">No inventariable</Badge>}
              </TD>
              <TD className="text-right font-mono">
                {r.es_inventariable ? formatInt(r.cantidad_total) : "—"}
              </TD>
              <TD className="text-right font-mono">{r.precio_detal != null ? formatCOP(r.precio_detal) : "—"}</TD>
              <TD>{r.impuesto_porcentaje != null ? `${r.impuesto_porcentaje}%` : "—"}</TD>
              <TD className="text-center">
                <span className="inline-flex items-center justify-center">
                  {!r.activo ? <Badge tone="gray">Inactivo</Badge>
                    : r.estado_stock === "sin_stock" ? <Badge tone="red">Sin stock</Badge>
                    : r.estado_stock === "stock_bajo" ? <Badge tone="yellow">Bajo</Badge>
                    : r.es_inventariable ? <Badge tone="green">OK</Badge>
                    : <Badge tone="gray">—</Badge>}
                </span>
              </TD>
              <TD className="text-right">
                <Link href={`/inventario/${r.id}`} className="text-sm text-brand-orange hover:opacity-80">
                  Ver
                </Link>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {filtered.length > 500 ? <p className="text-xs text-muted-foreground">Mostrando primeros 500. Ajusta los filtros para ver más.</p> : null}

      {creating ? (
        <ProductoDialog
          open
          onClose={() => setCreating(false)}
          categorias={categorias}
          impuestos={impuestos}
          listasPrecios={listasPrecios}
          isMaestro={isMaestro}
        />
      ) : null}
    </div>
  );
}
