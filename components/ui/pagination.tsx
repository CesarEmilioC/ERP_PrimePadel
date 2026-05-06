"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  /** Página actual (0-indexed). */
  page: number;
  /** Total de páginas (>= 1). */
  totalPages: number;
  onChange: (page: number) => void;
  /** Si se pasa, muestra "23–32 de 145" antes del control. */
  totalItems?: number;
  pageSize?: number;
  className?: string;
};

/**
 * Paginación con flechas + input editable. El input acepta un número y
 * salta a esa página al presionar Enter o salir del campo (onBlur).
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  totalItems,
  pageSize,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Buffer del input mientras el usuario escribe (no se aplica hasta Enter/blur).
  const [input, setInput] = React.useState(String(page + 1));
  React.useEffect(() => {
    setInput(String(page + 1));
  }, [page]);

  function commit() {
    const n = parseInt(input, 10);
    if (Number.isNaN(n)) {
      setInput(String(page + 1));
      return;
    }
    const clamped = Math.max(1, Math.min(totalPages, n));
    setInput(String(clamped));
    if (clamped - 1 !== page) onChange(clamped - 1);
  }

  const summary =
    totalItems != null && pageSize != null && totalItems > 0
      ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalItems)} de ${totalItems}`
      : null;

  return (
    <div className={cn("flex items-center justify-end gap-2 text-xs text-muted-foreground", className)}>
      {summary ? <span>{summary}</span> : null}
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        className="rounded px-2 py-1 hover:text-white disabled:opacity-30"
        aria-label="Página anterior"
      >
        ← Ant.
      </button>
      <span className="flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={totalPages}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-12 rounded border border-border bg-background px-1.5 py-0.5 text-center font-mono text-xs text-white focus:border-brand-orange focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label="Ir a página"
        />
        <span>/ {totalPages}</span>
      </span>
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        className="rounded px-2 py-1 hover:text-white disabled:opacity-30"
        aria-label="Página siguiente"
      >
        Sig. →
      </button>
    </div>
  );
}
