import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCOP(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "$ 0,00";
  return cop.format(value);
}

const intNum = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
export function formatInt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0";
  return intNum.format(value);
}

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  dateStyle: "medium",
  timeStyle: "short",
});
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return dateFmt.format(d);
}

const fechaHoraFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit",
});
export function formatFechaHora(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return fechaHoraFmt.format(d);
}

const fechaCortaFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  year: "numeric", month: "2-digit", day: "2-digit",
});
// Fecha en formato YYYY-MM-DD (zona Bogotá) — útil para inputs type="date"
export function fechaInputDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  // Reformatear a YYYY-MM-DD
  const partes = fechaCortaFmt.formatToParts(d);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
