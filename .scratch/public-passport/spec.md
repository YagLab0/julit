# Spec: Public passport and QR access

**Status:** ready-for-agent

## Problem Statement

JuLit publishes its batch index and its Origin catalogue, but there is no public
passport: no `/batch/<PDA_ADDRESS>` page, no QR that reaches one, and no way for
a visitor to contrast a batch against Solana. A producer cannot hand out a
link or a printed QR for a batch, and a buyer or auditor cannot open the
product record of a batch outside the catalogue modal. The database contract
already fixes the route shape, the derived QR and the certificate URL, and the
programme is deployed on Devnet with real batch PDAs, so the missing piece is
the page itself.

## Solution

A server-rendered public page at `/batch/<PDA_ADDRESS>`, reachable by QR or by
link from the catalogue's batch fiche, without an account and without the 3D
map. It shows the Batch's product record — origin, production metrics,
sustainability metrics, certification evidence — contrasts the indexed row
with the batch's on-chain account on Devnet, and, for certified Batches,
verifies the certificate PDF's SHA-256 against the digest recorded for the
batch (staged labelling per ADR-0010). A shared QR block renders the passport
URL in the batch fiche and on the page itself, with copy-link and PNG
download for printing or attaching to batch documentation.

## User Stories

### Access and entry

1. As an anonymous visitor, I want to scan a batch's QR and open its public
   passport without an account, so anyone can inspect the record.
2. As an anonymous visitor, I want the catalogue's batch fiche to link to the
   passport, so I can open it without scanning.
3. As a mobile visitor, I want the passport to render without the 3D map and
   be usable in about one second, so a scan works in the field.
4. As a visitor of an unknown or malformed PDA, I want an explicit
   "Pasaporte no encontrado" page with a link back to the catalogue, so a dead
   link is unambiguous.
5. As a visitor, I want the passport to read the public index anonymously,
   with no wallet and no session, so access stays open.
6. As a visitor sharing a passport link, I want the page title to name the
   batch, so the shared link is identifiable.
7. As a visitor, I want the passport to follow the site's theme tokens in
   light and dark mode, so it stays visually consistent.

### Product record

8. As a visitor, I want to see the batch identifier, its status badge and its
   Origin (salar, producer display name), so I know what I am looking at.
9. As a visitor, I want the declared production metrics — volume and purity,
   with the battery-grade chip — so I can judge the product.
10. As a visitor, I want the declared sustainability metrics — water footprint
    against the Origin's public reference and carbon footprint — so I can
    compare them with the salar's figures.
11. As a visitor, I want the passport to show the product record only — no
    price, no reservation and no buyer — so commercial terms stay in the
    catalogue (ADR-0009).
12. As a visitor of a Batch that is not yet certified, I want a clear
    "Certificación pendiente" state without findings or certificate, so the
    absence of evidence is explicit, not hidden.
13. As a visitor, I want the index snapshot date shown and labelled, so I know
    how fresh the indexed record is.

### On-chain record contrast

14. As a visitor, I want the PDA and links to its Explorer page and its
    creation transaction, so I can independently inspect the batch on Devnet.
15. As a visitor, I want the passport to read the batch's on-chain account and
    state whether it exists, belongs to the JuLit programme, and matches the
    indexed record field by field, so the record is contrasted with Solana
    (ADR-0011), not just displayed.
16. As a visitor, when the account and the index differ, I want the differing
    fields named explicitly, so a mismatch is actionable, not a vague warning.
17. As a visitor, when the on-chain account does not exist, I want an explicit
    state saying so, so a missing account is never presented as verified.
18. As a visitor, when the RPC cannot be reached, I want an explicit "no se
    pudo consultar" state with a retry action, so a failure never silently
    passes as a verified record.
19. As a visitor, I want the record contrast to load after the page paints, so
    a slow or unavailable RPC never defeats the passport's mobile load target.

### Certification and findings

20. As a visitor of an audited Batch, I want the auditor's findings — ESG
    approval and EU Battery Regulation assessment — displayed explicitly
    including negative ones, so nothing is hidden (ADR-0004).
21. As a visitor, I want the audit certificate PDF linked from its public,
    content-addressed location, so I can read the evidence.
22. As a visitor, I want the recorded certificate digest shown (truncated),
    so I can recognise the declared document.
23. As a visitor, I want to verify the certificate by downloading it and
    comparing its SHA-256 against the digest recorded for the batch, computed
    in my browser, so I prove document integrity myself.
