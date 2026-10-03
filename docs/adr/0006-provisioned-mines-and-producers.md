# Provisioned mines and producers

JuLit's demonstration covers exactly two origins: Olaroz, produced by Sales de Jujuy, and Cauchari-Olaroz, produced by Minera Exar. Until now `origins` stored only an id and a name, the mine metadata lived in the frontend demo data (`app/batches/data/points.ts`), and sign-up offered the producer type to any visitor.

Origins become the mine catalogue. Each `origins` row carries the mine's short name, `code`, `salar`, the producer's display name, shareholders, processing-plant coordinates, and reference data: capacity, altitude, water-footprint reference, a note, and its source label and URL. The columns are explicit, nullable where a mine lacks a published value, and keep public read access. The Cauchari-Olaroz id is normalized to `cauchari-olaroz`, the slug the demo already used, so no id translation exists anywhere.

Producer accounts are provisioned, not self-registered: sign-up and company onboarding offer only auditor and buyer, and `POST /api/companies` rejects the producer type. The two producer companies are seeded one per origin, named after the origin's producer. The one-producer-per-origin rule stays a convention — no foreign key links `companies` to `origins` — because producer self-registration is gone and only the server role writes companies.

`supabase/seed.sql` creates both accounts idempotently with fixed ids, email and password, and no linked wallet. Each producer proves wallet ownership later through the [ADR-0005](./0005-wallet-link-challenges-are-single-use.md) challenge flow before registering batches. The seed runs on `supabase db reset` locally and against the linked project through `supabase db push --include-seed`.

The demo map reads origins from Supabase (anonymous `SELECT`, unchanged RLS). The frontend ships no simulated batches: `SEED_BATCHES`, prices, event histories, report digests and demo report links are removed, and batch-dependent views stay empty until the on-chain programme and indexing API exist. `points.ts` keeps only real geographic reference data — salar polygons and export routes with their sources — never mine or batch records.

Consequences: adding or replacing a mine means migrating `origins` and extending the seed — intended for a fixed two-mine demonstration, not self-service onboarding. Origin metadata has one source of truth, and the frontend cannot drift from the database. A producer account can only come from provisioning; wallet linking itself is unchanged. Nothing in the UI presents unverifiable batch data as real.
