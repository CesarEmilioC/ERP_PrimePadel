"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/inventario", label: "Inventario" },
  { href: "/transacciones", label: "Transacciones" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ubicaciones", label: "Ubicaciones" },
  { href: "/categorias", label: "Categorías" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-28 max-w-7xl items-center justify-between px-4">
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
          {links.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-brand-orange/15 text-brand-orange"
                    : "text-muted-foreground hover:bg-muted hover:text-white"
                )}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/login"
            className="ml-2 rounded-md border border-border px-3 py-2 text-sm text-white hover:border-brand-orange hover:text-brand-orange"
          >
            Entrar
          </Link>
        </nav>
      </div>
    </header>
  );
}
