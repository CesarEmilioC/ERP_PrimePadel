"use client";

import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

type StockPorUbicacion = { ubicacion_id: string; nombre: string; tipo: string; cantidad: number; valor: number };
type StockTotalPorProducto = { producto_id: string; nombre: string; cantidad_total: number };
type SkusPorCategoria = { nombre: string; count: number };
type AlertaDetallada = {
  producto_id: string;
  codigo: string | null;
  nombre: string;
  categoria: string | null;
  cantidad_total: number;
  stock_minimo_alerta: number;
  estado_stock: "stock_bajo" | "sin_stock";
  ubicaciones: { nombre: string; cantidad: number }[];
};
type TopPorDia = { nombre: string; porDia: number[] };
type VentasPorDia = { monto: number; count: number };

const COLORS = ["#FF8C42", "#F5C518", "#FFB366", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#eab308", "#06b6d4", "#f97316"];

// Paleta específica para gráficas apiladas (5 productos): tonos contrastantes y diferenciados.
const STACK_COLORS = ["#FF6B35", "#F7B801", "#06D6A0", "#118AB2", "#A663CC"];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const PAGE_MESES = 6;
const PAGE_TOP = 10;
const LEGEND_THRESHOLD = 3;

function mesLabel(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

function DarkTooltip({ active, payload, label, formatter }: any) {
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
            <span className="text-white">{name}: <span className="font-semibold" style={{ color }}>{formatted}</span></span>
          </div>
        );
      })}
    </div>
  );
}

function UbicacionesChips({ ubicaciones }: { ubicaciones: { nombre: string; cantidad: number }[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const LIMIT = 3;
  const muestra = expanded ? ubicaciones : ubicaciones.slice(0, LIMIT);
  const restantes = ubicaciones.length - LIMIT;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {muestra.map((u) => (
        <span
          key={u.nombre}
          className={`rounded px-1.5 py-0.5 text-xs ${
            u.cantidad === 0
              ? "border border-red-900/40 bg-red-950/20 text-red-300"
              : u.cantidad <= 2
              ? "border border-yellow-900/40 bg-yellow-950/20 text-yellow-300"
              : "border border-border bg-muted/30 text-muted-foreground"
          }`}
        >
          {u.nombre}: {u.cantidad}
        </span>
      ))}
      {restantes > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded border border-border bg-muted/20 px-1.5 py-0.5 text-xs text-muted-foreground hover:border-brand-orange hover:text-brand-orange"
        >
          {expanded ? "Ver menos" : `+${restantes} más`}
        </button>
      ) : null}
    </div>
  );
}

function Pager({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <button disabled={page === 0} onClick={() => onChange(page - 1)} className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-white disabled:opacity-30">← Ant.</button>
      <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
      <button disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-white disabled:opacity-30">Sig. →</button>
    </div>
  );
}

type Tab = "inventario" | "ventas" | "alertas";

