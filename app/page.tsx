import Link from "next/link";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { Card } from "@/components/ui/table";
import { formatCOP, formatInt } from "@/lib/utils";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALL_CARDS = [
  { href: "/inventario", title: "Inventario", desc: "Ver, crear y editar productos. Control de stock por ubicación.", adminOnly: false },
  { href: "/transacciones", title: "Transacciones", desc: "Registrar ventas y compras; revisar historial.", adminOnly: false },
  { href: "/dashboard", title: "Dashboard", desc: "Consumo mensual, top productos y alertas.", adminOnly: true },
  { href: "/ubicaciones", title: "Ubicaciones", desc: "Administrar bodegas, neveras y barras.", adminOnly: true },
  { href: "/categorias", title: "Categorías", desc: "Organizar productos y servicios.", adminOnly: true },
  { href: "/usuarios", title: "Usuarios", desc: "Crear y gestionar las cuentas del personal.", adminOnly: true },
];

export default async function Home() {
  const perfil = await requireProfile();
  const isAdmin = perfil.rol === "admin";
  const cards = ALL_CARDS.filter((c) => !c.adminOnly || isAdmin);

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
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-4xl font-bold tracking-tight">
            Hola, <span className="text-brand-orange">{perfil.nombre.split(" ")[0]}</span>
          </h1>
          <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
            {perfil.rol}
          </span>
        </div>
        <p className="max-w-2xl text-muted-foreground">
          Sistema central de inventario, compras, ventas y análisis de consumo del club.
          Actualmente operando con {nProd ?? 0} productos y servicios, {nUbi ?? 0} ubicaciones.
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
          {isAdmin ? (
            <p className="mt-1 text-xs text-muted-foreground">Valor estimado en costo: {formatCOP(valorInv)}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">unidades físicas</p>
          )}
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
