// Crea el primer usuario administrador del sistema.
// Uso:
//   node scripts/create-admin.mjs --email admin@club.com --nombre "Cesar Emilio" [--password "clave123"]
//
// Si no se pasa --password, se genera una aleatoria y se imprime al final.

import { getAdminClient } from "./lib/supabase.mjs";

const args = process.argv.slice(2);

function getArg(flag) {
  const i = args.indexOf(flag);
  if (i === -1) return null;
  return args[i + 1] ?? null;
}

const email = getArg("--email");
const nombre = getArg("--nombre");
let password = getArg("--password");
const rol = getArg("--rol") ?? "admin";

if (!email || !nombre) {
  console.error("❌ Faltan argumentos.");
  console.error('   Uso: node scripts/create-admin.mjs --email admin@club.com --nombre "Cesar Emilio" [--password "clave"]');
  process.exit(1);
}

if (!["admin", "cajero"].includes(rol)) {
  console.error("❌ --rol debe ser 'admin' o 'cajero'.");
  process.exit(1);
}

function generatePassword() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += charset[Math.floor(Math.random() * charset.length)];
  return pw;
}

if (!password) password = generatePassword();

async function run() {
  const sb = getAdminClient();

  console.log(`Creando usuario ${email}...`);

  const { data: existing } = await sb.auth.admin.listUsers({ perPage: 200 });
  const prev = existing?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId;

  if (prev) {
    console.log(`  Usuario ya existe en auth (${prev.id}). Actualizando contraseña y confirmando email...`);
    userId = prev.id;
    const { error } = await sb.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (error) throw error;
  } else {
    const { data: created, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (error) throw error;
    userId = created.user.id;
    console.log(`  ✅ Usuario auth creado: ${userId}`);
  }

  // Upsert perfil
  const { error: e2 } = await sb.from("perfiles").upsert({
    user_id: userId,
    nombre,
    rol,
    activo: true,
  });
  if (e2) throw e2;

  console.log("\n============================================================");
  console.log("✅ Usuario listo para ingresar.");
  console.log("============================================================");
  console.log(`   Email:      ${email}`);
  console.log(`   Contraseña: ${password}`);
  console.log(`   Nombre:     ${nombre}`);
  console.log(`   Rol:        ${rol}`);
  console.log("============================================================\n");
}

run().catch((e) => {
  console.error("❌ Error:", e.message ?? e);
  process.exit(1);
});
