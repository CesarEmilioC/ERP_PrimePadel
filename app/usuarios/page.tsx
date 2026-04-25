import { sbAdmin } from "@/lib/supabase/admin-server";
import { requireMaestro, emailToDisplayUsername, type Rol } from "@/lib/auth";
import { UsuariosClient } from "./usuarios-client";

export const dynamic = "force-dynamic";

type UsuarioRow = {
  user_id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  username: string;
  email_real: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

export default async function UsuariosPage() {
  const perfilActual = await requireMaestro();
  const sb = sbAdmin();

  const [{ data: perfiles }, { data: authList }] = await Promise.all([
    sb.from("perfiles").select("user_id, nombre, rol, activo, created_at").order("created_at", { ascending: true }),
    sb.auth.admin.listUsers({ perPage: 500 }),
  ]);

  const authMap = new Map(authList?.users?.map((u) => [u.id, u]) ?? []);
  const usuarios: UsuarioRow[] = (perfiles ?? []).map((p: any) => {
    const au = authMap.get(p.user_id);
    return {
      user_id: p.user_id,
      nombre: p.nombre,
      rol: p.rol,
      activo: p.activo,
      username: emailToDisplayUsername(au?.email ?? null),
      email_real: au?.email ?? null,
      created_at: p.created_at,
      last_sign_in_at: au?.last_sign_in_at ?? null,
    };
  });

  return <UsuariosClient usuarios={usuarios} currentUserId={perfilActual.user_id} />;
}
