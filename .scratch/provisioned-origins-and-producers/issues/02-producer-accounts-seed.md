# 02: Provisioned producer accounts seed

**What to build:** An idempotent seed provisions the two Producer Company Accounts — Sales de Jujuy for Olaroz and Minera Exar for Cauchari-Olaroz — with working email and password login, one `companies` row each (type producer, no Verified Wallet) and nothing else. The seed applies locally through the reset workflow, and the credentials are documented as demo-only.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Reset applies the seed: two Supabase Auth accounts with confirmed emails plus identities rows so password login works; two producer companies with null wallet and null verification timestamp.
- [ ] Credentials exactly as specified: `productor.olaroz@julit.dev` and `productor.cauchari-olaroz@julit.dev`, password `julit-demo-2026`, documented as demo-only.
- [ ] Re-running the seed file leaves user, identity and company counts unchanged (fully idempotent).
- [ ] Both accounts obtain a session through a password grant against the local auth endpoint (curl-based check by code only).
- [ ] The local seed workflow is documented, including the linked-project command used by the rollout ticket.
