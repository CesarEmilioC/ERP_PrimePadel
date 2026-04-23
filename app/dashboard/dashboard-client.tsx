"use client";

import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card } from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/input";
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
      <span className="text-xs text-muted-foreground">
        {page + 1} / {totalPages}
      </span>
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
  const [vista, setVista] = React.useState<"monto" | "cantidad">("monto");
  const [pageMeses, setPageMeses] = React.useState(0);
  const [pageTop, setPageTop] = React.useState(0);
  const [showLeyendaCat, setShowLeyendaCat] = React.useState(false);

  const catNameSet = new Set(fCats.map((id) => categorias.find((c) => c.id === id)?.nombre).filter(Boolean) as string[]);
  const filtered = historico.filter((h) =>
    catNameSet.size === 0 || (h.productos.categorias?.nombre && catNameSet.has(h.productos.categorias.nombre)),
  );

  // Serie: ventas por mes
  const porMesMap = new Map<string, { key: string; anio: number; mes: number; monto: number; cantidad: number }>();
  for (const h of filtered) {
    const key = mesLabel(h.anio, h.mes);
    const row = porMesMap.get(key) ?? { key, anio: h.anio, mes: h.mes, monto: 0, cantidad: 0 };
    row.monto += h.total;
    row.cantidad += h.cantidad_vendida;
    porMesMap.set(key, row);
  }
  const serieMensualTotal = [...porMesMap.values()].sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes));
  const serieMensual = serieMensualTotal.slice(pageMeses * PAGE_MESES, (pageMeses + 1) * PAGE_MESES);

  // Top productos
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
  const topTodos = [...topMap.values()].sort((a, b) => b.cantidad - a.cantidad);
  const topPage = topTodos.slice(pageTop * PAGE_TOP, (pageTop + 1) * PAGE_TOP);

  // Por categoría
  const categoriaMap = new Map<string, number>();
  for (const h of filtered) {
    const c = h.productos.categorias?.nombre ?? "Sin categoría";
    categoriaMap.set(c, (categoriaMap.get(c) ?? 0) + h.cantidad_vendida);
  }
  const porCategoria = [...categoriaMap.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);

  // Último mes vs anterior
  const ultimo = serieMensualTotal[serieMensualTotal.length - 1];
  const penultimo = serieMensualTotal[serieMensualTotal.length - 2];
  const deltaMonto = ultimo && penultimo ? ((ultimo.monto - penultimo.monto) / (penultimo.monto || 1)) * 100 : 0;

  // Mostrar la última página de meses por defecto
  const totalPagesMeses = Math.ceil(serieMensualTotal.length / PAGE_MESES);
  React.useEffect(() => {
    setPageMeses(Math.max(0, totalPagesMeses - 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPagesMeses]);

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
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Filtrar por categoría</p>
            <MultiSelect
              options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
              value={fCats}
              onChange={setFCats}
              placeholder="Todas las categorías"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Métrica de gráficas</p>
            <Select value={vista} onChange={(e) => setVista(e.target.value as "monto" | "cantidad")}>
              <option value="monto">Monto ($ COP)</option>
              <option value="cantidad">Cantidad (unidades)</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Consumo por mes — paginado */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-white">
          Consumo por mes {vista === "monto" ? "(monto)" : "(cantidades)"}
        </h2>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={serieMensual}>
              <CartesianGrid stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="key" stroke="#A3A3A3" tick={{ fontSize: 12 }} />
              <YAxis
                stroke="#A3A3A3"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => vista === "monto" ? `${(v / 1_000_000).toFixed(1)}M` : formatInt(v)}
              />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8 }}
                formatter={(v: number) => vista === "monto" ? formatCOP(v) : formatInt(v)}
              />
              <Bar dataKey={vista === "monto" ? "monto" : "cantidad"} fill="#FF8C42" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Pager
          page={pageMeses}
          total={serieMensualTotal.length}
          pageSize={PAGE_MESES}
          onChange={setPageMeses}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top productos — paginado */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">
            Top productos más vendidos
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({pageTop * PAGE_TOP + 1}–{Math.min((pageTop + 1) * PAGE_TOP, topTodos.length)} de {topTodos.length})
            </span>
          </h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topPage} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid stroke="#1f1f1f" horizontal={false} />
                <XAxis type="number" stroke="#A3A3A3" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="nombre" stroke="#A3A3A3" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8 }}
                  formatter={(v: number, name) => name === "cantidad" ? formatInt(v) : formatCOP(v)}
                />
                <Bar dataKey={vista === "monto" ? "monto" : "cantidad"} fill="#F5C518" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Pager
            page={pageTop}
            total={topTodos.length}
            pageSize={PAGE_TOP}
            onChange={setPageTop}
          />
        </Card>

        {/* Por categoría — leyenda colapsable */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Consumo por categoría</h2>
            {porCategoria.length > LEGEND_THRESHOLD && (
              <button
                onClick={() => setShowLeyendaCat((v) => !v)}
                className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:border-brand-orange hover:text-brand-orange"
              >
                {showLeyendaCat ? "Ocultar leyenda" : `Ver leyenda (${porCategoria.length})`}
              </button>
            )}
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={porCategoria}
                  dataKey="cantidad"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={false}
                >
                  {porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8 }}
                  formatter={(v: number) => formatInt(v)}
                />
                {(porCategoria.length <= LEGEND_THRESHOLD || showLeyendaCat) && (
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
          {showLeyendaCat && (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {porCategoria.map((c, i) => (
                <div key={c.nombre} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  {c.nombre}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Tendencia en línea */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-white">Tendencia mensual (cantidad vs monto)</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={serieMensualTotal}>
              <CartesianGrid stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="key" stroke="#A3A3A3" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" stroke="#FFB366" tick={{ fontSize: 11 }} tickFormatter={(v) => formatInt(v)} />
              <YAxis yAxisId="right" orientation="right" stroke="#F5C518" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8 }}
                formatter={(v: number, name) => name === "Cantidad" ? formatInt(v) : formatCOP(v)}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="cantidad" stroke="#FFB366" strokeWidth={2} dot={{ r: 3 }} name="Cantidad" />
              <Line yAxisId="right" type="monotone" dataKey="monto" stroke="#F5C518" strokeWidth={2} dot={{ r: 3 }} name="Monto" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

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
    </div>
  );
}
