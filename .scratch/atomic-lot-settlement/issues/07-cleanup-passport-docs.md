# 07: Cleanup — delete audit surface, passport timeline, docs

**What to build:** the retired model leaves no dead surface and the public passport tells the new story. `/audit/*` pages deleted; `/certify`, `/certificate`, `/complete` endpoints deleted; any audit remnants in schema/types removed. The public passport renders the lot lifecycle timeline — mint, funding, redemption or timeout claim, dispute flags — with links to each tx and plant certificate verification. `docs/features/*.feature` are rewritten for the new lifecycle; prior specs marked superseded. No landing changes.

**Blocked by:** 04 — Redeem end-to-end; 05 — Timeout claim and dispute; 06 — Cancel lot

**Status:** ready-for-agent

- [x] `/audit/*` routes and components deleted; no references remain
- [x] `/certify`, `/certificate`, `/complete` endpoints deleted
- [x] No auditor/audit types, columns, or vocabulary anywhere in app or schema
- [x] Passport shows full timeline incl. `claimed`/`disputed`/`cancelled`, tx links, plant cert check
- [x] Every signature in the app is a real transaction — no fake base58 remains
- [x] Features rewritten; prior feature specs marked superseded
- [x] Full suite green: LiteSVM + vitest + pgTAP
