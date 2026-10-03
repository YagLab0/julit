# Spec: Certify batch — on-chain audit declaration, certificate upload, index write

**Status:** ready-for-agent

## Problem Statement

The auditor workspace lists real assigned batches and the `/audit/[pda]`
certification page validates the PDF and declarations client-side, but the
submit is a toast stub: nothing reaches the blockchain and the index never
moves to `audited`. The `certify_batch` instruction does not exist in the
Anchor program, the `Batch` account has no field for the certificate digest,
and there is no API to upload the audit certificate or to index the result.
The auditor cannot actually certify, and there is no on-chain PDF hash to
compare against for forgery detection later.

## Solution

End-to-end certification on Devnet. The auditor picks the PDF, the app
uploads it through the authenticated API (which verifies the uploader is the
batch's designated auditor, recomputes the digest, and stores the file
content-addressed without upsert), the auditor's connected wallet signs and
sends a `certify_batch` transaction that writes the digest and both
declarations to a new on-chain audit account, and a second API call verifies
the confirmed transaction against the real PDA before marking the index row
`audited` with the digest, findings, and signature. The on-chain audit record
is permanent and publicly comparable — the basis for future forgery checks.

## User Stories

### Certificate upload (API)

1. As an auditor, I want to upload the audit certificate through the
   authenticated API, so that browsers never hold write access to Storage.
2. As the API, I want to verify the session company's verified wallet equals
   the batch's `auditor_wallet`, so that only the designated auditor can
   upload.
3. As the API, I want to reject uploads for batches that are not `created`
   in the index, so that certificates cannot be replaced after certification.
4. As the API, I want to recompute the SHA-256 of the uploaded bytes myself,
   so the stored path derives from real content, not a claimed digest.
5. As the API, I want to store the file at
   `<PDA_ADDRESS>/<lowercase digest>.pdf` in the `audit-certificates` bucket
   without upsert, so a stored certificate is immutable.
6. As an auditor, I want a clear error when the certificate already exists
   for that digest, so I know it was already uploaded.
7. As the API, I want to reject non-PDF and oversized uploads, mirroring the
   bucket constraints (application/pdf, 50 MiB).

### On-chain certification

8. As an auditor, I want my connected wallet to sign the `certify_batch`
   transaction in the browser, so wallet control authorizes the on-chain
   declaration (ADR-0003).
9. As the program, I want to reject any certify instruction not signed by the
   batch's designated auditor, so nobody else can certify.
10. As the program, I want a batch to be certifiable exactly once, so the
    audit record can never be rewritten.
11. As the program, I want the audit record to store the 32-byte certificate
    digest, the ESG approval boolean, and the EU assessment enum, so every
    declared finding is on-chain and publicly verifiable.
12. As the program, I want the batch status to become `Audited` only on
    successful certification, so the status and the audit record can never
    disagree.
13. As an auditor, I want to declare negative findings (ESG false,
    non_conformant) on-chain exactly like positive ones, since negative
    findings are still valid certification (ADR-0004).
14. As the system, I want the audit data in a separate PDA derived from the
    batch address, so the existing `Batch` layout and the already-indexed
    batches keep working without migration.
15. As an auditor, I want to pay my own transaction fees, since I am the
    signer of my own declaration.

### Index write (API)

16. As an auditor, I want to post the transaction signature to the API after
    my transaction confirms, so the index reflects the on-chain result.
17. As the API, I want to fetch the transaction from Devnet and reject
    missing, failed, or unconfirmed transactions, so only real outcomes are
    indexed.
18. As the API, I want to verify the transaction contains a `certify_batch`
    instruction to the JuLit program, decoded by its discriminator, so other
    transactions cannot drive the index.
19. As the API, I want to verify the instruction's batch account equals the
    requested PDA and its auditor equals my verified wallet, so I cannot
    index someone else's certification.
20. As the API, I want to read the on-chain audit account rather than trust
    the request body, so the indexed digest and findings always mirror the
    confirmed state (docs/database.md: never trust a requested status,
    signer, digest, or signature).
21. As the API, I want to write `audited` with the digest, both findings, the
    transaction signature, and the observed slot in one update, so the
    database state checks always see a complete snapshot.
22. As an auditor, I want a clear error when the index row is already
    `audited`, so a duplicate call is harmless.

### Certification page (UI)

23. As an auditor, I want the submit button to run the three steps in order —
    upload, send transaction, index — so certification is one action for me.
24. As an auditor, I want progress and failure states per step, so I know
    whether the upload, the signature, or the indexing failed.
25. As an auditor, I want a rejected wallet signature to abort cleanly
    without touching the index, so nothing records a certification that did
    not happen.
26. As an auditor, I want a success toast and a return to the workspace
    showing the batch in the certified section with my declared findings,
    so I can see the result immediately.
27. As an auditor, I want the certified entry to link to the transaction on
    Solana Explorer (devnet), so I can independently verify it.
28. As an auditor certifying before the program upgrade is deployed, I want
    a clear failure instead of a half-recorded state, so the feature lands
    safely behind the deploy.

## Implementation Decisions

- **Merge first**: `origin/batch-registration-feature` merges into
  `audit-features` — it carries the program source, the generated Codama
  client, the `POST /api/batches` index pattern, and the contracts API. Its
  `PATCH /api/companies/contracts/[id]` (`{action: "accept"|"decline"}`)
  duplicates our `POST .../respond`; consolidate on the merged `PATCH`
  endpoint and rewire the inbox call, deleting the respond route.
