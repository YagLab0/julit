#!/usr/bin/env node
// Applies supabase/seed.sql to the local Supabase database (idempotent).
// Requires the local stack (`supabase start`); talks through the Docker
// container, so no host psql is needed.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const container = execFileSync(
  "docker",
  ["ps", "--filter", "name=supabase_db_", "--format", "{{.Names}}"],
  { encoding: "utf8" }
)
  .trim()
  .split("\n")
  .filter(Boolean)[0];

if (!container) {
  console.error(
    "No local Supabase database container found. Run `supabase start` first."
  );
  process.exit(1);
}

const psql = (args, input) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      ...args,
    ],
    { input, encoding: "utf8" }
  );

psql(
  ["-v", "ON_ERROR_STOP=1", "-q"],
  readFileSync(join(root, "supabase", "seed.sql"), "utf8")
);

const accounts = psql([
  "-t",
  "-A",
  "-c",
  "select count(*) from public.companies where name in ('Sales de Jujuy','Minera Exar','Auditor Demo','Comprador Demo');",
]).trim();

console.log(`seed applied to ${container} (demo accounts: ${accounts})`);
