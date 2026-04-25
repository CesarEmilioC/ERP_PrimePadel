import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { sbAdmin } from "./supabase/admin-server";

// Jerarquía de roles. Un nivel mayor implica todos los permisos del menor.
//   recepcion (1)   — operación de ventas en caja
//   admin (2)       — operación general (ventas + compras + traslados + inventario + ubicaciones)
//   maestro (3)     — acceso total (incluye dashboard, categorías, usuarios, precios y costos)
export type Rol = "maestro" | "admin" | "recepcion";

const RANK: Record<Rol, number> = { recepcion: 1, admin: 2, maestro: 3 };

export type Perfil = {
  user_id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  email?: string | null;
  username?: string | null;
};

export const INTERNAL_DOMAIN = "primepadel.local";

// Convierte un nombre de usuario interno a un email sintético para Supabase Auth.
// Si la entrada ya es un email externo (contiene @), se devuelve igual.
export function usernameToEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@${INTERNAL_DOMAIN}`;
}

// Si el email es del dominio interno, devuelve solo el username; si es externo, devuelve el email.
export function emailToDisplayUsername(email: string | null | undefined): string {
  if (!email) return "";
  if (email.endsWith(`@${INTERNAL_DOMAIN}`)) {
    return email.slice(0, -INTERNAL_DOMAIN.length - 1);
  }
  return email;
}

export async function getCurrentUser() {
  const sb = await createSupabaseServerClient();
  const { data } = await sb.auth.getUser();
  return data.user;
}

export async function getCurrentProfile(): Promise<Perfil | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await sbAdmin()
    .from("perfiles")
    .select("user_id, nombre, rol, activo")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    email: user.email ?? null,
    username: emailToDisplayUsername(user.email),
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireProfile(): Promise<Perfil> {
  const perfil = await getCurrentProfile();
  if (!perfil) redirect("/login?error=sin_perfil");
  if (!perfil.activo) redirect("/login?error=desactivado");
  return perfil;
}

// Maestro únicamente.
export async function requireMaestro(): Promise<Perfil> {
  const perfil = await requireProfile();
  if (perfil.rol !== "maestro") redirect("/?error=maestro_requerido");
  return perfil;
}

// Admin o maestro.
export async function requireAdmin(): Promise<Perfil> {
  const perfil = await requireProfile();
  if (RANK[perfil.rol] < RANK.admin) redirect("/?error=admin_requerido");
  return perfil;
}

export function tieneRol(perfil: Perfil | null, minimo: Rol): boolean {
  if (!perfil || !perfil.activo) return false;
  return RANK[perfil.rol] >= RANK[minimo];
}

export function isMaestro(perfil: Perfil | null) {
  return perfil?.rol === "maestro" && perfil?.activo;
}

export function isAdmin(perfil: Perfil | null) {
  return tieneRol(perfil, "admin");
}
