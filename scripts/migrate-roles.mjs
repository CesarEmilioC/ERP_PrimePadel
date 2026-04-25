// Imprime el SQL necesario para migrar al esquema de tres roles.
// Por restricciones de Supabase, las operaciones DDL (alter table) deben
// ejecutarse desde el SQL Editor del dashboard, no desde el cliente JS.
//
// Uso:
//   node scripts/migrate-roles.mjs
//
// Después de ejecutar el SQL en Supabase, corre:
//   node scripts/setup-cuentas-cliente.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sqlPath = resolve(process.cwd(), "supabase/migrations/001_tres_roles.sql");
const sql = readFileSync(sqlPath, "utf8");

console.log("\n============================================================");
console.log("  Migración: pasar a tres roles (maestro, admin, recepcion)");
console.log("============================================================\n");
console.log("Pasos:\n");
console.log("  1. Abre tu proyecto en https://supabase.com → SQL Editor → New query");
console.log("  2. Pega el siguiente SQL y dale Run:\n");
console.log("------------------------------------------------------------");
console.log(sql.trim());
console.log("------------------------------------------------------------\n");
console.log("  3. Cuando termine, ejecuta:\n");
console.log("       node scripts/setup-cuentas-cliente.mjs\n");
console.log("  Esto creará los usuarios recepcion1, recepcion2 y admin con sus contraseñas.\n");
