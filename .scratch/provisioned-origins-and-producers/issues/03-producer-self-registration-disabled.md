# 03: Producer self-registration disabled

**What to build:** Producer accounts can no longer be created from the application: sign-up and company onboarding offer only Auditor and Buyer (Auditor preselected), and the company registration API rejects `producer` with a Spanish user-facing message. Auditor and Buyer registration behave exactly as before.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The shared company fields form offers only Auditor and Buyer, with Auditor preselected, in both sign-up and company onboarding.
- [ ] The company registration API returns 400 for `producer` (session required first, as today), 201 for a fresh auditor, 409 unchanged when the account already has a company, and 401 unchanged without a session.
- [ ] Producer label and description remain defined for display purposes (account page, session menu), and the database company-type enum still includes producer.
- [ ] The company account feature file gains both scenarios: producer type not offered (@ui) and producer registration rejected (@api).
- [ ] Build and lint pass.
