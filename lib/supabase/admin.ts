import { createClient } from "@supabase/supabase-js";

// Cliente admin: usa service role key. SOLO server-side (route handlers / server actions / scripts).
// Nunca importar desde componentes del cliente.
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurado");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
