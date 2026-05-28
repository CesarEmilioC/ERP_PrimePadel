"use client";

import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { Input, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
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
type VentaDia = { fechaISO: string; diaCorto: string; fechaCorta: string; monto: number; transacciones: number };
type UtilidadProducto = {
  producto_id: string;
  codigo: string | null;
  nombre: string;
  tipo: "producto" | "servicio";
  cantidad_vendida: number;
  ingresos: number;
  costos: number;
  utilidad: number;
  margen_pct: number;
};

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
  return <Pagination page={page} totalPages={totalPages} onChange={onChange} className="mt-3" />;
}

type Tab = "inventario" | "ventas" | "alertas";

export function DashboardClient({
  stats, historico, categorias, stockPorUbicacion, skusPorCategoria, alertasDetalladas, topPorDiaSemana, ventasPorDiaSemana, ventasUltimaSemana, utilidadPorProducto, stockTotalPorProducto,
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
  ventasUltimaSemana: VentaDia[];
  utilidadPorProducto: UtilidadProducto[];
  stockTotalPorProducto: StockTotalPorProducto[];
}) {
  const [tab, setTab] = React.useState<Tab>("ventas");
  const [fCats, setFCats] = React.useState<string[]>([]);
  const [fProds, setFProds] = React.useState<string[]>([]); // filtro por nombre de producto (Ventas)
  // Filtros del tab Inventario/Alertas (independientes).
  const [fCatsInv, setFCatsInv] = React.useState<string[]>([]);
  const [fProdInv, setFProdInv] = React.useState<string>("");
  // Filtros de fecha: el usuario puede elegir UN mes (shortcut) o un rango por
  // fechas. Si elige mes, las fechas se ignoran. Si elige fechas, el mes queda
  // en blanco. Esto evita reglas de prioridad confusas.
  const [fMes, setFMes] = React.useState<string>("");          // YYYY-MM
  const [fFechaDesde, setFFechaDesde] = React.useState<string>(""); // YYYY-MM-DD
  const [fFechaHasta, setFFechaHasta] = React.useState<string>(""); // YYYY-MM-DD
  const [vistaTop, setVistaTop] = React.useState<"monto" | "cantidad">("monto");
  const [vistaCat, setVistaCat] = React.useState<"monto" | "cantidad">("monto");
  const [pageMeses, setPageMeses] = React.useState(0);
  const [pageTop, setPageTop] = React.useState(0);
  const [pageSkus, setPageSkus] = React.useState(0);
  const [pageTodos, setPageTodos] = React.useState(0);
  const [pageAlertas, setPageAlertas] = React.useState(0);
  const [leyendaAbierta, setLeyendaAbierta] = React.useState<null | "categoria">(null);
  const [pageUtil, setPageUtil] = React.useState(0);
  const [filtroUtil, setFiltroUtil] = React.useState<"todos" | "producto" | "servicio">("todos");

  // Meses disponibles en el histórico (para selectors).
  const mesesDisponibles = React.useMemo(() => {
    const set = new Set<string>();
    for (const h of historico) set.add(`${h.anio}-${String(h.mes).padStart(2, "0")}`);
    return [...set].sort();
  }, [historico]);

  // Traduce los filtros (mes único o rango de fechas) al rango de meses
  // aplicable al histórico mensual.
  const rangoMeses = React.useMemo(() => {
    if (fMes) return { desde: fMes, hasta: fMes };
    const desde = fFechaDesde ? fFechaDesde.slice(0, 7) : "";
    const hasta = fFechaHasta ? fFechaHasta.slice(0, 7) : "";
    return { desde, hasta };
  }, [fMes, fFechaDesde, fFechaHasta]);

  function inRangoFecha(anio: number, mes: number) {
    const key = `${anio}-${String(mes).padStart(2, "0")}`;
    if (rangoMeses.desde && key < rangoMeses.desde) return false;
    if (rangoMeses.hasta && key > rangoMeses.hasta) return false;
    return true;
  }

  // Cuando se selecciona un mes específico, limpiar el rango de fechas (y vice versa).
  function elegirMes(m: string) {
    setFMes(m);
    if (m) { setFFechaDesde(""); setFFechaHasta(""); }
  }
  function elegirFechaDesde(d: string) {
    setFFechaDesde(d);
    if (d) setFMes("");
  }
  function elegirFechaHasta(d: string) {
    setFFechaHasta(d);
    if (d) setFMes("");
  }

  // Productos disponibles (para el filtro multi del tab Ventas), por nombre.
  const productosDisponibles = React.useMemo(() => {
    const set = new Set<string>();
    for (const h of historico) set.add(h.productos.nombre);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [historico]);

  const catNameSet = new Set(fCats.map((id) => categorias.find((c) => c.id === id)?.nombre).filter(Boolean) as string[]);
  const prodSet = new Set(fProds);
  const filtered = historico.filter((h) => {
    if (catNameSet.size > 0 && !(h.productos.categorias?.nombre && catNameSet.has(h.productos.categorias.nombre))) return false;
    if (prodSet.size > 0 && !prodSet.has(h.productos.nombre)) return false;
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
  // Usa TODO el histórico disponible (no respeta los filtros del tab Ventas)
  // porque vive en el tab Inventario y conviene tener el promedio más
  // estable posible para anticipar compras.
  const diasDeStockEstimado = React.useMemo(() => {
    const ventasPorProd = new Map<string, { nombre: string; cantTotal: number }>();
    const mesesSet = new Set<string>();
    for (const h of historico) {
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
  }, [historico, stockTotalPorProducto]);

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
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-white">{formatCOP(stats.valorInventario)}</p>
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
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
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
              <p className="mb-1 text-xs font-medium text-muted-foreground">Producto</p>
              <MultiSelect
                options={productosDisponibles.map((n) => ({ value: n, label: n }))}
                value={fProds}
                onChange={setFProds}
                placeholder="Todos"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Mes</p>
              <Select value={fMes} onChange={(e) => elegirMes(e.target.value)}>
                <option value="">Todos los meses</option>
                {mesesDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Fecha desde</p>
              <Input type="date" value={fFechaDesde} onChange={(e) => elegirFechaDesde(e.target.value)} max={fFechaHasta || undefined} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Fecha hasta</p>
              <Input type="date" value={fFechaHasta} onChange={(e) => elegirFechaHasta(e.target.value)} min={fFechaDesde || undefined} />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFCats([]); setFProds([]); setFMes(""); setFFechaDesde(""); setFFechaHasta(""); }}
                className="h-10 w-full rounded-md border border-border px-3 text-sm text-muted-foreground hover:border-brand-orange hover:text-brand-orange"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Estos filtros (categoría, producto, mes/fechas) aplican a las gráficas basadas en el histórico mensual: <span className="text-white">Consumo por mes, Top productos, Por categoría y la tabla de cantidades vendidas</span>. Las gráficas de <span className="text-white">Ventas última semana, Día de la semana, Top 5 por día y Utilidades</span> son resúmenes globales de las transacciones registradas y no se filtran.
          </p>
        </Card>
      ) : null}

      {/* ============================ TAB VENTAS ============================ */}
      {tab === "ventas" ? (
        <>
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">Ventas última semana</h2>
              <span className="text-xs text-muted-foreground">
                Total: {formatCOP(ventasUltimaSemana.reduce((s, d) => s + d.monto, 0))} · {formatInt(ventasUltimaSemana.reduce((s, d) => s + d.transacciones, 0))} transacciones
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={ventasUltimaSemana}>
                  <CartesianGrid stroke="#1f1f1f" vertical={false} />
                  <XAxis
                    dataKey="fechaCorta"
                    stroke="#A3A3A3"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v, i) => `${ventasUltimaSemana[i]?.diaCorto ?? ""} ${v}`}
                  />
                  <YAxis stroke="#A3A3A3" tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)} />
                  <Tooltip
                    content={<DarkTooltip formatter={(v: number, name: string) => name === "Monto" ? formatCOP(v) : formatInt(v)} />}
                    cursor={{ fill: "#ffffff10" }}
                  />
                  <Bar dataKey="monto" name="Monto" fill="#FF8C42" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Calculado en zona horaria Bogotá (UTC-5). Solo cuenta transacciones registradas en este sistema (no incluye el histórico de Alegra).
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white">Consumo por mes (monto)</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Ventas totales por mes. Incluye el histórico de Alegra (sep 2025 – abr 2026) y todas las ventas registradas desde entonces.
            </p>
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
              <div className="mb-1 flex items-center justify-between gap-2">
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
              <p className="mb-3 text-xs text-muted-foreground">
                Ranking de productos más vendidos en el rango filtrado. Cambia el selector para ordenar por monto facturado o por cantidad de unidades.
              </p>
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
              <div className="mb-1 flex items-center justify-between gap-2">
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
              <p className="mb-3 text-xs text-muted-foreground">
                Distribución del consumo entre las categorías del catálogo. Útil para ver qué tipo de productos genera más ingresos.
              </p>
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
            <h2 className="text-lg font-semibold text-white">Ventas por día de la semana</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Total acumulado por día (lunes a domingo) de todas las ventas registradas en el sistema. Sirve para identificar los días pico y planear personal o compras.
            </p>
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
                Cada barra representa el total de unidades vendidas en ese día, dividido por los 5 productos más vendidos. Solo cuenta transacciones registradas en este sistema (no incluye el histórico de Alegra) y no se ve afectada por los filtros de arriba.
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
            <h2 className="mb-1 text-lg font-semibold text-white">
              Cantidades vendidas por producto
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({topTodos.length === 0 ? "0" : `${pageTodos * PAGE_TOP + 1}–${Math.min((pageTodos + 1) * PAGE_TOP, topTodos.length)}`} de {topTodos.length})
              </span>
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Tabla completa con todos los productos vendidos en el rango filtrado. Útil para exportar a Excel o revisar productos puntuales.
            </p>
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

          {/* Utilidades brutas: costos vs ingresos por producto/servicio */}
          {(() => {
            const filtrada = utilidadPorProducto.filter((u) => filtroUtil === "todos" ? true : u.tipo === filtroUtil);
            const totalIngresos = filtrada.reduce((s, u) => s + u.ingresos, 0);
            const totalCostos = filtrada.reduce((s, u) => s + u.costos, 0);
            const totalUtilidad = totalIngresos - totalCostos;
            const margenGlobal = totalIngresos > 0 ? Math.round((totalUtilidad / totalIngresos) * 10000) / 100 : 0;
            const page = filtrada.slice(pageUtil * PAGE_TOP, (pageUtil + 1) * PAGE_TOP);
            // Datos para gráfica: top 10 con costos vs ingresos.
            const chartData = filtrada.slice(0, 10).map((u) => ({
              nombre: u.nombre.length > 22 ? u.nombre.slice(0, 22) + "…" : u.nombre,
              Ingresos: Math.round(u.ingresos),
              Costos: Math.round(u.costos),
            }));
            return (
              <>
                <Card>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Utilidades brutas: costos vs ingresos</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Top 10 por utilidad. Cada barra muestra ingresos (verde) y costos (rojo) de cada producto/servicio en las ventas registradas en el sistema. El costo usa el <strong>costo promedio de compra</strong> del producto × unidades vendidas; la utilidad bruta es la diferencia. No incluye el histórico de Alegra ni se ve afectada por los filtros de arriba.
                      </p>
                    </div>
                    <Select value={filtroUtil} onChange={(e) => { setFiltroUtil(e.target.value as any); setPageUtil(0); }} className="max-w-[160px]">
                      <option value="todos">Todos</option>
                      <option value="producto">Solo productos</option>
                      <option value="servicio">Solo servicios</option>
                    </Select>
                  </div>
                  <div className="mb-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded border border-border bg-muted/20 p-3">
                      <p className="text-xs uppercase text-muted-foreground">Ingresos totales</p>
                      <p className="mt-1 truncate text-xl font-bold tabular-nums text-green-300">{formatCOP(totalIngresos)}</p>
                    </div>
                    <div className="rounded border border-border bg-muted/20 p-3">
                      <p className="text-xs uppercase text-muted-foreground">Costos totales</p>
                      <p className="mt-1 truncate text-xl font-bold tabular-nums text-red-300">{formatCOP(totalCostos)}</p>
                    </div>
                    <div className="rounded border border-border bg-muted/20 p-3">
                      <p className="text-xs uppercase text-muted-foreground">Utilidad bruta</p>
                      <p className="mt-1 text-xl font-bold text-brand-orange">
                        {formatCOP(totalUtilidad)} <span className="text-sm text-muted-foreground">({margenGlobal}%)</span>
                      </p>
                    </div>
                  </div>
                  {chartData.length === 0 ? (
                    <EmptyState
                      title="Aún no hay ventas registradas en el sistema"
                      description="Esta gráfica se llena con las ventas reales registradas (no incluye el histórico de Alegra que es solo mensual y sin costo por venta)."
                    />
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer>
                        <BarChart data={chartData} layout="vertical" margin={{ left: 150 }}>
                          <CartesianGrid stroke="#1f1f1f" horizontal={false} />
                          <XAxis type="number" stroke="#A3A3A3" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)} />
                          <YAxis type="category" dataKey="nombre" stroke="#A3A3A3" tick={{ fontSize: 11 }} width={140} />
                          <Tooltip content={<DarkTooltip formatter={(v: number) => formatCOP(v)} />} cursor={{ fill: "#ffffff10" }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="Ingresos" fill="#22c55e" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="Costos" fill="#ef4444" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>

                {filtrada.length > 0 ? (
                  <Card>
                    <h2 className="mb-3 text-lg font-semibold text-white">
                      Utilidad por producto/servicio
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({pageUtil * PAGE_TOP + 1}–{Math.min((pageUtil + 1) * PAGE_TOP, filtrada.length)} de {filtrada.length})
                      </span>
                    </h2>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Ordenado por utilidad descendente. El margen % es <code>utilidad / ingresos × 100</code>.
                    </p>
                    <Table>
                      <THead>
                        <TR>
                          <TH>#</TH>
                          <TH>Producto / Servicio</TH>
                          <TH>Tipo</TH>
                          <TH className="text-right">Vendidas</TH>
                          <TH className="text-right">Ingresos</TH>
                          <TH className="text-right">Costos</TH>
                          <TH className="text-right">Utilidad</TH>
                          <TH className="text-right">Margen %</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {page.map((u, i) => (
                          <TR key={u.producto_id}>
                            <TD className="text-muted-foreground">{pageUtil * PAGE_TOP + i + 1}</TD>
                            <TD className="text-white">
                              {u.codigo ? <span className="mr-2 font-mono text-xs text-muted-foreground">{u.codigo}</span> : null}
                              {u.nombre}
                            </TD>
                            <TD>
                              {u.tipo === "servicio" ? <Badge tone="blue">Servicio</Badge> : <Badge tone="gray">Producto</Badge>}
                            </TD>
                            <TD className="text-right font-mono">{formatInt(u.cantidad_vendida)}</TD>
                            <TD className="text-right font-mono text-green-300">{formatCOP(u.ingresos)}</TD>
                            <TD className="text-right font-mono text-red-300">{formatCOP(u.costos)}</TD>
                            <TD className={`text-right font-mono ${u.utilidad >= 0 ? "text-brand-orange" : "text-red-400"}`}>
                              {formatCOP(u.utilidad)}
                            </TD>
                            <TD className="text-right font-mono text-muted-foreground">{u.margen_pct}%</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                    <Pager page={pageUtil} total={filtrada.length} pageSize={PAGE_TOP} onChange={setPageUtil} />
                  </Card>
                ) : null}
              </>
            );
          })()}

        </>
      ) : null}

      {/* ============================ TAB INVENTARIO ============================ */}
      {tab === "inventario" ? (
        <>
          <Card>
            <h2 className="text-lg font-semibold text-white">Stock por ubicación</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Suma de unidades del inventario en cada ubicación. Si hay desbalance (mucho en una y poco en otra), considera registrar un traslado.
            </p>
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
                        ? <span title="Suma de cantidad × costo promedio de compra de cada producto">{formatCOP(u.valor)} <span className="text-[10px]">valor en inventario estimado</span></span>
                        : u.cantidad > 0
                        ? <span title="Registra al menos una compra para que el sistema conozca el costo de estos productos">aún sin costo de compra registrado</span>
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card>
            <h2 className="mb-1 text-lg font-semibold text-white">
              Productos por categoría
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({skusOrdenados.length === 0 ? "0" : `${pageSkus * PAGE_TOP + 1}–${Math.min((pageSkus + 1) * PAGE_TOP, skusOrdenados.length)}`} de {skusOrdenados.length})
              </span>
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Cuántos SKUs distintos hay en cada categoría del catálogo. Útil para ver la salud del catálogo y detectar categorías sub-representadas.
            </p>
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

          {/* Análisis predictivo: días estimados de stock */}
          {diasDeStockEstimado.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-white">Días estimados de stock</h2>
              <p className="mb-2 text-xs text-muted-foreground">
                Calculado dividiendo el stock actual entre la velocidad promedio de venta diaria del histórico filtrado. Útil para anticipar compras.
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

      {/* ============================ TAB ALERTAS ============================ */}
      {tab === "alertas" ? (
        <Card>
          {alertasDetalladas.length === 0 ? (
            <EmptyState
              title="✓ Sin alertas de stock"
              description="Todos los productos están por encima del stock mínimo configurado."
            />
          ) : (() => {
            const catNamesInv = new Set(fCatsInv.map((id) => categorias.find((c) => c.id === id)?.nombre).filter(Boolean) as string[]);
            const q = fProdInv.trim().toLowerCase();
            const alertasFiltradas = alertasDetalladas.filter((a) => {
              if (catNamesInv.size > 0 && !(a.categoria && catNamesInv.has(a.categoria))) return false;
              if (q && !(`${a.codigo ?? ""} ${a.nombre}`.toLowerCase().includes(q))) return false;
              return true;
            });
            const pageSafe = Math.min(pageAlertas, Math.max(0, Math.ceil(alertasFiltradas.length / PAGE_TOP) - 1));
            return (
              <>
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-white">
                    Productos con stock bajo o agotado
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({alertasFiltradas.length} de {alertasDetalladas.length})
                    </span>
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Haz clic en el nombre o en "Ver" para ir a su ficha y registrar una compra o ajuste.
                  </p>
                </div>
                <div className="mb-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Categoría</p>
                    <MultiSelect
                      options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
                      value={fCatsInv}
                      onChange={(v) => { setFCatsInv(v); setPageAlertas(0); }}
                      placeholder="Todas"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Buscar producto</p>
                    <Input value={fProdInv} onChange={(e) => { setFProdInv(e.target.value); setPageAlertas(0); }} placeholder="Código o nombre..." />
                  </div>
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
                      <TH className="text-right">Ficha</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {alertasFiltradas.slice(pageSafe * PAGE_TOP, (pageSafe + 1) * PAGE_TOP).map((a) => (
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
                            <span className="text-xs text-muted-foreground">sin stock en ninguna ubicación</span>
                          ) : (
                            <UbicacionesChips ubicaciones={a.ubicaciones} />
                          )}
                        </TD>
                        <TD className="text-right">
                          <a href={`/inventario/${a.producto_id}`} className="text-sm text-brand-orange hover:opacity-80">Ver →</a>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <Pagination
                  page={pageSafe}
                  totalPages={Math.ceil(alertasFiltradas.length / PAGE_TOP)}
                  onChange={setPageAlertas}
                  totalItems={alertasFiltradas.length}
                  pageSize={PAGE_TOP}
                />
              </>
            );
          })()}
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
