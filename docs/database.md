# Lithium Passport database contract

## Scope

JuLit registers battery-grade lithium carbonate (`Li₂CO₃`) batches on Solana Devnet. It does not model lithium hydroxide, metallic lithium, cells, or finished batteries. Supabase is a public read index and PDF store, not the authority for production metrics, certification, or settlement. The programme and authenticated Next.js API must implement this contract; these migrations do not implement either application layer.

See [the glossary](../GLOSSARY.md) and [architecture decisions](./adr/).

## Tables

- `companies`: one row per `auth.users.id`, with `name`, `company_type` (`producer`, `auditor`, or `buyer`), an optional `origin_id` binding, and at most one verified wallet. A producer operates exactly one origin, fixed once set; auditors and buyers never carry one. Registration can precede wallet linking. Once linked, the wallet and company type are fixed. A wallet cannot belong to two companies. There are no employee accounts, memberships, invitations, or duplicate user table. See [ADR-0006](./adr/0006-producer-origin-binding-and-company-contracts.md).
- `wallet_link_challenges`: the single-use proof records behind wallet linking: a 32-byte random `nonce`, the account and email it was issued to, the wallet address, the request domain, the issue time, an expiry five minutes later, and the consumption time. Only the server role can read or write them; browsers hold no grants. See [ADR-0005](./adr/0005-wallet-link-challenges-are-single-use.md).
- `company_contracts`: mutual-consent contracts between a producer and an auditor or buyer: statuses `pending`, `accepted`, `revoked`, with `responded_at` set on any decision and one row per producer–counterparty pair. Only accepted contracts scope which counterparties a producer may designate as a batch's auditor or reserved buyer. Each party reads only its own contracts; writes go through the server role.
- `origins`: the origin catalogue — `olaroz` (Olaroz) and `cauchari_olaroz` (Cauchari-Olaroz) — each with `code`, `salar`, the producer display name, shareholders, processing-plant `longitude`/`latitude`, and its published reference block: `capacity_tpa`, `altitude_m` and `water_m3_per_tonne` when a published value exists, `note`, `source_label`, `source_url`. Public read.
- `batches`: one row per PDA, identified publicly by `pda_address`. `(producer_wallet, batch_id)` is unique. `batch_id` occupies 1–32 UTF-8 bytes, matching the Solana seed limit; `LIT-2026-EXAR-02` is a valid example. The same identifier may be used by another producer.

Every participating wallet must belong to a registered, wallet-verified company of the corresponding type. Producer and designated auditor are required. A batch's origin must match the producer's bound origin, and the designated auditor and reserved buyer must hold an accepted `company_contracts` contract with that producer; the index rejects anything else. `reserved_buyer_wallet` is null for spot batches. `buyer_wallet` identifies the actual buyer only after completion. Company records referenced by batches cannot be deleted through cascading account deletion.

## Units and exact values

| Database field                       | Meaning                                     | On-chain representation                |
| ------------------------------------ | ------------------------------------------- | -------------------------------------- |
| `volume_tonnes`                      | Whole metric tonnes of lithium carbonate    | Unsigned `u64`                         |
| `purity_pct`                         | 99.50–100.00%, at most two decimals         | Percentage × 100, integer basis points |
| `water_footprint_m3_per_tonne`       | m³ of water per tonne, at most two decimals | Value × 100 as `u64`                   |
| `carbon_footprint_kg_co2e_per_tonne` | kg CO₂e per tonne, at most two decimals     | Value × 100 as `u64`                   |
| `price_usdc`                         | Total batch quote, at most six decimals     | Value × 1,000,000 as `u64`             |
| `observed_slot`                      | RPC context slot of the indexed snapshot    | Unsigned `u64`                         |

Postgres `numeric` and explicit constraints preserve unsigned values up to `18446744073709551615` and reject excess precision rather than silently rounding. Scaled water/carbon values and prices cannot exceed that integer range. Purity below 99.50% is rejected. Non-finite values, negative values, fractional tonnage, and overflows are rejected.

Do not convert on-chain integers or database decimal values through JavaScript `Number`. Send exact decimal strings when writing through PostgREST. Its JSON numeric responses also require lossless parsing before serializing decimal strings from the API; ordinary `response.json()` can lose precision for large integers. Public passport verification must still use the PDA, not treat a cached JSON number as canonical.

## Audit and simulated purchase

The database uses lowercase statuses corresponding to `Created`, `Audited`, and `Completed`:

- `created`: no sealed digest, audit outcomes, audit signature, or completed purchase.
- `audited`: the PDF SHA-256, `esg_approved`, `eu_regulation_assessment`, and audit transaction signature are required. ESG may be false, and the EU assessment may be `non_conformant`.
- `completed`: all audit fields remain required, plus the actual buyer and completion transaction signature. A reserved batch must be completed by its reserved buyer. Spot batches can be completed by any registered buyer.

Any audited batch can be purchased, including batches with negative findings. The UI must display those findings explicitly. Completion is **simulated settlement**, not a USDC transfer or evidence that funds were received. There is no redundant `is_paid` flag or escrow table.

