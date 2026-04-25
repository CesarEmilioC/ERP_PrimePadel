import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-white placeholder:text-muted-foreground focus:border-brand-orange focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[80px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-brand-orange focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-white focus:border-brand-orange focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// Input numérico que:
// - Permite borrar todo y escribir libremente (no fuerza un mínimo mientras editas)
// - Muestra separadores de miles cuando no está enfocado
// - Acepta solo dígitos (y opcionalmente decimales)
// - Devuelve siempre number al onChange
export const NumericInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
    value: number;
    onChange: (n: number) => void;
    allowDecimals?: boolean;
    min?: number;
  }
>(function NumericInput({ value, onChange, allowDecimals = false, min, className, ...rest }, ref) {
  const [focused, setFocused] = React.useState(false);
  const [raw, setRaw] = React.useState(String(value ?? 0));

  // Sincroniza el valor externo cuando cambia desde fuera (ej. switch venta/compra).
  React.useEffect(() => {
    if (!focused) setRaw(String(value ?? 0));
  }, [value, focused]);

  function parse(s: string): number {
    if (!s) return 0;
    const cleaned = allowDecimals
      ? s.replace(/[^\d.,-]/g, "").replace(",", ".")
      : s.replace(/\D/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: allowDecimals ? 2 : 0,
      }),
    [allowDecimals],
  );

  const display = focused
    ? raw
    : value === 0 && raw === ""
    ? ""
    : formatter.format(value || 0);

  return (
    <input
      ref={ref}
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      value={display}
      onFocus={(e) => {
        setFocused(true);
        setRaw(String(value ?? 0));
        e.target.select();
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        let n = parse(raw);
        if (typeof min === "number" && n < min) n = min;
        if (n !== value) onChange(n);
        rest.onBlur?.(e);
      }}
      onChange={(e) => {
        const v = e.target.value;
        setRaw(v);
        // Notificar cambio en tiempo real (parseado), pero sin forzar mínimo aún.
        const n = parse(v);
        if (n !== value) onChange(n);
      }}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-card px-3 text-right text-sm font-mono text-white placeholder:text-muted-foreground focus:border-brand-orange focus:outline-none",
        className,
      )}
      {...rest}
    />
  );
});