- **Program — `certify_batch` instruction** in the julit Anchor program:
  args `audit_hash: [u8; 32]`, `esg_approved: bool`,
  `eu_assessment: EuAssessment` (new enum `Conformant | NonConformant`).
  Accounts: `batch` (mut, requires `status == Created` and
  `batch.auditor == auditor.key()`), `auditor` (Signer, payer),
  `audit` (init PDA, seeds `["audit", batch.key()]` — one init makes
  certification single-shot), `system_program`. The `audit` account stores
  `audit_hash`, `esg_approved`, `eu_assessment`, `certified_slot`, `bump`.
  `Batch` layout is untouched — no migration, existing accounts stay valid.
  New error variants: `NotDesignatedAuditor`, `AlreadyCertified`.
- **Client**: `anchor build` then `pnpm codama:js` regenerates
  `app/generated/julit` (certify instruction builder, audit PDA finder,
  `Audit` decoder, `EuAssessment` codec). Generated code is never hand-edited.
- **Certificate upload endpoint** `POST /api/batches/[pda]/certificate`:
  multipart body; session → company must be an auditor with a verified wallet;
  index batch must exist, be `created`, and have `auditor_wallet` equal to
  the company's wallet; server recomputes SHA-256 and stores at
  `<pda>/<digest>.pdf` without upsert (409 on existing object).
- **Index endpoint** `POST /api/batches/[pda]/certify`: mirrors the
  colleague's `POST /api/batches` verification shape — session auditor with
  verified wallet → tx exists, confirmed, no error → contains a JuLit
  instruction decodable as `certify_batch` → its batch account equals the
  path PDA and its auditor equals the company wallet → reads the on-chain
  `Audit` account for digest + findings → single `batches` update to
  `audited` with `audit_sha256`, `esg_approved`, `eu_regulation_assessment`,
  `audit_tx_signature`, `observed_slot`. Already-`audited` index rows → 409.
- **Submit flow** on the certify page: validate → `POST certificate` → build
  the instruction via the generated client (hex digest → 32 bytes) →
  `useSendTransaction` sends it (auditor wallet signs and pays) →
  `POST certify` with the signature → toast + return to `/audit`. Any step
  failure aborts the chain; a wallet rejection leaves nothing recorded.
- **Verification module**: the index endpoint's accept/reject decision lives
  in a pure module — decoded instruction + tx meta + on-chain accounts +
  index row + caller wallet in, `{ payload } | { reason }` out — the same
  seam style as the existing validation modules.
- **Deploy is out of band**: the colleague holding the upgrade authority
  (`EwpCo293GQT8X6dpiLFdfvbu1wRLCheUDB4WmuPEXbyF`) runs `anchor deploy`
  against Devnet after pulling the branch. Until then the UI submit fails
  cleanly — nothing is half-recorded.

## Testing Decisions

- **Seam**: one seam — the pure index-verification module — matching the
  repo's convention (pure module in, vitest out; no React or route tests).
- **What a good test is**: external behavior only — inputs to
  accepted-payload or reject-reason. Cases: missing/failed transaction, no
  JuLit instruction, wrong instruction discriminator, batch account
  mismatch, auditor wallet mismatch, already-`audited` index row, and the
  happy path producing `{ auditSha256, esgApproved, euAssessment,
auditTxSignature, observedSlot }`.
- **Program**: no new harness — `certify_batch` is account constraints
  (seeds, signer equality, one-shot init) verified by review and the Devnet
  smoke, not by a new LiteSVM/mollusk seam.
- **Prior art**: `app/audit/validation.test.ts` run by `pnpm test`.
- **Verification**: `pnpm build`, `pnpm lint`, `pnpm test`,
  `pnpm format:check`; end-to-end Devnet certification once the upgrade is
  deployed.

## Out of Scope

- The Devnet upgrade itself — requires the authority keypair held by the
  colleague; the branch ships ready for `anchor deploy`.
- Public passport verification of the stored certificate against the
  on-chain digest (the future forgery check the hash enables).
- Producer-side contract offers and the counterparties UI (colleague's
  branch scope).
- Batch completion / simulated settlement (`complete` flow).
- Realtime refresh of the workspace; the list re-reads on navigation.

## Further Notes

- `docs/features/audit-certification.feature` is the behavioral contract:
  upload verifies the designated auditor and recomputes the digest; the
  index only records confirmed on-chain results; certification is one-shot.
- The index `batches` row already enforces complete audit evidence via the
  `batches_audit_state_check` constraint — the single update always carries
  all fields or fails.
- `audit_certificate_path` is generated from `pda_address` + `audit_sha256`,
  so indexing the on-chain digest automatically points at the uploaded
  object's expected path.
- Negative findings must remain first-class: `esg_approved: false` and
  `non_conformant` certify the batch and keep it purchasable (ADR-0004).

### Colleague deployment

The upgrade authority keypair (`EwpCo293GQT8X6dpiLFdfvbu1wRLCheUDB4WmuPEXbyF`)
must be the wallet and the program keypair must stay at
`anchor/target/deploy/julit-keypair.json` (gitignored, already present on the
machine that deployed `D3aKAxF8…`). Then:

1. `avm install 0.32.1 && avm use 0.32.1` (the program pins
   `anchor-lang = "=0.32.1"`).
2. `pnpm anchor-build` — runs `anchor build`, which re-syncs `declare_id!`
   from the deploy keypair; with the real keypair this is a no-op.
3. `anchor deploy` from `anchor/` against devnet.
4. `pnpm codama:js` if the IDL changed; the generated client is committed.
5. Confirm `declare_id!` still reads `D3aKAxF8…` before deploying — if it
   shows another address, the deploy keypair file is missing or wrong.
