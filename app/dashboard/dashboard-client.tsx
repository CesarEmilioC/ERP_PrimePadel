"use client";

import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { Card } from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { formatCOP, formatInt } from "@/lib/utils";

type HistoricoRow = {
  anio: number;
  mes: number;
  cantidad_vendida: number;
  total: number;
  productos: {
    nombre: string;
    codigo: string | null;
    tipo: "producto" | "servicio";
    es_inventariable: boolean;
    categorias: { nombre: string } | null;
  };
};

const COLORS = ["#FF8C42", "#F5C518", "#FFB366", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#eab308", "#06b6d4", "#f97316"];

const PAGE_MESES = 6;
const PAGE_TOP = 5;
const LEGEND_THRESHOLD = 3;

function mesLabel(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

// Tooltip oscuro con contraste controlado.
function DarkTooltip({
  active, payload, label, formatter,
}: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-black/95 px-3 py-2 text-sm shadow-xl">
      {label !== undefined && label !== null ? (
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      ) : null}
      {payload.map((p: any, i: number) => {
        const color = p.color ?? p.payload?.fill ?? p.fill ?? "#F5C518";
        const name = p.name ?? p.dataKey;
        const formatted = formatter ? formatter(p.value, name) : p.value;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
            <span className="text-white">
              {name}:{" "}
              <span className="font-semibold" style={{ color }}>{formatted}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Pager({
  page, total, pageSize, onChange,
}: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <button
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-white disabled:opacity-30"
      >
        ← Ant.
      </button>
      <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
      <button
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-white disabled:opacity-30"
      >
        Sig. →
      </button>
    </div>
  );
}

export function DashboardClient({
  stats,
  historico,
  categorias,
}: {
  stats: {
    nProductosActivos: number;
    nInventariables: number;
    nUbicaciones: number;
    totalStockActual: number;
    valorInventario: number;
    nAlertas: number;
  };
  historico: HistoricoRow[];
  categorias: { id: string; nombre: string }[];
}) {
  const [fCats, setFCats] = React.useState<string[]>([]);
  const [vistaTop, setVistaTop] = React.useState<"monto" | "cantidad">("monto");
  const [vistaCat, setVistaCat] = React.useState<"monto" | "cantidad">("monto");
  const [pageMeses, setPageMeses] = React.useState(0);
  const [pageTop, setPageTop] = React.useState(0);
  const [leyendaAbierta, setLeyendaAbierta] = React.useState<null | "categoria">(null);

  const catNameSet = new Set(
    fCats.map((id) => categorias.find((c) => c.id === id)?.nombre).filter(Boolean) as string[],
  );
  const filtered = historico.filter((h) =>
    catNameSet.size === 0 || (h.productos.categorias?.nombre && catNameSet.has(h.productos.categorias.nombre)),
  );

  // Consumo por mes — solo monto (la suma de cantidades mezcla productos heterogéneos).
  const porMesMap = new Map<string, { key: string; anio: number; mes: number; monto: number }>();
  for (const h of filtered) {
    const key = mesLabel(h.anio, h.mes);
    const row = porMesMap.get(key) ?? { key, anio: h.anio, mes: h.mes, monto: 0 };
    row.monto += h.total;
    porMesMap.set(key, row);
  }
  const serieMensualTotal = [...porMesMap.values()].sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes));
  const serieMensual = serieMensualTotal.slice(pageMeses * PAGE_MESES, (pageMeses + 1) * PAGE_MESES);

  // Top productos — per-item, cantidad y monto ambos tienen sentido.
  const topMap = new Map<string, { nombre: string; categoria: string; cantidad: number; monto: number }>();
  for (const h of filtered) {
    const key = h.productos.nombre;
    const row = topMap.get(key) ?? {
      nombre: h.productos.nombre,
      categoria: h.productos.categorias?.nombre ?? "Sin categoría",
      cantidad: 0,
      monto: 0,
    };
    row.cantidad += h.cantidad_vendida;
    row.monto += h.total;
    topMap.set(key, row);
  }
  const topTodos = [...topMap.values()].sort((a, b) =>
    vistaTop === "monto" ? b.monto - a.monto : b.cantidad - a.cantidad,
  );
  const topPage = topTodos.slice(pageTop * PAGE_TOP, (pageTop + 1) * PAGE_TOP);

  // Por categoría — agregada por categoría, por lo que tanto monto como cantidad son interpretables.
  const categoriaMap = new Map<string, { nombre: string; monto: number; cantidad: number }>();
  for (const h of filtered) {
    const c = h.productos.categorias?.nombre ?? "Sin categoría";
    const row = categoriaMap.get(c) ?? { nombre: c, monto: 0, cantidad: 0 };
    row.monto += h.total;
    row.cantidad += h.cantidad_vendida;
    categoriaMap.set(c, row);
  }
  const porCategoria = [...categoriaMap.values()].sort((a, b) =>
    vistaCat === "monto" ? b.monto - a.monto : b.cantidad - a.cantidad,
  );

  // Último mes vs anterior (solo monto).
  const ultimo = serieMensualTotal[serieMensualTotal.length - 1];
  const penultimo = serieMensualTotal[serieMensualTotal.length - 2];
  const deltaMonto = ultimo && penultimo ? ((ultimo.monto - penultimo.monto) / (penultimo.monto || 1)) * 100 : 0;

  // Empezar paginación de meses en la última página (meses más recientes).
  const totalPagesMeses = Math.ceil(serieMensualTotal.length / PAGE_MESES);
  React.useEffect(() => {
    setPageMeses(Math.max(0, totalPagesMeses - 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPagesMeses]);

  // Reset paginación de top al cambiar vista.
  React.useEffect(() => { setPageTop(0); }, [vistaTop]);

  const topValueFormatter = (v: number) => vistaTop === "monto" ? formatCOP(v) : formatInt(v);
  const catValueFormatter = (v: number) => vistaCat === "monto" ? formatCOP(v) : formatInt(v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          KPIs, consumo histórico y alertas. El histórico de ventas se basa en los reportes mensuales migrados de Alegra (SEP 2025 – ABR 2026).
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Productos activos</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.nProductosActivos}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats.nInventariables} inventariables</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Ubicaciones</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.nUbicaciones}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Stock total</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatInt(stats.totalStockActual)}</p>
          <p className="mt-1 text-xs text-muted-foreground">unidades físicas</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Valor inventario (costo)</p>
          <p className="mt-1 text-xl font-bold text-white">{formatCOP(stats.valorInventario)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Alertas de stock</p>
          <p className="mt-1 text-2xl font-bold text-brand-orange">{stats.nAlertas}</p>
          <p className="mt-1 text-xs text-muted-foreground">productos bajo mínimo</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Variación mes anterior</p>
          <p className={`mt-1 text-2xl font-bold ${deltaMonto >= 0 ? "text-green-400" : "text-red-400"}`}>
            {deltaMonto >= 0 ? "+" : ""}{deltaMonto.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">en monto</p>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Filtrar por categoría</p>
          <MultiSelect
            options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
            value={fCats}
            onChange={setFCats}
            placeholder="Todas las categorías"
          />
        </div>
      </Card>

      {/* Consumo por mes — solo monto */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Consumo por mes (monto)</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={serieMensual}>
              <CartesianGrid stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="key" stroke="#A3A3A3" tick={{ fontSize: 12 }} />
              <YAxis
                stroke="#A3A3A3"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
              />
              <Tooltip content={<DarkTooltip formatter={(v: number) => formatCOP(v)} />} cursor={{ fill: "#ffffff10" }} />
              <Bar dataKey="monto" name="Monto" fill="#FF8C42" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Pager page={pageMeses} total={serieMensualTotal.length} pageSize={PAGE_MESES} onChange={setPageMeses} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top productos — per item, toggle válido */}
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">
              Top productos
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({topTodos.length === 0 ? "0" : `${pageTop * PAGE_TOP + 1}–${Math.min((pageTop + 1) * PAGE_TOP, topTodos.length)}`} de {topTodos.length})
              </span>
            </h2>
            <Select value={vistaTop} onChange={(e) => setVistaTop(e.target.value as "monto" | "cantidad")} className="max-w-[140px]">
              <option value="monto">Por monto</option>
              <option value="cantidad">Por cantidad</option>
            </Select>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topPage} layout="vertical" margin={{ left: 130 }}>
                <CartesianGrid stroke="#1f1f1f" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#A3A3A3"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => vistaTop === "monto" ? `${(v / 1_000_000).toFixed(1)}M` : formatInt(v)}
                />
                <YAxis type="category" dataKey="nombre" stroke="#A3A3A3" tick={{ fontSize: 11 }} width={120} />
                <Tooltip content={<DarkTooltip formatter={topValueFormatter} />} cursor={{ fill: "#ffffff10" }} />
                <Bar
                  dataKey={vistaTop === "monto" ? "monto" : "cantidad"}
                  name={vistaTop === "monto" ? "Monto" : "Cantidad"}
                  fill="#F5C518"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Pager page={pageTop} total={topTodos.length} pageSize={PAGE_TOP} onChange={setPageTop} />
        </Card>

        {/* Por categoría — per categoría, toggle válido */}
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Consumo por categoría</h2>
            <div className="flex items-center gap-2">
              <Select value={vistaCat} onChange={(e) => setVistaCat(e.target.value as "monto" | "cantidad")} className="max-w-[140px]">
                <option value="monto">Por monto</option>
                <option value="cantidad">Por cantidad</option>
              </Select>
              {porCategoria.length > LEGEND_THRESHOLD && (
                <button
                  onClick={() => setLeyendaAbierta("categoria")}
                  className="rounded border border-border px-2 py-1.5 text-xs text-muted-foreground hover:border-brand-orange hover:text-brand-orange"
                >
                  Ver leyenda ({porCategoria.length})
                </button>
              )}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={porCategoria}
                  dataKey={vistaCat === "monto" ? "monto" : "cantidad"}
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={false}
                >
                  {porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<DarkTooltip formatter={catValueFormatter} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Alertas */}
      {stats.nAlertas > 0 ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Alertas de stock bajo</h2>
          <p className="text-sm text-muted-foreground">
            Hay {stats.nAlertas} producto(s) con stock en cero o por debajo del mínimo. Revisa el módulo de Inventario y filtra por "Stock bajo" / "Sin stock".
          </p>
        </Card>
      ) : null}

      <p className="pt-4 text-center text-xs text-muted-foreground">
        Histórico proveniente del reporte mensual de Alegra.
        El detalle diario y semanal se habilita a partir de las transacciones registradas en este sistema.
      </p>

      {/* Leyenda en lightbox */}
      <Dialog
        open={leyendaAbierta === "categoria"}
        onClose={() => setLeyendaAbierta(null)}
        title={`Categorías (${porCategoria.length})`}
        size="md"
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {porCategoria.map((c, i) => (
            <div key={c.nombre} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
              <span className="inline-block h-3 w-3 flex-shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="flex-1 text-sm text-white">{c.nombre}</span>
              <span className="text-xs text-muted-foreground">{catValueFormatter(vistaCat === "monto" ? c.monto : c.cantidad)}</span>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
