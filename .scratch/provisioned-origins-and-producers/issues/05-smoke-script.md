# 05: Permanent smoke script

**What to build:** One script in the repository's scripts directory, runnable against the local stack, proves by code only that the demo's critical path holds: both provisioned producers obtain a password session, producer registration is rejected (400), a fresh auditor registration succeeds (201), and re-running the seed does not change user or company counts. Any failure exits non-zero.

**Blocked by:** 02 — Provisioned producer accounts seed; 03 — Producer self-registration disabled.

**Status:** ready-for-agent

- [ ] Built on Node's built-in fetch plus the already-installed Supabase libraries; no new test framework is added.
- [ ] Checks: password sessions for both seeded producers; producer registration returns 400; a fresh auditor registration returns 201; re-running the seed leaves user, identity and company counts unchanged.
- [ ] Every failure exits non-zero with a clear message; a documented command runs it green against the local stack.
- [ ] Read-only checks (origins and company rows) are reusable against the linked project after the rollout.
