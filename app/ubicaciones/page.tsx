import { getUbicaciones } from "@/lib/queries";
import { UbicacionesClient } from "./ubicaciones-client";
import type { Ubicacion } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function UbicacionesPage() {
  const data = (await getUbicaciones()) as Ubicacion[];
  return <UbicacionesClient initial={data} />;
}
