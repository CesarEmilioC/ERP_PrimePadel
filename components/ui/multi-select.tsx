"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  className,
}: {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = React.useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())),
    [options, q],
  );

  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }

  const label =
    value.length === 0
      ? placeholder
      : value.length <= 2
        ? options.filter((o) => value.includes(o.value)).map((o) => o.label).join(", ")
        : `${value.length} seleccionados`;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-border bg-card px-3 text-sm",
          value.length === 0 ? "text-muted-foreground" : "text-white",
        )}
      >
        <span className="truncate">{label}</span>
        <span className="ml-2 text-muted-foreground">▾</span>
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="h-9 w-full border-b border-border bg-transparent px-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">Sin resultados</div>
            ) : (
              filtered.map((o) => {
                const checked = value.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted",
                      checked ? "text-brand-orange" : "text-white",
                    )}
                  >
                    <span className={cn("inline-block h-3 w-3 rounded border", checked ? "bg-brand-orange border-brand-orange" : "border-border")} />
                    {o.label}
                  </button>
                );
              })
            )}
          </div>
          {value.length > 0 ? (
            <div className="flex justify-between border-t border-border px-3 py-2 text-xs">
              <button type="button" onClick={() => onChange([])} className="text-muted-foreground hover:text-white">
                Limpiar ({value.length})
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-brand-orange hover:opacity-80">
                Listo
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
