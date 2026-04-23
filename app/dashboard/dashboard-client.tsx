"use client";

import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

function mesLabel(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, "0")}`;
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
  const serieMensual = [...porMesMap.values()].sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes));

  // Top productos por cantidad (histórico)
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
  const topProductos = [...topMap.values()]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);

  // Distribución por categoría (cantidad)
  const categoriaMap = new Map<string, number>();
  for (const h of filtered) {
    const c = h.productos.categorias?.nombre ?? "Sin categoría";
    categoriaMap.set(c, (categoriaMap.get(c) ?? 0) + h.cantidad_vendida);
  }
  const porCategoria = [...categoriaMap.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8);

  // Último mes vs anterior
  const ultimo = serieMensual[serieMensual.length - 1];
  const penultimo = serieMensual[serieMensual.length - 2];
  const deltaMonto = ultimo && penultimo ? ((ultimo.monto - penultimo.monto) / (penultimo.monto || 1)) * 100 : 0;

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

      {/* Consumo por mes */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-white">Consumo por mes {vista === "monto" ? "(monto)" : "(cantidades)"}</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={serieMensual}>
              <CartesianGrid stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="key" stroke="#A3A3A3" tick={{ fontSize: 12 }} />
              <YAxis stroke="#A3A3A3" tick={{ fontSize: 12 }} tickFormatter={(v) => vista === "monto" ? `${(v/1_000_000).toFixed(1)}M` : formatInt(v)} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8 }}
                formatter={(v: number) => vista === "monto" ? formatCOP(v) : formatInt(v)}
              />
              <Bar dataKey={vista === "monto" ? "monto" : "cantidad"} fill="#FF8C42" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top productos */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Top 10 productos más vendidos</h2>
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={topProductos} layout="vertical" margin={{ left: 120 }}>
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
        </Card>

        {/* Por categoría */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Consumo por categoría</h2>
          <div className="h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={porCategoria}
                  dataKey="cantidad"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={(e: any) => e.nombre.length > 18 ? e.nombre.slice(0, 16) + "…" : e.nombre}
                >
                  {porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8 }}
                  formatter={(v: number) => formatInt(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tendencia en línea */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-white">Tendencia mensual (cantidad vs monto)</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={serieMensual}>
              <CartesianGrid stroke="#1f1f1f" vertical={false} />
              <XAxis dataKey="key" stroke="#A3A3A3" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" stroke="#FFB366" tick={{ fontSize: 11 }} tickFormatter={(v) => formatInt(v)} />
              <YAxis yAxisId="right" orientation="right" stroke="#F5C518" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1_000_000).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8 }}
                formatter={(v: number, name) => name === "cantidad" ? formatInt(v) : formatCOP(v)}
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
