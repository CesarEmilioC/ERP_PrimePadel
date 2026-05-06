import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe tener formato YYYY-MM-DD");

const DOS_ANIOS_MS = 1000 * 60 * 60 * 24 * 366 * 2;

export const exportCsvSchema = z
  .object({
    modo: z.enum(["por_item", "por_transaccion"]),
    fecha_inicio: isoDate,
    fecha_fin: isoDate,
  })
  .refine((d) => d.fecha_inicio <= d.fecha_fin, {
    message: "La fecha inicial debe ser anterior o igual a la final",
    path: ["fecha_fin"],
  })
  .refine(
    (d) => {
      const ini = new Date(d.fecha_inicio + "T00:00:00Z").getTime();
      const fin = new Date(d.fecha_fin + "T23:59:59Z").getTime();
      return fin - ini <= DOS_ANIOS_MS;
    },
    {
      message: "El rango no puede exceder 2 años",
      path: ["fecha_fin"],
    },
  );

export type ExportCsvInput = z.infer<typeof exportCsvSchema>;
