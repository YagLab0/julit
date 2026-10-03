# 03: Producer self-registration disabled

**What to build:** Producer accounts can no longer be created from the application: sign-up and company onboarding offer only Auditor and Buyer (Auditor preselected, no origin picker), and the company registration API rejects `producer` with a Spanish user-facing message. Auditor and Buyer registration behave exactly as before.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The shared company fields form offers only Auditor and Buyer, with Auditor preselected, in both sign-up and company onboarding; the origin selector is gone from both.
- [x] The company registration API returns 400 for `producer` (session required first, as today), 201 for a fresh auditor, 409 unchanged when the account already has a company, and 401 unchanged without a session.
- [x] Producer label and description remain defined for display purposes (account page, session menu), and the database company-type enum still includes producer.
- [x] The company account feature file gains both scenarios: producer type not offered (@ui) and producer registration rejected (@api).
- [x] The one-time origin-binding route and its account card are deleted (clean cutover); build and smoke pass.

## Comments

Per explicit decision during merge reconciliation, the spec won over the parallel producer-sign-up flow: `/api/companies/origin` and the account binding card are deleted. Evidence: `pnpm smoke` shows producer registration → 400 and a fresh auditor → 201 against a local-wired build; `pnpm build` green.