24. As a visitor, I want the verification result to name its source — the
    result states the PDF matches the digest indexed for the batch and that
    Solana verification arrives with on-chain certification — so the index
    comparison is never presented as Solana verification (ADR-0010).
25. As a visitor, when the downloaded bytes do not match the recorded digest,
    I want an explicit mismatch verdict, so a tampered or stale PDF is visible.
26. As a visitor, when the download fails, I want an explicit failure state
    without any verdict, so a fetch error is never confused with a match.

### QR and sharing

27. As a producer, I want the batch fiche to show a compact QR of the passport
    URL, so I can hand it out or attach it to documentation.
28. As a visitor, I want the passport page itself to show its QR, so sharing
    the page and printing material starts from the same surface.
29. As a visitor, I want a "Copiar enlace" action with a confirmation toast,
    so I can paste the absolute passport URL anywhere.
30. As a visitor, I want a "Descargar PNG" action producing a print-quality QR
    named after the batch, so I can attach it to files or print it.
31. As a visitor, I want the QR to always encode the derived passport URL and
    nothing stored server-side, so the QR and the record cannot drift apart
    (database contract).

### States, honesty and accessibility

32. As a visitor, I want audited surfaces to appear only for genuinely
    certified Batches — the index is not seeded with fake audited rows — so
    the demo never presents unverifiable evidence (ADR-0009).
33. As a visitor, I want loading and error states for every asynchronous read
    (index, chain, certificate), so no surface fabricates data.
34. As a visitor, I want numbers and dates formatted `es-AR`, so the demo
    reads as one product.
35. As a screen-reader user, I want the QR labelled and every verification
    state announced, so the passport is usable without sight.
36. As a visitor with a cluster other than Devnet selected in the catalogue,
    I want the passport to stay pinned to Devnet as the database contract
    fixes, so the public record has one canonical chain.

## Implementation Decisions

- **Route**: `/batch/[PDA_ADDRESS]`, server-rendered (Next 16: `params` is a
  promise and must be awaited); a segment-level not-found boundary renders
  "Pasaporte no encontrado" with a link to the catalogue. No 3D or map imports
  on this route; all interactive pieces are small client islands that mount
  after first paint.
- **Reads**: server-side anonymous Supabase reads (public RLS): the Batch by
  `pda_address` and its Origin row. Reuse the catalogue's `Batch` and `Origin`
  types, its column constants pattern, and `batchCertificateUrl`. The passport
  query additionally selects `producer_wallet` and `creation_tx_signature`
  (catalogue queries stay unchanged). One request-scoped cached read serves
  both the page and its per-batch metadata title.
- **Pure verification module (the test seam)**: one module with two
  responsibilities, consumed by the islands:

  ```ts
  // Module contract. Indexed row + decoded on-chain account in, verdict out.
  type RecordContrast =
    | { state: "verified" }
    | { state: "missing" }
    | { state: "mismatch"; fields: readonly string[] };

  contrastBatchRecord(input: {
    indexed: PassportBatch;      // pda_address, batch_id, producer_wallet,
                                 // origin_id, status, metrics
    derivedPda: string;          // findBatchPda(producer_wallet, batch_id)
    account: OnChainBatch | null; // decoded account (programme address + data)
  }): RecordContrast;

  certificateVerdict(recordedHex: string, computedHex: string):
    "match" | "mismatch";

  passportPath(pda: string): string; // "/batch/<pda>"
  ```

  Decimal comparison is exact: index decimal strings and on-chain scaled
  integers are both parsed to scaled BigInt with fixed multipliers (purity
  ×100, water/carbon ×100, price ×1 000 000) — never through JavaScript
  `Number`. Contrasted fields: PDA derivation, programme address, batch id,
  producer, origin, volume, purity, water, carbon, status. Price, reservation
  and buyer are out of the contrast along with the display (ADR-0009).

- **Contrast island**: uses the generated Codama client and
  `createSolanaClient("devnet")` — `findBatchPda` for the derivation check and
  `fetchMaybeBatch` for the account. States: checking, verified, mismatch
  (field list), missing, unavailable (with retry). The RPC read never blocks
  the initial HTML.
