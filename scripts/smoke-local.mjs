#!/usr/bin/env node
// Smoke test for the provisioned demo: proves by code only that
//   1. both provisioned producers sign in with email + password,
//   2. POST /api/companies rejects a producer registration (400),
//   3. POST /api/companies accepts a fresh auditor registration (201),
//   4. the origins catalogue is publicly readable,
//   5. re-running supabase/seed.sql does not change auth/company counts.
//
// Local prerequisites:
//   * supabase start
//   * pnpm dev with the LOCAL Supabase env, e.g.
//       NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
//       NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key> \
//       SUPABASE_SECRET_KEY=<secret key> pnpm dev
//   * pnpm smoke
//
// Against a deployed target, the read-only checks reuse the same script:
//   SMOKE_SUPABASE_URL=... SMOKE_ANON_KEY=... SMOKE_APP_URL=... pnpm smoke
// The fresh-auditor registration (check 3, it writes) and the seed re-run
// (check 5, needs Docker) are skipped for non-local targets.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServerClient } from "@supabase/ssr";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PRODUCER_PASSWORD = "julit-demo-2026";
const PRODUCERS = [
  { email: "productor.olaroz@julit.dev", password: PRODUCER_PASSWORD },
  {
    email: "productor.cauchari-olaroz@julit.dev",
    password: PRODUCER_PASSWORD,
  },
];

function localStatus() {
  try {
    const out = execFileSync("supabase", ["status", "-o", "env"], {
      encoding: "utf8",
    });
    const env = {};
    for (const line of out.split("\n")) {
      const match = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim());
      if (match) env[match[1]] = match[2];
    }
    return env;
  } catch {
    return {};
  }
}

const local = localStatus();
const supabaseUrl = process.env.SMOKE_SUPABASE_URL ?? local.API_URL;
const anonKey = process.env.SMOKE_ANON_KEY ?? local.ANON_KEY;
const appUrl = process.env.SMOKE_APP_URL ?? "http://127.0.0.1:3000";
const isLocalTarget = /^http:\/\/(127\.0\.0\.1|localhost)\b/.test(
  supabaseUrl ?? ""
);

let failed = 0;
function report(ok, name, detail = "") {
  console.log(
    `${ok ? "ok" : "NOT OK"} - ${name}${detail ? ` (${detail})` : ""}`
  );
  if (!ok) failed += 1;
}

if (!supabaseUrl || !anonKey) {
  report(
    false,
    "configuration",
    "Supabase URL/anon key missing; start the local stack or set SMOKE_* vars"
  );
  process.exit(1);
}

const jar = new Map();
const auth = createServerClient(supabaseUrl, anonKey, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (cookies) =>
      cookies.forEach(({ name, value }) => jar.set(name, value)),
  },
});

async function postCompany(body) {
  const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
  const res = await fetch(`${appUrl}/api/companies`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  return { status: res.status };
}

try {
  const res = await fetch(appUrl, { method: "GET" });
  report(res.ok, "app responds", `${appUrl} -> ${res.status}`);
} catch (error) {
  report(false, "app responds", `${appUrl}: ${error.message}`);
}

for (const producer of PRODUCERS) {
  try {
    jar.clear();
    const { data, error } = await auth.auth.signInWithPassword(producer);
    report(
      !error && Boolean(data.session),
      `producer signs in: ${producer.email}`,
      error?.message
    );
  } catch (error) {
    report(false, `producer signs in: ${producer.email}`, error.message);
  }
}

try {
  jar.clear();
  const { error } = await auth.auth.signInWithPassword(PRODUCERS[0]);
  if (error) {
    report(false, "producer registration rejected", error.message);
  } else {
    const { status } = await postCompany({
      name: "Smoke Producer",
      company_type: "producer",
    });
    report(
      status === 400,
      "producer registration rejected",
      `status ${status}`
    );
  }
} catch (error) {
  report(false, "producer registration rejected", error.message);
}

if (!isLocalTarget) {
  console.log(
    "skip - auditor registration check (target is not the local stack)"
  );
} else {
  try {
    jar.clear();
    const email = `smoke-auditor+${Date.now()}@julit.dev`;
    const { data, error } = await auth.auth.signUp({
      email,
      password: PRODUCER_PASSWORD,
    });
    if (error || !data.session) {
      report(
        false,
        "auditor registration accepted",
        error?.message ?? "no session"
      );
    } else {
      const { status } = await postCompany({
        name: "Smoke Auditor",
        company_type: "auditor",
      });
      report(
        status === 201,
        "auditor registration accepted",
        `status ${status}`
      );
    }
  } catch (error) {
    report(false, "auditor registration accepted", error.message);
  }
}

try {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/origins?select=id,code&order=id`,
    { headers: { apikey: anonKey } }
  );
  const rows = await res.json();
  const ok =
    res.ok &&
    Array.isArray(rows) &&
    rows.length === 2 &&
    rows.some((row) => row.id === "olaroz") &&
    rows.some((row) => row.id === "cauchari_olaroz");
  report(ok, "origins catalogue publicly readable", JSON.stringify(rows));
} catch (error) {
  report(false, "origins catalogue publicly readable", error.message);
}

if (!isLocalTarget) {
  console.log("skip - seed re-run check (target is not the local stack)");
} else {
  try {
    const container = execFileSync(
      "docker",
      ["ps", "--filter", "name=supabase_db_", "--format", "{{.Names}}"],
      { encoding: "utf8" }
    )
      .trim()
      .split("\n")[0];
    const countQuery =
      "select (select count(*) from auth.users where email like 'productor.%@julit.dev')" +
      " || ':' || (select count(*) from auth.identities i join auth.users u on u.id = i.user_id" +
      " where u.email like 'productor.%@julit.dev')" +
      " || ':' || (select count(*) from public.companies" +
      " where name in ('Sales de Jujuy','Minera Exar'));";
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
    const before = psql(["-t", "-A", "-c", countQuery]).trim();
    psql(
      ["-v", "ON_ERROR_STOP=1", "-q"],
      readFileSync(join(root, "supabase", "seed.sql"), "utf8")
    );
    const after = psql(["-t", "-A", "-c", countQuery]).trim();
    report(
      before === "2:2:2" && after === before,
      "seed re-run leaves counts unchanged",
      `${before} -> ${after}`
    );
  } catch (error) {
    report(false, "seed re-run leaves counts unchanged", error.message);
  }
}

console.log(failed === 0 ? "smoke: PASS" : `smoke: FAIL (${failed})`);
process.exit(failed === 0 ? 0 : 1);
