# Lithium Passport database contract

## Scope

JuLit registers battery-grade lithium carbonate (`Li₂CO₃`) lots on Solana Devnet, each with a designated buyer and escrowed payment. It does not model lithium hydroxide, metallic lithium, cells, or finished batteries. Supabase is a public read index and PDF store, not the authority for production metrics, certification, or settlement. The programme and authenticated Next.js API must implement this contract; these migrations do not implement either application layer.

See [the glossary](../GLOSSARY.md) and [architecture decisions](./adr/).

## Tables

- `companies`: one row per `auth.users.id`, with `name`, `company_type` (`producer` or `buyer`), an optional `origin_id` binding, and at most one verified wallet. A producer operates exactly one origin, fixed once set; buyers never carry one. Registration can precede wallet linking. Once linked, the wallet and company type are fixed. A wallet cannot belong to two companies. There are no employee accounts, memberships, invitations, or duplicate user table. Producer rows may carry a Production Specification — `purity_pct`, `water_footprint_m3_per_tonne`, `carbon_footprint_kg_co2e_per_tonne` — provisioned by the operator, all three set or all three null, with the same scale and range checks as `lots`. See [ADR-0006](./adr/0006-producer-origin-binding-and-company-contracts.md) and [ADR-0020](./adr/0020-lot-specs-come-from-the-producer-record.md).
- `wallet_link_challenges`: the single-use proof records behind wallet linking: a 32-byte random `nonce`, the account and email it was issued to, the wallet address, the request domain, the issue time, an expiry five minutes later, and the consumption time. Only the server role can read or write them; browsers hold no grants. See [ADR-0005](./adr/0005-wallet-link-challenges-are-single-use.md).
- `company_contracts`: mutual-consent contracts between exactly one producer and one buyer: statuses `pending`, `accepted`, `revoked`, with `responded_at` set on any decision and one row per producer–buyer pair. Either side may initiate; `initiator_id` records who offered. Only accepted contracts scope which buyers a producer may designate for a lot. Each party reads only its own contracts; writes go through the server role.
- `origins`: the origin catalogue — `pena_blanca` (Salar de Peña Blanca, `PBL`) and `condor` (Salar del Cóndor, `CNR`) — each with `code`, `salar`, the producer display name, shareholders, processing-plant `longitude`/`latitude`, and its reference block: `capacity_tpa`, `altitude_m` and `water_m3_per_tonne` when a value exists, `note`, `source_label`, `source_url`. Mine names, producer names, shareholders and sources are fictional; the salar polygons, plant coordinates and capacity figures keep the geographic reference values the demo stands on. Public read.
- `lots`: one row per PDA, identified publicly by `pda_address`. `(producer_wallet, lot_id)` is unique. `lot_id` occupies 1–32 UTF-8 bytes, matching the Solana seed limit; `LIT-2026-PBL-02` is a valid example. The same identifier may be used by another producer.

Every participating wallet must belong to a registered, wallet-verified company of the corresponding type. Producer and designated buyer are required. A lot's origin must match the producer's bound origin, and the designated buyer must hold an accepted `company_contracts` contract with that producer; the index rejects anything else. `buyer_wallet` is fixed at creation — only that wallet may fund the escrow. Company records referenced by lots cannot be deleted through cascading account deletion.

## Units and exact values

| Database field                       | Meaning                                     | On-chain representation                |
| ------------------------------------ | ------------------------------------------- | -------------------------------------- |
| `volume_tonnes`                      | Whole metric tonnes of lithium carbonate    | Unsigned `u64`                         |
| `purity_pct`                         | 99.50–100.00%, at most two decimals         | Percentage × 100, integer basis points |
| `water_footprint_m3_per_tonne`       | m³ of water per tonne, at most two decimals | Value × 100 as `u64`                   |
| `carbon_footprint_kg_co2e_per_tonne` | kg CO₂e per tonne, at most two decimals     | Value × 100 as `u64`                   |
| `price_usdc`                         | Total lot quote, at most six decimals       | Value × 1,000,000 as `u64`             |
| `observed_slot`                      | RPC context slot of the indexed snapshot    | Unsigned `u64`                         |

Postgres `numeric` and explicit constraints preserve unsigned values up to `18446744073709551615` and reject excess precision rather than silently rounding. Scaled water/carbon values and prices cannot exceed that integer range. Purity below 99.50% is rejected. Non-finite values, negative values, fractional tonnage, and overflows are rejected.

Do not convert on-chain integers or database decimal values through JavaScript `Number`. Send exact decimal strings when writing through PostgREST. Its JSON numeric responses also require lossless parsing before serializing decimal strings from the API; ordinary `response.json()` can lose precision for large integers. Public passport verification must still use the PDA, not treat a cached JSON number as canonical.

## Lot lifecycle

The database uses lowercase statuses mirroring the on-chain `LotStatus` enum:

- `listed`: the lot exists on-chain with its Digital Title in escrow; no funding yet.
- `funded`: the designated buyer deposited the full `price_usdc` into the lot PDA's USDC escrow; `fund_tx_signature` is required.
- `disputed`: the buyer froze a funded lot; `dispute_tx_signature` is required and the claim clock pauses. v1 has no on-chain resolution or refund — the only exits are buyer-signed redemption or an agreed path implemented later.
- `redeemed`: the buyer confirmed receipt; the NFT burned and escrowed USDC released to the producer minus the protocol fee; `redeem_tx_signature` is required.
- `claimed`: the producer collected escrowed funds after `claimable_after` because the buyer never confirmed; `claim_tx_signature` is required.
- `cancelled`: the producer withdrew the lot before any funding; `cancel_tx_signature` is required.

