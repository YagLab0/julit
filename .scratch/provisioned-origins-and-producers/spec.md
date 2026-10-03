## Problem Statement

JuLit's demonstration revolves around two real Origins — Olaroz (Salar de Olaroz) and Cauchari-Olaroz (Salar de Cauchari). Today the database stores only an identifier and a display name for each: the mine metadata (code, salar, operating Producer, shareholders, processing-plant coordinates, capacity, altitude, water-footprint reference and cited sources) lives hardcoded in the frontend demo data. Any visitor can self-register as a Producer even though only these two Origins exist and each is operated by exactly one producer. The two Producer companies, Sales de Jujuy and Minera Exar, have no accounts, so nobody can sign in as them. And the frontend ships simulated Batches — prices, report digests, event histories, purity figures — that exist nowhere, so the UI presents invented records with the same visual weight as verifiable data.

## Solution

Make the database the single source of truth for the two Origins and their metadata, and treat Producer accounts as provisioned data rather than self-registrations: an idempotent seed provisions one producer Company Account per Origin (Verified Wallet not linked yet), sign-up and company onboarding stop offering the producer type, and the company registration API rejects it. The map reads Origins from Supabase through the anonymous client. All simulated Batch content is deleted and batch-dependent views stay empty until the on-chain programme and indexing API exist. The decisions are recorded in ADR-0006.

## User Stories

1. As a visitor, I want sign-up to offer only Auditor and Buyer types, so I cannot create a Producer account that corresponds to no real Origin.
2. As a visitor, I want the company onboarding form (signed in without a profile) to offer the same restricted types, so the registration policy is consistent everywhere.
3. As an auditor or buyer, I want to register with my type and reach my account page, so I can take part in certifications and purchases.
4. As a client calling the company registration API directly, I want the producer type rejected with a clear message, so the policy does not depend on the UI.
5. As the operator of the Olaroz Producer account, I want to sign in with my provisioned credentials, so I can access Sales de Jujuy's company account in the demo.
6. As the operator of the Cauchari-Olaroz Producer account, I want the same for Minera Exar.
7. As a provisioned Producer, I want my account to show my company name and type with no Verified Wallet yet, so I understand the pending step.
8. As a provisioned Producer, I want to link my own Devnet wallet later through the existing challenge flow, so batch authority stays with a wallet I control.
9. As a demo operator, I want a seed that creates exactly one producer account per Origin and nothing else, so the demo starts from the two real producers.
10. As a demo operator, I want the seed to be idempotent, so re-applying it never duplicates accounts or destroys data.
11. As a demo operator, I want the same seed to reach the linked project through a reviewed CLI push, so the accounts exist in the environment the demo targets.
12. As a visitor, I want the map to show both Origins with their real metadata even without a session, so the demo's claims are attributable to sources.
13. As a visitor, I want to see per Origin the producer, shareholders, capacity, altitude when published, water-footprint reference when published, a note, and the source label and link, so every figure is traceable.
14. As a visitor, I want no simulated Batch anywhere in the UI, so nothing presents invented records as real.
15. As a visitor, I want batch sections to appear empty rather than fabricated, so "no data yet" is honest and clear.
16. As a developer, I want the Cauchari-Olaroz identifier to be `cauchari-olaroz` everywhere (database, app, geographic reference), so no id translation exists.
17. As a developer, I want the former identifier `cauchari_olaroz` to no longer exist, so no stale references survive.
18. As a developer, I want the frontend's static data to keep only real geographic references (salar polygons, export routes and ports, with attribution) and no Origin or Batch records, so mock drift is impossible.
19. As a maintainer, I want the database contract and feature files updated to the new Origins shape, the seed workflow and the registration policy, so documentation matches the system.
20. As a reviewer, I want the provisioning decision recorded in an ADR, so it is not accidentally reopened.
21. As a maintainer, I want one smoke command that proves both producers can log in and producer self-registration is rejected, so the demo environment can be validated by code only.
22. As a maintainer, I want database behavior tests covering the enriched Origins and the identifier rename, so regressions are caught at the existing test seam.
23. As a visitor, I want the map and list views to render Origins gracefully with zero Batches, so the app works end to end before the index exists.
24. As an auditor or buyer, I want Producer labels and descriptions to remain visible where company types are displayed, so nothing else degrades.
25. As a maintainer, I want the producer type to remain part of the domain model (Batches still require a producer participant), so provisioning does not remove the concept.
26. As a demo operator, I want the seed credentials documented as demo-only, so they are never mistaken for production identities.

## Implementation Decisions

### Data model: Origins become the mine catalogue

- `origins` gains explicit columns; nullability is reserved for references without a published value. Public read (anonymous and authenticated) is unchanged.

```sql
name text not null                      -- short display name
code text not null unique               -- 'OLZ', 'EXAR'
salar text not null
producer text not null                  -- display name of the operating Producer
shareholders text not null              -- display string; Spanish formatting preserved
longitude numeric(8,5) not null         -- processing plant; between -180 and 180
latitude numeric(8,5) not null          -- processing plant; between -90 and 90
capacity_tpa integer not null           -- check: > 0
altitude_m integer                      -- null when no published value
water_m3_per_tonne numeric              -- reference value; null when no published value
note text not null
source_label text not null
source_url text not null
```

