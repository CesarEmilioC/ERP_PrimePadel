import { getCurrentProfile } from "@/lib/auth";
import { NavClient } from "./nav-client";

export async function Nav() {
  const perfil = await getCurrentProfile();
  if (!perfil) return null;
  return <NavClient perfil={perfil} />;
}
