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
