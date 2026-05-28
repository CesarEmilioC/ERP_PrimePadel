import Link from "next/link";
import { notFound } from "next/navigation";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireAdmin } from "@/lib/auth";
import { getCostoPromedioPorProducto } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card, Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { formatCOP, formatInt } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UbicacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sb = sbAdmin();

  const { data: ubicacion } = await sb
    .from("ubicaciones")
    .select("id, nombre, tipo, descripcion, activa, orden")
    .eq("id", id)
    .maybeSingle();

  if (!ubicacion) notFound();

  const [{ data: stockRows }, costoPromedio] = await Promise.all([
    sb.from("stock_por_ubicacion")
      .select("cantidad, productos(id, codigo, nombre, activo, categoria_id, categorias(nombre))")
      .eq("ubicacion_id", id),
    getCostoPromedioPorProducto(),
  ]);

  const items = ((stockRows ?? []) as any[])
    .filter((r) => r.productos != null && Number(r.cantidad ?? 0) > 0) // solo productos presentes
    .map((r) => {
      const p = r.productos;
      const cantidad = Number(r.cantidad ?? 0);
      // Costo promedio de compra del producto (no el costo "catálogo" que suele estar en 0).
      const costo = costoPromedio.get(p.id) ?? 0;
      return {
        producto_id: p.id as string,
        codigo: p.codigo as string | null,
        nombre: p.nombre as string,
        categoria_nombre: (p.categorias?.nombre as string | null) ?? null,
        activo: !!p.activo,
        cantidad,
        costo_unitario: costo,
        valor_estimado: cantidad * costo,
      };
    })
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"));

  const totalUnidades = items.reduce((s, i) => s + i.cantidad, 0);
  const valorTotal = items.reduce((s, i) => s + i.valor_estimado, 0);
  const productosDistintos = items.filter((i) => i.cantidad > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ubicaciones" className="text-sm text-muted-foreground hover:text-brand-orange">
          ← Volver a ubicaciones
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold">{ubicacion.nombre}</h1>
          <Badge tone="blue">{ubicacion.tipo}</Badge>
          {!ubicacion.activa ? <Badge tone="gray">Inactiva</Badge> : null}
        </div>
        {ubicacion.descripcion ? (
          <p className="mt-1 text-sm text-muted-foreground">{ubicacion.descripcion}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Productos distintos</p>
          <p className="mt-1 text-2xl font-bold text-white">{productosDistintos}</p>
          <p className="mt-1 text-xs text-muted-foreground">con stock &gt; 0</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Unidades totales</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatInt(totalUnidades)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Valor en inventario estimado</p>
          <p title={formatCOP(valorTotal)} className="mt-1 truncate text-2xl font-bold tabular-nums text-brand-orange">{formatCOP(valorTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">cantidad × costo promedio de compra</p>
        </Card>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Esta ubicación no tiene productos registrados"
          description="Los productos aparecen aquí en cuanto se registra una compra, traslado o ajuste de inventario hacia esta ubicación."
        />
      ) : (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Productos en esta ubicación</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Estos son los productos que el sistema cree que hay aquí en este momento, según las transacciones registradas. Si encuentras diferencias con el conteo físico real, ve a la ficha del producto y registra un ajuste de inventario.
          </p>
          <Table>
            <THead>
              <TR>
                <TH>Código</TH>
                <TH>Producto</TH>
                <TH>Categoría</TH>
                <TH className="text-right">Cantidad</TH>
                <TH className="text-right">Costo unit.</TH>
                <TH className="text-right">Valor estimado</TH>
                <TH className="text-right">Ficha</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((i) => (
                <TR key={i.producto_id}>
                  <TD className="font-mono text-xs text-muted-foreground">{i.codigo ?? "—"}</TD>
                  <TD>
                    <Link
                      href={`/inventario/${i.producto_id}`}
                      className={i.activo ? "text-white hover:text-brand-orange" : "text-muted-foreground hover:text-brand-orange"}
                    >
                      {i.nombre}
                    </Link>
                    {!i.activo ? <span className="ml-2 text-xs text-muted-foreground italic">inactivo</span> : null}
                  </TD>
                  <TD className="text-muted-foreground">{i.categoria_nombre ?? "—"}</TD>
                  <TD className="text-right font-mono">
                    {i.cantidad === 0 ? (
                      <span className="text-muted-foreground">0</span>
                    ) : (
                      <span className="text-white">{formatInt(i.cantidad)}</span>
                    )}
                  </TD>
                  <TD className="text-right font-mono text-muted-foreground">
                    {i.costo_unitario > 0 ? formatCOP(i.costo_unitario) : "—"}
                  </TD>
                  <TD className="text-right font-mono">
                    {i.valor_estimado > 0 ? formatCOP(i.valor_estimado) : <span className="text-muted-foreground">—</span>}
                  </TD>
                  <TD className="text-right">
                    <Link href={`/inventario/${i.producto_id}`} className="text-sm text-brand-orange hover:opacity-80">
                      Ver →
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
