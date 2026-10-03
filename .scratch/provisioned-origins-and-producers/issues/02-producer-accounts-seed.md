# 02: Provisioned producer accounts seed

**What to build:** An idempotent seed provisions the two Producer Company Accounts — Sales de Jujuy for Olaroz and Minera Exar for Cauchari-Olaroz — with working email and password login, one `companies` row each (type producer, bound to its origin, no Verified Wallet) and nothing else. The seed applies locally through the reset workflow, and the credentials are documented as demo-only.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Reset applies the seed: two Supabase Auth accounts with confirmed emails plus identities rows so password login works; two producer companies bound to their origins (`olaroz`, `cauchari_olaroz`) with null wallet and null verification timestamp.
- [x] Credentials exactly as specified: `productor.olaroz@julit.dev` and `productor.cauchari-olaroz@julit.dev`, password `julit-demo-2026`, documented as demo-only.
- [x] Re-running the seed file leaves user, identity and company counts unchanged (verified `2:2:2` before and after a full seed re-run).
- [x] Both accounts obtain a session through a password grant against the local auth endpoint (by code only).
- [x] The local seed workflow is documented, including the linked-project `--include-seed` command used by the rollout ticket.

## Comments

Delivered `supabase/seed.sql`. Direct `auth.users` inserts needed the token columns as empty strings and identity timestamps set, or GoTrue fails the login scan; both fixed and covered by `pnpm smoke`. Producers are seeded already bound to their origin (ADR-0006).
