// Cliente Supabase con service role para scripts de migración.
// Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // sin .env.local → asumimos variables exportadas en el shell.
  }
}

export function getAdminClient() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (rotar si fue expuesta, luego pegar la nueva)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
