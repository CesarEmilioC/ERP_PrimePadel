"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { usernameToEmail } from "@/lib/auth";

export async function signIn(_prev: unknown, formData: FormData): Promise<{ error: string | null }> {
  const usuario = String(formData.get("usuario") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!usuario || !password) {
    return { error: "Ingresa tu usuario y contraseña." };
  }

  const email = usernameToEmail(usuario);

  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  const { data: perfil } = await sbAdmin()
    .from("perfiles")
    .select("activo")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!perfil) {
    await sb.auth.signOut();
    return { error: "Tu cuenta no tiene perfil asignado. Contacta al administrador." };
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
