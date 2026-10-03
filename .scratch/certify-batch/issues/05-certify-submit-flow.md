# 05: Certify page submit — upload → send tx → index

**What to build:** the end-to-end action on `/audit/[pda]`: validate the
form → `POST certificate` → build `certify_batch` via the generated client
(hex digest → 32 bytes) → `useSendTransaction` sends it (auditor wallet
signs and pays) → `POST certify` with the signature → success toast and
return to `/audit` with the batch in the certified section showing the
declared findings and an Explorer link. Every step failure aborts cleanly;
a rejected wallet signature records nothing.

**Blocked by:** 03, 04

**Status:** done

- [x] Submit runs the three steps in order with per-step failure states
- [x] Wallet rejection aborts without touching the index
- [x] Success toast + return to workspace; certified batch shows findings + Explorer link (devnet)
- [x] `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm format:check` green