- **Certificate island**: rendered only when the indexed row carries
  `audit_sha256` and `audit_certificate_path`. On demand: fetch the PDF from
  its public URL, hash the bytes with `crypto.subtle.digest("SHA-256")`,
  compare via `certificateVerdict`, and render the staged, source-naming
  result (ADR-0010); mismatch and download-failure are distinct states and a
  failure yields no verdict. No server-side hashing fallback.
- **QR block**: one shared client component used by the passport page and the
  catalogue's batch fiche (compact variant). Renders with the already
  installed `qrcode` package onto a canvas; the URL is built from
  `window.location.origin` plus `passportPath` after mount. Actions:
  "Copiar enlace" (clipboard + sonner toast) and "Descargar PNG"
  (`toDataURL`, filename `julit-pasaporte-<batch_id>.png`). The canvas gets
  `role="img"` and a label naming the batch.
- **Batch fiche integration**: the catalogue modal's batch fiche gains a
  passport block — a "Ver pasaporte" link plus the compact QR and both
  actions. The list-view cards do not change.
- **Display reuse**: the passport composes the catalogue's existing display
  module (status badge, metric chips, findings chips, formatters, skeleton) —
  no third copy of batch presentation.
- **Content rules**: product record as the glossary defines it — no price, no
  reservation, no buyer; `created` shows the certification-pending state;
  `audited`/`completed` show findings and the certificate.
- **Explorer links**: derived, `?cluster=devnet` pinned, via the existing
  helper.
- **UI conventions**: Spanish strings, English identifiers and comments;
  semantic tokens only; `es-AR` number and date formatting; verification
  copy as fixed above, never "verificado en Solana" for the index comparison.

## Testing Decisions

- **Seam**: the pure verification module is the only new seam — the same kind
  of seam as the existing register and certify validation modules. React
  components and pages are not unit-tested anywhere in this repo.
- **What a good test is**: input → verdict output, external behavior only.
  Cases for the contrast: all fields matching → verified; each single-field
  mismatch (batch id, producer, origin, volume, purity, water, carbon,
  status, derived PDA, programme address) → mismatch naming exactly that
  field; absent account → missing; unknown on-chain status value → mismatch;
  decimal exactness — `"99.5"` ≡ `"99.50"` vs 9950 basis points,
  `"1.000000"` vs 1 000 000, values at the `u64` boundary with no precision
  loss. Cases for the certificate: equal hex in either case → match; any
  difference, including malformed computed hex, → mismatch.
- **Prior art**: the validation test modules under the register-batch and
  certify features, run by `pnpm test` (vitest).
- **Verification**: `pnpm test`, `pnpm build`, `pnpm lint`,
  `pnpm format:check`, plus a manual walk of `/batch/<pda>` with `pnpm dev`.
  The production index's two `created` batches exercise entry, QR, record
  contrast and the pending state. The audited/certificate surface is
  exercised locally only: a disposable audited row and a fixture PDF in the
  **local** stack, never in production (ADR-0009).

## Out of Scope

- `certify_batch` and the on-chain certificate digest — the digest comparison
  stays staged (ADR-0010).
- Certificate upload endpoint and its API.
- Seeding audited batches or stand-in certificates into the production index.
- QR in the list-view cards or any surface other than the fiche and the page.
- Purchase/settlement flow and price display on the passport.
- Company identity disclosure beyond the Origin's producer display name.
- Social share targets beyond copy and PNG download, analytics, PWA/offline
  behaviour, and in-app QR scanning.

## Further Notes

- Behavioural contract: `docs/features/public-catalogue-and-passport.feature`.
  Its `@program` scenario describes the certificate comparison once
  certification exists on-chain; today's staged label implements the `@ui`
  half.
- Decisions: ADR-0009 (scope and content), ADR-0010 (staged certificate
  verification), ADR-0011 (record contrast). Glossary terms used: Passport,
  Certificate Verification, Batch, Origin, Producer, Audited Batch.
- The generated Codama client and the PDA derivation were exercised against
  Devnet: `findBatchPda` reproduces the production `pda_address` values and
  `fetchMaybeBatch` decodes the real accounts.
- `anchor/target/idl/julit.json` is not committed; regenerating the client
  needs `pnpm setup` (anchor build). The committed client suffices for this
  spec.
- The browser PDF fetch depends on the certificate bucket's CORS behaviour;
  the download-failure state covers the case where it is unavailable.
- The production index currently holds two `created` batches, both from
  Salar del Cóndor, so the created path is the only one demonstrable against
  production data.
