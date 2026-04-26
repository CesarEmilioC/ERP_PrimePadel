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
  { href: "/listas-precios", label: "Listas de precios", minRol: "maestro" },
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
  const [openUser, setOpenUser] = React.useState(false);
  const [openHamb, setOpenHamb] = React.useState(false);
  const userRef = React.useRef<HTMLDivElement>(null);
  const hambRef = React.useRef<HTMLDivElement>(null);

  // Cierra los menús al hacer click fuera.
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (openUser && userRef.current && !userRef.current.contains(e.target as Node)) setOpenUser(false);
      if (openHamb && hambRef.current && !hambRef.current.contains(e.target as Node)) setOpenHamb(false);
    }
    if (openUser || openHamb) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [openUser, openHamb]);

  // Cierra el hamburger al cambiar de ruta.
  React.useEffect(() => { setOpenHamb(false); }, [pathname]);

  const inicial = perfil.nombre.trim().charAt(0).toUpperCase() || "?";
  const usaHamburger = visibles.length > 2;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:gap-4 sm:px-4 md:min-h-28">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt="Prime Padel"
            width={400}
            height={120}
            priority
            className="h-16 w-auto brightness-150 sm:h-20 md:h-24"
          />
          <span className="sr-only">Prime Padel ERP</span>
        </Link>

        {/* Links inline en desktop (md+) */}
        <nav className="hidden items-center gap-1 md:flex">
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
        </nav>

        <div className="flex items-center gap-2">
          {/* Hamburger en móvil cuando hay más de 2 pestañas */}
          {usaHamburger ? (
            <div ref={hambRef} className="relative md:hidden">
              <button
                type="button"
                onClick={() => { setOpenHamb((v) => !v); setOpenUser(false); }}
                aria-label="Abrir menú"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-border hover:border-brand-orange"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {openHamb ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-md border border-border bg-card p-2 shadow-xl">
                  {visibles.map((l) => {
                    const active = pathname?.startsWith(l.href);
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={cn(
                          "block rounded-md px-3 py-2 text-sm transition",
                          active
                            ? "bg-brand-orange/15 text-brand-orange"
                            : "text-muted-foreground hover:bg-muted hover:text-white",
                        )}
                      >
                        {l.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            // Si solo hay 1-2 pestañas (recepción) las dejamos inline también en móvil
            <nav className="flex items-center gap-1 md:hidden">
              {visibles.map((l) => {
                const active = pathname?.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-xs transition",
                      active
                        ? "bg-brand-orange/15 text-brand-orange"
                        : "text-muted-foreground hover:bg-muted hover:text-white",
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Avatar/menú de usuario */}
          <div ref={userRef} className="relative">
            <button
              type="button"
              onClick={() => { setOpenUser((v) => !v); setOpenHamb(false); }}
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

            {openUser ? (
              <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-md border border-border bg-card p-3 shadow-xl">
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
        </div>
      </div>
    </header>
  );
}