- Row values (verbatim from the demo data module being deleted):
  - Olaroz: name "Olaroz"; code "OLZ"; salar "Salar de Olaroz"; producer "Sales de Jujuy"; shareholders "Rio Tinto 66,5 % · Toyota Tsusho 25 % · JEMSE 8,5 %"; plant longitude -66.70248, latitude -23.46293; capacity 42,500 tpa; altitude 3,900 m; water footprint 51.0 m³/t; note "Huella hídrica publicada: 51,0 m³/t Li₂CO₃ (Díaz Paz et al., Heliyon 2025)."; source "Rio Tinto 20-F FY2025" — https://www.sec.gov/Archives/edgar/data/863064/000162828026009531/rio-20251231.htm
  - Cauchari-Olaroz: name "Cauchari-Olaroz"; code "EXAR"; salar "Salar de Cauchari"; producer "Minera Exar"; shareholders "Ganfeng Lithium · Lithium Argentina · JEMSE"; plant longitude -66.77329, latitude -23.67394; capacity 40,000 tpa; altitude null; water footprint null; note "Producción 2025: ~34.100 t de carbonato de litio. Sin huella hídrica publicada con la misma metodología."; source "Cauchari-Olaroz SK 1300 Technical Report 2026" — https://www.sec.gov/Archives/edgar/data/1440972/000110465926032465/tm269254d1_ex99-1.htm
  - Nulls are deliberate: no invented values for unpublished references.
- Identifier normalization: one new migration renames `cauchari_olaroz` → `cauchari-olaroz`; applied migrations are never edited. The rename was safe at planning time (the linked project's Batches table was empty, verified through the public API), and no id translation exists anywhere afterwards.

### Provisioning: idempotent seed

- The Supabase seed file creates two Supabase Auth accounts with fixed ids, confirmed emails and working password login (users plus identities rows), each with a `companies` row: type `producer`, names "Sales de Jujuy" and "Minera Exar", no wallet and no verification timestamp.
- Credentials: `productor.olaroz@julit.dev` and `productor.cauchari-olaroz@julit.dev`, password `julit-demo-2026`; documented as demo-only.
- Re-running the seed never duplicates rows and never overwrites existing data.
- Application: locally through `db reset`; the linked project through the reviewed `db push --include-seed` path (dry-run first). The flag's exact re-run semantics are verified during implementation; the seed is safe to re-run regardless.

### Registration policy

- Company registration API contract: session required (401 unchanged); non-empty name required (400 unchanged); only `auditor` and `buyer` accepted — `producer` returns 400 with a Spanish user-facing message; an existing company returns 409 unchanged; success returns 201 with the company row.
- The shared company fields component offers Auditor and Buyer only, Auditor preselected, in both sign-up and onboarding. Producer labels and descriptions stay defined because the account and session UI display them.
- No database restriction is added: the company type enum keeps `producer` (Batches require a producer participant), only the server role writes companies, and no company-type update path exists to guard.

### Frontend data flow

- The demo batches view loads Origins from Supabase with the anonymous client (existing public read), with explicit loading and error states.
- Every simulated Batch fixture and every surface that rendered only invented batch content (prices, event histories, report digests and links, purity comparisons) is deleted; Origin summaries degrade to empty/zero until the index API exists.
- The frontend's static data module keeps only real geographic reference (salar polygons from OSM, other salares, export routes and ports, with sources) and contains no Origin or Batch records.

### Documentation

- The database contract gains the Origins catalogue shape, the seed/remote workflow and the registration policy.
- The company account feature file gains scenarios: the producer type is not offered (@ui) and producer registration is rejected by the API (@api).
- ADR-0006 records the provisioning and no-mock decisions.

## Testing Decisions

- Tests assert externally observable behavior — stored rows, constraint failures, HTTP status codes, issued sessions — never internal helpers, source text or rendered markup. They are deterministic, isolated and safe in a full run.
- pgTAP (existing seam; run through the documented local workflow; prior art: the existing database test files): cover both Origins with the exact values above, the absence of `cauchari_olaroz`, anonymous select on origins, and a server-role Batch insert referencing `cauchari-olaroz` (rename plus foreign key).
- Permanent smoke script (new seam, decided): a Node script using built-in fetch and the already-installed Supabase libraries, kept in the repository's scripts directory. Against the local stack it proves: both provisioned producers obtain a password session; producer registration is rejected (400); a fresh auditor registration succeeds (201); re-running the seed leaves auth-user and company counts unchanged. It exits non-zero on failure and doubles as read-only validation of the linked project after the reviewed push.
- UI has no automated seam (decided): verified through the production build, lint and the seams above; the map's visual limitation is reported in the implementation notes. Feature files document behavior but do not execute.
- The documented database advisors gate runs with the local workflow.

## Out of Scope

- Anchor programme, on-chain instructions, the Batch indexing API, and any Batch UI for real data; they arrive with the index.
- The wallet link challenge flow is unchanged; provisioned producers link their own wallets when the batch stage needs it.
- Moving salar polygons, routes or ports into the database.
- Self-service onboarding of new Origins or Producers; provisioning stays explicit by design.
- Production authentication hardening; seeded credentials are demo-only.
- Executing the reviewed remote push is a separate manual step, as the database contract requires.

## Further Notes

- Vocabulary follows the glossary: Origin (never "mine") in code, database and documentation; "mine" remains informal conversation language.
- Planning checks against the linked project: `origins` holds exactly the two expected rows; `batches` is empty, which made the identifier rename safe.
- One producer per Origin stays a seed convention (company names match the Origin `producer` value), not a database constraint: with producer self-registration removed and only the server role writing companies, no third producer can appear through the application.
- The producer type remains part of the domain model even though it is not self-registerable.

