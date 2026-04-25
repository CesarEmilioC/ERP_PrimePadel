"use server";

import { revalidatePath } from "next/cache";
import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireMaestro, usernameToEmail, type Rol } from "@/lib/auth";

export type CreateUsuarioResult =
  | { ok: true; usuario: string; password: string }
  | { error: string };

type ActionResult = { ok: true } | { error: string };

const ROLES_VALIDOS: Rol[] = ["maestro", "admin", "recepcion"];

function generatePassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 10; i++) pw += charset[bytes[i] % charset.length];
  return pw;
}

function validarUsername(s: string): string | null {
  if (!/^[a-z0-9._-]{3,30}$/.test(s)) {
    return "El usuario debe tener entre 3 y 30 caracteres y solo puede contener letras, números, punto, guion o guion bajo.";
  }
  return null;
}

export async function createUsuario(input: {
  usuario: string;
  nombre: string;
  rol: Rol;
  password?: string;
}): Promise<CreateUsuarioResult> {
  await requireMaestro();

  const usuario = input.usuario.trim().toLowerCase();
  const nombre = input.nombre.trim();
  if (!usuario || !nombre) return { error: "Usuario y nombre son obligatorios." };
  const errUser = validarUsername(usuario);
  if (errUser) return { error: errUser };
  if (!ROLES_VALIDOS.includes(input.rol)) return { error: "Rol inválido." };

  const password = input.password?.trim() || generatePassword();
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const sb = sbAdmin();
  const email = usernameToEmail(usuario);

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
    await sb.auth.admin.deleteUser(created.user.id);
    return { error: e2.message };
  }

  revalidatePath("/usuarios");
  return { ok: true, usuario, password };
}

export async function toggleActivo(userId: string, activo: boolean): Promise<ActionResult> {
  await requireMaestro();
  const { error } = await sbAdmin().from("perfiles").update({ activo }).eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function cambiarRol(userId: string, rol: Rol): Promise<ActionResult> {
  await requireMaestro();
  if (!ROLES_VALIDOS.includes(rol)) return { error: "Rol inválido." };
  const { error } = await sbAdmin().from("perfiles").update({ rol }).eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function resetPassword(userId: string): Promise<{ ok: true; password: string } | { error: string }> {
  await requireMaestro();
  const password = generatePassword();
  const { error } = await sbAdmin().auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  revalidatePath("/usuarios");
  return { ok: true, password };
}

export async function updateUsuario(
  userId: string,
  input: { nombre?: string; usuario?: string; password?: string | null },
): Promise<ActionResult> {
  await requireMaestro();
  const sb = sbAdmin();

  const nombre = input.nombre?.trim();
  const usuario = input.usuario?.trim().toLowerCase();
  const password = input.password?.trim() || null;

  const authPayload: { email?: string; password?: string; user_metadata?: { nombre: string } } = {};

  if (usuario) {
    const errUser = validarUsername(usuario);
    if (errUser) return { error: errUser };
    authPayload.email = usernameToEmail(usuario);
  }
  if (password) {
    if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
    authPayload.password = password;
  }
  if (nombre) authPayload.user_metadata = { nombre };

  if (Object.keys(authPayload).length > 0) {
    const { error } = await sb.auth.admin.updateUserById(userId, authPayload);
    if (error) return { error: error.message };
  }

  if (nombre) {
    const { error } = await sb.from("perfiles").update({ nombre }).eq("user_id", userId);
    if (error) return { error: error.message };
  }

  revalidatePath("/usuarios");
  return { ok: true };
}
