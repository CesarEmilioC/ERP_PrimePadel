import { getUbicaciones } from "@/lib/queries";
import { requireAdmin } from "@/lib/auth";
import { UbicacionesClient } from "./ubicaciones-client";
import type { Ubicacion } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function UbicacionesPage() {
  await requireAdmin();
  const data = (await getUbicaciones()) as Ubicacion[];
  return <UbicacionesClient initial={data} />;
}