The state checks validate a snapshot, not blockchain history. The programme must enforce instruction permissions, one-time certification, purchase eligibility and transitions; the API must verify the current PDA rather than trust a requested status, signer, digest, or transaction signature. Server-side cache rebuilding remains possible.

The designated auditor's one PDF supports both ESG findings and evaluation of identified requirements of Regulation (EU) 2023/1542. That evaluation is an attributed declaration, not official EU certification or a claim that a finished battery satisfies the entire regulation. The report must state its assessment scope and evidence.

## PDF storage

The public `audit-certificates` bucket accepts `application/pdf`, with a 50 MiB maximum matching the existing Storage configuration. Certificate paths are content-addressed:

```text
<PDA_ADDRESS>/<lowercase_SHA256_hex>.pdf
```

`audit_certificate_path` is generated from the indexed PDA and digest. It is null before certification. Public file URLs use `/storage/v1/object/public/audit-certificates/<path>`; listing bucket contents is not required for passport access.

The auditor computes SHA-256 locally. The authenticated API must verify the uploader is the batch's designated auditor, recompute the uploaded file digest, and store it at the matching path without upsert before certification. Only confirmed on-chain audit results may populate the index. A stored path does not prove that an object exists or matches the on-chain hash: public verification must hash the downloaded bytes and compare against Solana.

Client insertion, replacement, and deletion are denied by restrictive Storage policies, even if another bucket has a broad permissive policy. Public downloads still work. Server secret keys bypass Storage RLS and must never reach the browser; content addressing does not make off-chain files immutable against a privileged server.

## Authentication and access

1. Supabase Auth creates the company account. The API derives `companies.id` from the verified session, never an arbitrary submitted user ID.
2. The authenticated API creates the company profile. It proves wallet control with a single-use, domain-bound wallet link challenge tied to that account: `POST /api/companies/wallet/challenge` issues a nonce that expires after five minutes, the wallet signs the resulting message, and `POST /api/companies/wallet` rebuilds the message from the stored row, verifies the Ed25519 signature, and consumes the challenge while setting `wallet_address` and `wallet_verified_at` in one transaction (`public.link_company_wallet`, executable only by the server role). Wallet connection alone is not proof of ownership. This also does not verify the company's legal identity or professional accreditation.
3. Wallet signatures authorize Solana instructions independently of the Auth session.
4. The API verifies Devnet, programme ownership, account discriminator, PDA derivation, confirmed transaction success and account data before indexing. It updates `observed_slot` and `indexed_at` from the verified snapshot. Account metadata and user-editable JWT metadata are not authorization sources.

RLS and explicit grants provide public `SELECT` access to batches and origins, including reserved batches and negative audit outcomes. An authenticated company can read only its own company row; anonymous clients cannot read company records. Participant selection goes through the authenticated API, which returns only the necessary company directory fields. The server role can create/update companies and rebuild the batch index. Browsers cannot mutate these tables. Internal trigger functions are outside the exposed schema and use `SECURITY INVOKER` with a fixed empty search path.

The catalogue filters `status = 'audited'`. A partial index supports ordering by `indexed_at DESC, pda_address`; participant and origin foreign keys are indexed. These indexes support the sub-second read target but do not establish an end-to-end latency guarantee.

Public passport URLs are `/batch/<PDA_ADDRESS>`, not bare batch identifiers. QR images and Explorer URLs are derived rather than stored. Explorer links use `https://explorer.solana.com/address/<PDA_ADDRESS>?cluster=devnet`.

## Local migration workflow

```shell
supabase start
supabase migration up --local
supabase migration list --local
supabase test db
supabase db advisors --local --level warn --fail-on warn
```

Use `supabase db reset --local` only for a disposable local database: it deletes local data and replays all migrations. The package scripts wrap the local database tasks: `pnpm db:reset` deletes local data, replays every migration and applies the seed; `pnpm db:seed` re-applies the idempotent seed on its own.

The demo accounts — two producers (Sales de Jujuy → `olaroz`, Minera Exar → `cauchari_olaroz`), one auditor (Auditor Demo) and one buyer (Comprador Demo) — are provisioned by the seed file (`supabase/seed.sql`), which `db reset` applies. Credentials are demo-only: `productor.olaroz@julit.dev`, `productor.cauchari-olaroz@julit.dev`, `auditor@julit.dev` and `comprador@julit.dev`, all with password `julit-demo-2026`. Verify the local demo by code with `pnpm smoke` (with `pnpm dev` running against the local stack): it proves the four demo logins, the producer-registration rejection, a fresh auditor registration, the public origins read, and that re-running the seed changes nothing.

This migration set is deployed to the linked project `sixusybflhwjtoikrecn` (`JuLit`, Postgres 17.11, PostgREST v14.18) through explicit, separately reviewed pushes (`supabase db push --linked`, previewed with `--dry-run`). The provisioned demo producers travel through the same reviewed path with `--include-seed`.

## References

- [Supabase Data API grants and RLS](https://supabase.com/docs/guides/api/securing-your-api)
- [Public Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase wallet authentication](https://supabase.com/docs/guides/auth/auth-web3)
- [European Commission battery regulation overview](https://environment.ec.europa.eu/topics/waste-and-recycling/batteries_en)