export function DashboardClient({
  stats, historico, categorias, stockPorUbicacion, skusPorCategoria, alertasDetalladas, topPorDiaSemana, ventasPorDiaSemana, stockTotalPorProducto,
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
  stockPorUbicacion: StockPorUbicacion[];
  skusPorCategoria: SkusPorCategoria[];
  alertasDetalladas: AlertaDetallada[];
  topPorDiaSemana: TopPorDia[];
  ventasPorDiaSemana: VentasPorDia[];
  stockTotalPorProducto: StockTotalPorProducto[];
}) {
  const [tab, setTab] = React.useState<Tab>("ventas");
  const [fCats, setFCats] = React.useState<string[]>([]);
  const [fMesDesde, setFMesDesde] = React.useState<string>("");
  const [fMesHasta, setFMesHasta] = React.useState<string>("");
  const [vistaTop, setVistaTop] = React.useState<"monto" | "cantidad">("monto");
  const [vistaCat, setVistaCat] = React.useState<"monto" | "cantidad">("monto");
  const [pageMeses, setPageMeses] = React.useState(0);
  const [pageTop, setPageTop] = React.useState(0);
  const [pageSkus, setPageSkus] = React.useState(0);
  const [pageTodos, setPageTodos] = React.useState(0);
  const [leyendaAbierta, setLeyendaAbierta] = React.useState<null | "categoria">(null);

  // Meses disponibles en el histórico (para selectors).
  const mesesDisponibles = React.useMemo(() => {
    const set = new Set<string>();
    for (const h of historico) set.add(`${h.anio}-${String(h.mes).padStart(2, "0")}`);
    return [...set].sort();
  }, [historico]);

  function inRangoFecha(anio: number, mes: number) {
    const key = `${anio}-${String(mes).padStart(2, "0")}`;
    if (fMesDesde && key < fMesDesde) return false;
    if (fMesHasta && key > fMesHasta) return false;
    return true;
  }

  const catNameSet = new Set(fCats.map((id) => categorias.find((c) => c.id === id)?.nombre).filter(Boolean) as string[]);
  const filtered = historico.filter((h) => {
    if (catNameSet.size > 0 && !(h.productos.categorias?.nombre && catNameSet.has(h.productos.categorias.nombre))) return false;
    if (!inRangoFecha(h.anio, h.mes)) return false;
    return true;
  });

  // ---- Datos derivados ----
  const porMesMap = new Map<string, { key: string; anio: number; mes: number; monto: number }>();
  for (const h of filtered) {
    const key = mesLabel(h.anio, h.mes);
    const row = porMesMap.get(key) ?? { key, anio: h.anio, mes: h.mes, monto: 0 };
    row.monto += h.total;
    porMesMap.set(key, row);
  }
  const serieMensualTotal = [...porMesMap.values()].sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes));
  const serieMensual = serieMensualTotal.slice(pageMeses * PAGE_MESES, (pageMeses + 1) * PAGE_MESES);

  const topMap = new Map<string, { nombre: string; categoria: string; cantidad: number; monto: number }>();
  for (const h of filtered) {
    const key = h.productos.nombre;
    const row = topMap.get(key) ?? { nombre: h.productos.nombre, categoria: h.productos.categorias?.nombre ?? "Sin categoría", cantidad: 0, monto: 0 };
    row.cantidad += h.cantidad_vendida;
    row.monto += h.total;
    topMap.set(key, row);
  }
  const topTodos = [...topMap.values()].sort((a, b) => vistaTop === "monto" ? b.monto - a.monto : b.cantidad - a.cantidad);
  const topPage = topTodos.slice(pageTop * PAGE_TOP, (pageTop + 1) * PAGE_TOP);

  const categoriaMap = new Map<string, { nombre: string; monto: number; cantidad: number }>();
  for (const h of filtered) {
    const c = h.productos.categorias?.nombre ?? "Sin categoría";
    const row = categoriaMap.get(c) ?? { nombre: c, monto: 0, cantidad: 0 };
    row.monto += h.total;
    row.cantidad += h.cantidad_vendida;
    categoriaMap.set(c, row);
  }
  const porCategoria = [...categoriaMap.values()].sort((a, b) => vistaCat === "monto" ? b.monto - a.monto : b.cantidad - a.cantidad);

  const ultimo = serieMensualTotal[serieMensualTotal.length - 1];
  const penultimo = serieMensualTotal[serieMensualTotal.length - 2];
  const deltaMonto = ultimo && penultimo ? ((ultimo.monto - penultimo.monto) / (penultimo.monto || 1)) * 100 : 0;

  // SKUs por categoría — ordenado y paginado
  const skusOrdenados = [...skusPorCategoria].sort((a, b) => b.count - a.count);
  const skusPage = skusOrdenados.slice(pageSkus * PAGE_TOP, (pageSkus + 1) * PAGE_TOP);

  // Top 5 productos por día de semana — derivado de top y mapeado
  const top5DiaSemana = topPorDiaSemana
    .map((p) => ({ nombre: p.nombre, total: p.porDia.reduce((a, b) => a + b, 0), porDia: p.porDia }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Datos para BarChart apilado (cada día = 1 fila, cada producto = 1 dataKey)
  const diaSemanaStackedChart = DIAS_CORTOS.map((d, i) => {
    const row: Record<string, number | string> = { dia: d };
    for (const p of top5DiaSemana) row[p.nombre] = p.porDia[i];
    return row;
  });

  const ventasDiaSemanaChart = DIAS_CORTOS.map((d, i) => ({
    dia: d,
    monto: ventasPorDiaSemana[i]?.monto ?? 0,
    transacciones: ventasPorDiaSemana[i]?.count ?? 0,
  }));

  // Estimación de días de stock restantes por producto.
  // Cruza ventas históricas (filtradas) con el stock actual.
  const diasDeStockEstimado = React.useMemo(() => {
    const ventasPorProd = new Map<string, { nombre: string; cantTotal: number }>();
    const mesesSet = new Set<string>();
    for (const h of filtered) {
      mesesSet.add(`${h.anio}-${h.mes}`);
      const cur = ventasPorProd.get(h.productos.nombre) ?? { nombre: h.productos.nombre, cantTotal: 0 };
      cur.cantTotal += h.cantidad_vendida;
      ventasPorProd.set(h.productos.nombre, cur);
    }
    const diasEnHistorico = Math.max(1, mesesSet.size * 30);
    const stockPorNombre = new Map(stockTotalPorProducto.map((s) => [s.nombre, s.cantidad_total]));
    const out: { nombre: string; stockActual: number; ventaPorDia: number; diasRestantes: number }[] = [];
    for (const [nombre, v] of ventasPorProd) {
      const ventaPorDia = v.cantTotal / diasEnHistorico;
      if (ventaPorDia <= 0) continue;
      const stockActual = stockPorNombre.get(nombre) ?? 0;
      if (stockActual <= 0) continue; // sin stock, ya en alertas
      const diasRestantes = stockActual / ventaPorDia;
      out.push({ nombre, stockActual, ventaPorDia, diasRestantes });
    }
    return out.sort((a, b) => a.diasRestantes - b.diasRestantes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, stockTotalPorProducto]);

  React.useEffect(() => {
    const totalPagesMeses = Math.ceil(serieMensualTotal.length / PAGE_MESES);
    setPageMeses(Math.max(0, totalPagesMeses - 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serieMensualTotal.length]);

  React.useEffect(() => { setPageTop(0); }, [vistaTop]);

  const topValueFormatter = (v: number) => vistaTop === "monto" ? formatCOP(v) : formatInt(v);
  const catValueFormatter = (v: number) => vistaCat === "monto" ? formatCOP(v) : formatInt(v);

  const hayTransaccionesReales = topPorDiaSemana.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          KPIs, consumo histórico y alertas. El histórico de ventas (SEP 2025 – ABR 2026) viene de los reportes mensuales de Alegra; el detalle diario aparece a partir de las transacciones registradas en este sistema.
        </p>
      </div>

      {/* KPIs siempre visibles */}
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { id: "ventas", label: "Ventas y consumo" },
          { id: "inventario", label: "Inventario" },
          { id: "alertas", label: `Alertas${stats.nAlertas > 0 ? ` (${stats.nAlertas})` : ""}` },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
              tab === t.id
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtro común para ventas */}
      {tab === "ventas" ? (
        <Card>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Categoría</p>
              <MultiSelect
                options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
                value={fCats}
                onChange={setFCats}
                placeholder="Todas"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Mes desde</p>
              <Select value={fMesDesde} onChange={(e) => setFMesDesde(e.target.value)}>
                <option value="">Sin límite inferior</option>
                {mesesDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Mes hasta</p>
              <Select value={fMesHasta} onChange={(e) => setFMesHasta(e.target.value)}>
                <option value="">Sin límite superior</option>
                {mesesDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFCats([]); setFMesDesde(""); setFMesHasta(""); }}
                className="h-10 w-full rounded-md border border-border px-3 text-sm text-muted-foreground hover:border-brand-orange hover:text-brand-orange"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* ============================ TAB VENTAS ============================ */}
      {tab === "ventas" ? (
        <>
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-white">Consumo por mes (monto)</h2>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={serieMensual}>
                  <CartesianGrid stroke="#1f1f1f" vertical={false} />
                  <XAxis dataKey="key" stroke="#A3A3A3" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#A3A3A3" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip content={<DarkTooltip formatter={(v: number) => formatCOP(v)} />} cursor={{ fill: "#ffffff10" }} />
                  <Bar dataKey="monto" name="Monto" fill="#FF8C42" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Pager page={pageMeses} total={serieMensualTotal.length} pageSize={PAGE_MESES} onChange={setPageMeses} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
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
                    <XAxis type="number" stroke="#A3A3A3" tick={{ fontSize: 12 }} tickFormatter={(v) => vistaTop === "monto" ? `${(v / 1_000_000).toFixed(1)}M` : formatInt(v)} />
                    <YAxis type="category" dataKey="nombre" stroke="#A3A3A3" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip content={<DarkTooltip formatter={topValueFormatter} />} cursor={{ fill: "#ffffff10" }} />
                    <Bar dataKey={vistaTop === "monto" ? "monto" : "cantidad"} name={vistaTop === "monto" ? "Monto" : "Cantidad"} fill="#F5C518" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Pager page={pageTop} total={topTodos.length} pageSize={PAGE_TOP} onChange={setPageTop} />
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">Consumo por categoría</h2>
                <div className="flex items-center gap-2">
                  <Select value={vistaCat} onChange={(e) => setVistaCat(e.target.value as "monto" | "cantidad")} className="max-w-[140px]">
                    <option value="monto">Por monto</option>
                    <option value="cantidad">Por cantidad</option>
                  </Select>
                  {porCategoria.length > LEGEND_THRESHOLD && (
                    <button onClick={() => setLeyendaAbierta("categoria")} className="rounded border border-border px-2 py-1.5 text-xs text-muted-foreground hover:border-brand-orange hover:text-brand-orange">
                      Ver leyenda ({porCategoria.length})
                    </button>
                  )}
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={porCategoria} dataKey={vistaCat === "monto" ? "monto" : "cantidad"} nameKey="nombre" cx="50%" cy="50%" outerRadius={110} label={false}>
                      {porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<DarkTooltip formatter={catValueFormatter} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Análisis por día de la semana */}
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-white">Ventas por día de la semana</h2>
            {hayTransaccionesReales ? (
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={ventasDiaSemanaChart}>
                    <CartesianGrid stroke="#1f1f1f" vertical={false} />
                    <XAxis dataKey="dia" stroke="#A3A3A3" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#A3A3A3" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                    <Tooltip content={<DarkTooltip formatter={(v: number, name: string) => name === "Transacciones" ? formatInt(v) : formatCOP(v)} />} cursor={{ fill: "#ffffff10" }} />
                    <Bar dataKey="monto" name="Monto" fill="#FFB366" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Aún no hay transacciones registradas en el sistema. Esta gráfica se llena automáticamente a medida que recepción registre ventas.
              </div>
            )}
          </Card>

          {hayTransaccionesReales && top5DiaSemana.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-white">Top 5 productos por día de la semana (apilado)</h2>
              <p className="mb-2 text-xs text-muted-foreground">
                Cada barra representa el total de unidades vendidas en ese día, dividido por los 5 productos más vendidos.
              </p>
              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart data={diaSemanaStackedChart}>
                    <CartesianGrid stroke="#1f1f1f" vertical={false} />
                    <XAxis dataKey="dia" stroke="#A3A3A3" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#A3A3A3" tick={{ fontSize: 12 }} tickFormatter={(v) => formatInt(v)} />
                    <Tooltip content={<DarkTooltip formatter={(v: number) => formatInt(v) + " uds"} />} cursor={{ fill: "#ffffff10" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {top5DiaSemana.map((p, i) => (
                      <Bar key={p.nombre} dataKey={p.nombre} name={p.nombre} stackId="a" fill={STACK_COLORS[i % STACK_COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ) : null}

          {/* Tabla paginada de TODAS las cantidades vendidas */}
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-white">
              Cantidades vendidas por producto
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({topTodos.length === 0 ? "0" : `${pageTodos * PAGE_TOP + 1}–${Math.min((pageTodos + 1) * PAGE_TOP, topTodos.length)}`} de {topTodos.length})
              </span>
            </h2>
            <Table>
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>Producto</TH>
                  <TH>Categoría</TH>
                  <TH className="text-right">Cantidad</TH>
                  <TH className="text-right">Monto</TH>
                </TR>
              </THead>
              <TBody>
                {topTodos.slice(pageTodos * PAGE_TOP, (pageTodos + 1) * PAGE_TOP).map((r, i) => (
                  <TR key={r.nombre}>
                    <TD className="text-muted-foreground">{pageTodos * PAGE_TOP + i + 1}</TD>
                    <TD className="text-white">{r.nombre}</TD>
                    <TD className="text-xs text-muted-foreground">{r.categoria}</TD>
                    <TD className="text-right font-mono">{formatInt(r.cantidad)}</TD>
                    <TD className="text-right font-mono">{formatCOP(r.monto)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pager page={pageTodos} total={topTodos.length} pageSize={PAGE_TOP} onChange={setPageTodos} />
          </Card>

          {/* Análisis predictivo: días estimados de stock */}
          {diasDeStockEstimado.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-white">Días estimados de stock</h2>
              <p className="mb-2 text-xs text-muted-foreground">
                Calculado dividiendo el stock actual entre la velocidad promedio de venta diaria de los últimos meses. Útil para anticipar compras.
              </p>
              <Table>
                <THead>
                  <TR>
                    <TH>Producto</TH>
                    <TH className="text-right">Stock actual</TH>
                    <TH className="text-right">Promedio venta/día</TH>
                    <TH className="text-right">Días restantes</TH>
                    <TH>Acción sugerida</TH>
                  </TR>
                </THead>
                <TBody>
                  {diasDeStockEstimado.slice(0, 15).map((p) => (
                    <TR key={p.nombre}>
                      <TD className="text-white">{p.nombre}</TD>
                      <TD className="text-right font-mono">{formatInt(p.stockActual)}</TD>
                      <TD className="text-right font-mono text-muted-foreground">{p.ventaPorDia.toFixed(1)}</TD>
                      <TD className="text-right font-mono">
                        {p.diasRestantes < 7
                          ? <span className="text-red-300">{p.diasRestantes.toFixed(0)}d</span>
                          : p.diasRestantes < 14
                          ? <span className="text-yellow-300">{p.diasRestantes.toFixed(0)}d</span>
                          : <span className="text-green-300">{p.diasRestantes.toFixed(0)}d</span>}
                      </TD>
                      <TD className="text-xs">
                        {p.diasRestantes < 7
                          ? <span className="text-red-300">⚠ Comprar ya</span>
                          : p.diasRestantes < 14
                          ? <span className="text-yellow-300">Programar compra</span>
                          : <span className="text-muted-foreground">OK</span>}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
          ) : null}
        </>
      ) : null}

      {/* ============================ TAB INVENTARIO ============================ */}
      {tab === "inventario" ? (
        <>
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-white">Stock por ubicación</h2>
            {stockPorUbicacion.length === 0 || stockPorUbicacion.every((u) => u.cantidad === 0) ? (
              <div className="rounded border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Aún no hay stock registrado. Cuando se cargue el inventario inicial físico aparecerá aquí el desglose por ubicación.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={stockPorUbicacion} layout="vertical" margin={{ left: 130 }}>
                    <CartesianGrid stroke="#1f1f1f" horizontal={false} />
                    <XAxis type="number" stroke="#A3A3A3" tick={{ fontSize: 12 }} tickFormatter={(v) => formatInt(v)} />
                    <YAxis type="category" dataKey="nombre" stroke="#A3A3A3" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip content={<DarkTooltip formatter={(v: number) => formatInt(v) + " uds"} />} cursor={{ fill: "#ffffff10" }} />
                    <Bar dataKey="cantidad" name="Unidades" fill="#22c55e" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {stockPorUbicacion.length > 0 ? (
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {stockPorUbicacion.map((u) => (
                  <div key={u.ubicacion_id} className="rounded border border-border bg-muted/20 px-3 py-2">
                    <p className="text-xs uppercase text-muted-foreground">{u.nombre}</p>
                    <p className="mt-1 font-mono text-lg text-white">{formatInt(u.cantidad)} <span className="text-xs text-muted-foreground">uds</span></p>
                    <p className="text-xs text-muted-foreground">
                      {u.valor > 0
                        ? `${formatCOP(u.valor)} en costo`
                        : u.cantidad > 0
                        ? <span title="Falta cargar el costo unitario de los productos en esta ubicación">costo no configurado</span>
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-white">
              Productos por categoría
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({skusOrdenados.length === 0 ? "0" : `${pageSkus * PAGE_TOP + 1}–${Math.min((pageSkus + 1) * PAGE_TOP, skusOrdenados.length)}`} de {skusOrdenados.length})
              </span>
            </h2>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={skusPage} layout="vertical" margin={{ left: 150 }}>
                  <CartesianGrid stroke="#1f1f1f" horizontal={false} />
                  <XAxis type="number" stroke="#A3A3A3" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="nombre" stroke="#A3A3A3" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip content={<DarkTooltip formatter={(v: number) => `${formatInt(v)} productos`} />} cursor={{ fill: "#ffffff10" }} />
                  <Bar dataKey="count" name="Productos" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Pager page={pageSkus} total={skusOrdenados.length} pageSize={PAGE_TOP} onChange={setPageSkus} />
          </Card>
        </>
      ) : null}

      {/* ============================ TAB ALERTAS ============================ */}
      {tab === "alertas" ? (
        <Card>
          {alertasDetalladas.length === 0 ? (
            <EmptyState
              title="✓ Sin alertas de stock"
              description="Todos los productos están por encima del stock mínimo configurado."
            />
          ) : (
            <>
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-white">Productos con stock bajo o agotado</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {alertasDetalladas.length} productos. Haz clic en cualquiera para ir a su ficha y registrar una compra o ajuste.
                </p>
              </div>
              <Table>
                <THead>
                  <TR>
                    <TH>Producto</TH>
                    <TH>Categoría</TH>
                    <TH>Estado</TH>
                    <TH className="text-right">Stock total</TH>
                    <TH className="text-right">Mínimo</TH>
                    <TH>Ubicaciones</TH>
                  </TR>
                </THead>
                <TBody>
                  {alertasDetalladas.map((a) => (
                    <TR key={a.producto_id}>
                      <TD>
                        <a href={`/inventario/${a.producto_id}`} className="text-white hover:text-brand-orange">
                          {a.codigo ? <span className="mr-2 font-mono text-xs text-muted-foreground">{a.codigo}</span> : null}
                          {a.nombre}
                        </a>
                      </TD>
                      <TD className="text-xs text-muted-foreground">{a.categoria ?? "—"}</TD>
                      <TD>
                        {a.estado_stock === "sin_stock"
                          ? <Badge tone="red">Sin stock</Badge>
                          : <Badge tone="yellow">Bajo</Badge>}
                      </TD>
                      <TD className="text-right font-mono">{formatInt(a.cantidad_total)}</TD>
                      <TD className="text-right font-mono text-muted-foreground">{formatInt(a.stock_minimo_alerta)}</TD>
                      <TD>
                        {a.ubicaciones.length === 0 ? (
                          <span className="text-xs text-muted-foreground">sin asignación</span>
                        ) : (
                          <UbicacionesChips ubicaciones={a.ubicaciones} />
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </>
          )}
        </Card>
      ) : null}

      {/* Lightbox de leyenda de categorías */}
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