Funding, redemption, timeout claims, disputes and cancellation are real USDC escrow movements on Devnet — not simulated settlement. The state checks validate a snapshot, not blockchain history. The programme must enforce instruction permissions, status transitions and escrow custody; the API must verify the current PDA rather than trust a requested status, signer, digest, or transaction signature. Server-side cache rebuilding remains possible.

The producer's plant certificate is declared at lot creation as `plant_cert_sha256`. It is a plant-level document, not a per-lot audit: the declaration is attributed to the producer, not an independent attestation.

## PDF storage

The public `plant-certificates` bucket accepts `application/pdf`, with a 50 MiB maximum matching the existing Storage configuration. Certificate paths are content-addressed:

```text
<PRODUCER_WALLET>/<lowercase_SHA256_hex>.pdf
```

`plant_certificate_path` is generated from the producer wallet and digest. Public file URLs use `/storage/v1/object/public/plant-certificates/<path>`; listing bucket contents is not required for passport access.

The producer uploads the PDF through the authenticated API before creating the lot; the server recomputes the SHA-256 and stores the file content-addressed, so the digest declared on-chain provably matches the stored certificate. A stored path does not prove that an object exists or matches the on-chain hash: public verification must hash the downloaded bytes and compare against Solana.

Client insertion, replacement, and deletion are denied by restrictive Storage policies, even if another bucket has a broad permissive policy. Public downloads still work. Server secret keys bypass Storage RLS and must never reach the browser; content addressing does not make off-chain files immutable against a privileged server.

## Authentication and access

1. Supabase Auth creates the company account. The API derives `companies.id` from the verified session, never an arbitrary submitted user ID.
2. The authenticated API creates the company profile. It proves wallet control with a single-use, domain-bound wallet link challenge tied to that account: `POST /api/companies/wallet/challenge` issues a nonce that expires after five minutes, the wallet signs the resulting message, and `POST /api/companies/wallet` rebuilds the message from the stored row, verifies the Ed25519 signature, and consumes the challenge while setting `wallet_address` and `wallet_verified_at` in one transaction (`public.link_company_wallet`, executable only by the server role). Wallet connection alone is not proof of ownership. This also does not verify the company's legal identity or professional accreditation.
3. Wallet signatures authorize Solana instructions independently of the Auth session.
4. The API verifies Devnet, programme ownership, account discriminator, PDA derivation, confirmed transaction success and account data before indexing. It updates `observed_slot` and `indexed_at` from the verified snapshot. Account metadata and user-editable JWT metadata are not authorization sources.

RLS and explicit grants provide public `SELECT` access to lots and origins. An authenticated company can read only its own company row; anonymous clients cannot read company records. Participant selection goes through the authenticated API, which returns only the necessary company directory fields. The server role can create/update companies and rebuild the lot index. Browsers cannot mutate these tables. Internal trigger functions are outside the exposed schema and use `SECURITY INVOKER` with a fixed empty search path.

The public origin fiche reads the indexed lots of its origin, newest first (`indexed_at DESC`), and labels each status. A partial index on listed lots supports ordering by `indexed_at DESC, pda_address`; participant and origin foreign keys are indexed. These indexes support the sub-second read target but do not establish an end-to-end latency guarantee.

Public passport URLs are `/batch/<PDA_ADDRESS>`, not bare lot identifiers. QR images and Explorer URLs are derived rather than stored. Explorer links use `https://explorer.solana.com/address/<PDA_ADDRESS>?cluster=devnet`.

## Local migration workflow

```shell
supabase start
supabase migration up --local
supabase migration list --local
supabase test db
supabase db advisors --local --level warn --fail-on warn
```

Use `supabase db reset --local` only for a disposable local database: it deletes local data and replays all migrations. The package scripts wrap the local database tasks: `pnpm db:reset` deletes local data, replays every migration and applies the seed; `pnpm db:seed` re-applies the idempotent seed on its own.

The demo accounts — two producers (Sales del Altiplano S.A. → `pena_blanca`, Minera Cóndor S.A. → `condor`) and one buyer (Comprador Demo) — are provisioned by the seed file (`supabase/seed.sql`), which `db reset` applies. Producer and mine names are fictional; the login emails keep the original origin slugs as stable credentials. Credentials are demo-only: `productor.olaroz@julit.dev`, `productor.cauchari-olaroz@julit.dev` and `comprador@julit.dev`, all with password `julit-demo-2026`. Verify the local demo by code with `pnpm smoke` (with `pnpm dev` running against the local stack): it proves the three demo logins, the producer-registration rejection, a fresh buyer registration, the public origins read, and that re-running the seed changes nothing.

This migration set is deployed to the linked project `sixusybflhwjtoikrecn` (`JuLit`, Postgres 17.11, PostgREST v14.18) through explicit, separately reviewed pushes (`supabase db push --linked`, previewed with `--dry-run`). The provisioned demo producers travel through the same reviewed path with `--include-seed`. A full linked reset (`supabase db reset --linked`) wipes public objects, truncates auth data, reapplies every migration and applies the seed; it does not clear the `storage` schema, so delete the empty `plant-certificates` bucket through the Storage API first or the replay fails on the existing bucket row.

## References

- [Supabase Data API grants and RLS](https://supabase.com/docs/guides/api/securing-your-api)
- [Public Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase wallet authentication](https://supabase.com/docs/guides/auth/auth-web3)
- [European Commission battery regulation overview](https://environment.ec.europa.eu/topics/waste-and-recycling/batteries_en)
