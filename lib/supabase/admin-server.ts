import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente server-side con service role key. Solo usar en Server Components,
// Server Actions y Route Handlers — nunca importar desde código que corra en navegador.
// TODO: al agregar auth (fase RBAC) reemplazar por createSupabaseServerClient y usar RLS.
//
// Nota de tipos: devolvemos `SupabaseClient<any, any, any>` para permitir operaciones
// sobre tablas sin tipos generados. Generaremos tipos con `supabase gen types typescript`
// en una fase posterior.

let cached: SupabaseClient<any, any, any> | null = null;

export function sbAdmin(): SupabaseClient<any, any, any> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables de entorno de Supabase");
  cached = createClient<any, any, any>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
