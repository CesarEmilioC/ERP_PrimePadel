"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
type Ctx = { push: (t: Omit<Toast, "id">) => void };
const ToastCtx = React.createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);

  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-xl",
              t.tone === "success" && "border-green-600 bg-green-950 text-green-200",
              t.tone === "error" && "border-red-600 bg-red-950 text-red-200",
              t.tone === "info" && "border-border bg-card text-white",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast fuera de ToastProvider");
  return ctx;
}
