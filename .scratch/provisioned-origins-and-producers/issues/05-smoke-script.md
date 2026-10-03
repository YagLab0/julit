# 05: Permanent smoke script

**What to build:** One script in the repository's scripts directory, runnable against the local stack, proves by code only that the demo's critical path holds: both provisioned producers obtain a password session, producer registration is rejected (400), a fresh auditor registration succeeds (201), the origins catalogue is publicly readable, and re-running the seed does not change user or company counts. Any failure exits non-zero.

**Blocked by:** 02 — Provisioned producer accounts seed; 03 — Producer self-registration disabled.

**Status:** done

- [x] Built on Node's built-in fetch plus the already-installed Supabase libraries; no new test framework is added.
- [x] Checks: password sessions for both seeded producers; producer registration returns 400; a fresh auditor registration returns 201; re-running the seed leaves the `2:2:2` user/identity/company counts unchanged; origins read anonymously.
- [x] Every failure exits non-zero with a clear message; `pnpm smoke` runs it green against the local stack.
- [x] Against deployed targets through `SMOKE_*` variables the read-only checks reuse (producer sign-ins, rejection check, origins read); the fresh-auditor registration and the seed re-run are skipped for non-local targets.

## Comments

Delivered `scripts/smoke-local.mjs` plus the `pnpm smoke` entry. Verified end-to-end against a local-wired production build (`next start` on port 3100, since Next 16 refuses a second `next dev` for the same directory): all checks passed. Cookie sessions reuse `@supabase/ssr` so the app's server client accepts them. Each run adds one throwaway `smoke-auditor+<ts>@julit.dev` account locally.
