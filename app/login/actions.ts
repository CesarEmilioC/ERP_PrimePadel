"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sbAdmin } from "@/lib/supabase/admin-server";

export async function signIn(_prev: unknown, formData: FormData): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) {
    return { error: "Ingresa tu email y contraseña." };
  }

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Email o contraseña incorrectos." };
  }

  // Check that the user has an active perfil
  const { data: perfil } = await sbAdmin()
    .from("perfiles")
    .select("activo")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!perfil) {
    await sb.auth.signOut();
    return { error: "Tu usuario no tiene perfil asignado. Contacta al administrador." };
  }
  if (!perfil.activo) {
    await sb.auth.signOut();
    return { error: "Tu cuenta está desactivada. Contacta al administrador." };
  }

  redirect(next && next.startsWith("/") ? next : "/");
}

export async function signOut() {
  const sb = await createSupabaseServerClient();
  await sb.auth.signOut();
  redirect("/login");
}
