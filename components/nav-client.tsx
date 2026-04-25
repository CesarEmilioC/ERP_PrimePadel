"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/login/actions";
import type { Perfil, Rol } from "@/lib/auth";

type LinkDef = { href: string; label: string; minRol: Rol };

const LINKS: LinkDef[] = [
  { href: "/transacciones", label: "Transacciones", minRol: "recepcion" },
  { href: "/inventario", label: "Inventario", minRol: "admin" },
  { href: "/ubicaciones", label: "Ubicaciones", minRol: "admin" },
  { href: "/dashboard", label: "Dashboard", minRol: "maestro" },
  { href: "/categorias", label: "Categorías", minRol: "maestro" },
  { href: "/usuarios", label: "Usuarios", minRol: "maestro" },
];

const RANK: Record<Rol, number> = { recepcion: 1, admin: 2, maestro: 3 };

const ROL_LABEL: Record<Rol, string> = {
  maestro: "MAESTRO",
  admin: "ADMIN",
  recepcion: "RECEPCIÓN",
};

export function NavClient({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname();
  const visibles = LINKS.filter((l) => RANK[perfil.rol] >= RANK[l.minRol]);
  const [openMenu, setOpenMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!openMenu) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openMenu]);

  const inicial = perfil.nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-28 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Prime Padel"
            width={400}
            height={120}
            priority
            className="h-24 w-auto brightness-150"
          />
          <span className="sr-only">Prime Padel ERP</span>
        </Link>

        <nav className="flex items-center gap-1">
          {visibles.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-brand-orange/15 text-brand-orange"
                    : "text-muted-foreground hover:bg-muted hover:text-white",
                )}
              >
                {l.label}
              </Link>
            );
          })}

          <div ref={menuRef} className="relative ml-2">
            <button
              type="button"
              onClick={() => setOpenMenu((v) => !v)}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm hover:border-brand-orange"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-black">
                {inicial}
              </span>
              <span className="hidden text-white md:inline">{perfil.nombre.split(" ")[0]}</span>
              <span className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground md:inline">
                {ROL_LABEL[perfil.rol]}
              </span>
            </button>

            {openMenu ? (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-md border border-border bg-card p-3 shadow-xl">
                <div className="mb-2 border-b border-border pb-2">
                  <p className="text-sm font-semibold text-white">{perfil.nombre}</p>
                  <p className="text-xs text-muted-foreground">@{perfil.username ?? "—"}</p>
                  <p className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {ROL_LABEL[perfil.rol]}
                  </p>
                </div>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-white"
                  >
                    Cerrar sesión
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  );
}
