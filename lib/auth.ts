import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { sbAdmin } from "./supabase/admin-server";

export type Rol = "admin" | "cajero";

export type Perfil = {
  user_id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  email?: string | null;
};

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
  return { ...data, email: user.email ?? null };
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

export async function requireAdmin(): Promise<Perfil> {
  const perfil = await requireProfile();
  if (perfil.rol !== "admin") redirect("/?error=admin_requerido");
  return perfil;
}

export function isAdmin(perfil: Perfil | null) {
  return perfil?.rol === "admin" && perfil?.activo;
}
