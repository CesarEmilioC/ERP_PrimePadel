import Link from "next/link";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { Card } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCOP, formatInt } from "@/lib/utils";

export const dynamic = "force-dynamic";

const cards = [
  { href: "/inventario", title: "Inventario", desc: "Ver, crear y editar productos. Control de stock por ubicación." },
  { href: "/transacciones", title: "Transacciones", desc: "Registrar ventas y compras; revisar historial." },
  { href: "/dashboard", title: "Dashboard", desc: "Consumo mensual, top productos y alertas." },
  { href: "/ubicaciones", title: "Ubicaciones", desc: "Administrar bodegas, neveras y barras." },
  { href: "/categorias", title: "Categorías", desc: "Organizar productos y servicios." },
];

export default async function Home() {
  const sb = sbAdmin();
  const [{ count: nProd }, { count: nInv }, { count: nUbi }, { count: nCat }, { count: nTx }, { count: nAlertas }, { data: stockTot }] =
    await Promise.all([
      sb.from("productos").select("*", { head: true, count: "exact" }).eq("activo", true),
      sb.from("productos").select("*", { head: true, count: "exact" }).eq("activo", true).eq("es_inventariable", true),
      sb.from("ubicaciones").select("*", { head: true, count: "exact" }).eq("activa", true),
      sb.from("categorias").select("*", { head: true, count: "exact" }).eq("activa", true),
      sb.from("transacciones").select("*", { head: true, count: "exact" }),
      sb.from("v_stock_total").select("*", { head: true, count: "exact" }).in("estado_stock", ["stock_bajo", "sin_stock"]),
      sb.from("v_stock_total").select("cantidad_total, valor_total_costo"),
    ]);

  const totalStock = (stockTot ?? []).reduce((a: number, r: any) => a + Number(r.cantidad_total ?? 0), 0);
  const valorInv = (stockTot ?? []).reduce((a: number, r: any) => a + Number(r.valor_total_costo ?? 0), 0);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">
            ERP <span className="text-brand-orange">Prime Padel</span>
          </h1>
          <Badge tone="yellow">MVP</Badge>
        </div>
        <p className="max-w-2xl text-muted-foreground">
          Sistema central de inventario, compras, ventas y análisis de consumo del club.
          Actualmente operando con {nProd ?? 0} productos y servicios, {nUbi ?? 0} ubicaciones y
          histórico desde octubre 2025.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Productos activos</p>
          <p className="mt-1 text-3xl font-bold text-white">{nProd ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">{nInv ?? 0} inventariables · {(nProd ?? 0) - (nInv ?? 0)} servicios/no-inventariables</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Stock total actual</p>
          <p className="mt-1 text-3xl font-bold text-white">{formatInt(totalStock)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Valor estimado en costo: {formatCOP(valorInv)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Alertas de stock</p>
          <p className="mt-1 text-3xl font-bold text-brand-orange">{nAlertas ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">productos en mínimo o cero</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Transacciones registradas</p>
          <p className="mt-1 text-3xl font-bold text-white">{nTx ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">{nCat ?? 0} categorías activas</p>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Accesos</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group rounded-lg border border-border bg-card p-5 transition hover:border-brand-orange"
            >
              <h3 className="text-lg font-semibold text-white group-hover:text-brand-orange">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
