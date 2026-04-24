"use server";

import { revalidatePath } from "next/cache";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireAdmin } from "@/lib/auth";

export type CreateUsuarioResult =
  | { ok: true; email: string; password: string }
  | { error: string };

function generatePassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 10; i++) pw += charset[bytes[i] % charset.length];
  return pw;
}

export async function createUsuario(input: {
  email: string;
  nombre: string;
  rol: "admin" | "cajero";
  password?: string;
}): Promise<CreateUsuarioResult> {
  await requireAdmin();

  const email = input.email.trim().toLowerCase();
  const nombre = input.nombre.trim();
  if (!email || !nombre) return { error: "Email y nombre son obligatorios." };
  if (!["admin", "cajero"].includes(input.rol)) return { error: "Rol inválido." };

  const password = input.password?.trim() || generatePassword();
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const sb = sbAdmin();

  const { data: created, error: e1 } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (e1 || !created.user) {
    return { error: e1?.message || "No se pudo crear el usuario en Auth." };
  }

  const { error: e2 } = await sb.from("perfiles").insert({
    user_id: created.user.id,
    nombre,
    rol: input.rol,
    activo: true,
  });

  if (e2) {
    // Rollback: si falla el perfil, eliminamos el auth user para no dejar huérfanos.
    await sb.auth.admin.deleteUser(created.user.id);
    return { error: e2.message };
  }

  revalidatePath("/usuarios");
  return { ok: true, email, password };
}

type ActionResult = { ok: true } | { error: string };

export async function toggleActivo(userId: string, activo: boolean): Promise<ActionResult> {
  await requireAdmin();
  const { error } = await sbAdmin().from("perfiles").update({ activo }).eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function cambiarRol(userId: string, rol: "admin" | "cajero"): Promise<ActionResult> {
  await requireAdmin();
  const { error } = await sbAdmin().from("perfiles").update({ rol }).eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function resetPassword(userId: string): Promise<{ ok: true; password: string } | { error: string }> {
  await requireAdmin();
  const password = generatePassword();
  const { error } = await sbAdmin().auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  revalidatePath("/usuarios");
  return { ok: true, password };
}

export async function updateUsuario(
  userId: string,
  input: { nombre?: string; email?: string; password?: string | null },
): Promise<ActionResult> {
  await requireAdmin();
  const sb = sbAdmin();

  const nombre = input.nombre?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password?.trim() || null;

  // 1) Actualizar datos de auth (email / password / metadata nombre).
  const authPayload: { email?: string; password?: string; user_metadata?: { nombre: string } } = {};
  if (email) authPayload.email = email;
  if (password) {
    if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
    authPayload.password = password;
  }
  if (nombre) authPayload.user_metadata = { nombre };

  if (Object.keys(authPayload).length > 0) {
    const { error } = await sb.auth.admin.updateUserById(userId, authPayload);
    if (error) return { error: error.message };
  }

  // 2) Actualizar el perfil (solo nombre — rol y activo tienen sus propias acciones).
  if (nombre) {
    const { error } = await sb.from("perfiles").update({ nombre }).eq("user_id", userId);
    if (error) return { error: error.message };
  }

  revalidatePath("/usuarios");
  return { ok: true };
}
