import { getCategorias } from "@/lib/queries";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireAdmin } from "@/lib/auth";
import { CategoriasClient } from "./categorias-client";
import type { Categoria } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  await requireAdmin();
  const cats = (await getCategorias()) as Categoria[];
  const { data: productos } = await sbAdmin().from("productos").select("categoria_id");
  const conteo: Record<string, number> = {};
  for (const p of productos ?? []) {
    if (!p.categoria_id) continue;
    conteo[p.categoria_id] = (conteo[p.categoria_id] ?? 0) + 1;
  }
  return <CategoriasClient initial={cats} conteoPorCategoria={conteo} />;
}
