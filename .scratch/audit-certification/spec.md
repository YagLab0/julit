# Spec: Auditor workspace — assigned batches, contracts inbox, certify flow

**Status:** ready-for-agent

## Problem Statement

An auditor company can sign in, register, and verify its wallet, but then hits a
dead end: the account page says certification is "Próximamente". There is no way
for the designated Auditor to see the batches assigned to it, respond to producer
contract offers, or record its certification declarations (ESG approval and EU
Battery Regulation evaluation). Stage 3 of the end-to-end flow has no frontend.

## Solution

A dedicated auditor workspace at `/audit`. The auditor sees the batches whose
producer designated it (pending certification and certified history), manages
incoming company contract offers, and certifies each pending batch from a
dedicated per-batch page with the audit certificate PDF and its two
declarations. The workspace ships on demo data with a visible demo notice —
mirroring the existing demo conventions — because the index write (issue 06),
the contracts API (issue 03), and the certify endpoints do not exist yet. Every
piece of UI is built so the data source can be swapped without touching the
components.

## User Stories

### Access and gates

1. As an anonymous visitor, I want to be redirected to sign-in when I open the
   auditor workspace, so that only authenticated companies reach it.
2. As a signed-in user with no company profile, I want a gate card telling me to
   register my company first.
3. As a signed-in producer or buyer, I want a gate card telling me certification
   is exclusive to auditor companies, so I cannot reach the workspace.
4. As an auditor without a verified wallet, I want a gate card telling me to
   link my verified wallet from my account first.
5. As an auditor with a verified wallet but no wallet connected, I want a card
   telling me which wallet to connect, with a link back to my account.
6. As an auditor whose connected wallet differs from the verified one, I want a
   warning naming both wallets, so I cannot certify with the wrong identity.
7. As an auditor, I want the same gating on the per-batch certification page,
   so deep links cannot bypass identity checks.

### Assigned batches

8. As an auditor, I want a "pending certification" section listing my assigned
   batches in `created` status, so I know what work is waiting.
9. As an auditor, I want each pending batch card to show its batch identifier,
   producer, origin, volume, purity, water and carbon footprints, and price, so
   I can recognize the batch before certifying.
10. As an auditor, I want each pending batch to link to its certification page,
    so the flow is one click from the list.
11. As an auditor, I want a "certified" section listing batches I already
    certified, so I have a history of my work.
12. As an auditor, I want each certified batch to display its recorded findings
    — ESG approval and EU regulation assessment — including negative findings,
    so nothing is hidden.
13. As an auditor, I want the certified entry to show the certificate digest
    that was declared.
14. As an auditor with no assigned batches, I want an explicit empty state, so
    I understand the list is not broken.
15. As an auditor, I want a visible demo notice on the workspace, so nobody
    mistakes demo batches for real indexed ones.

### Contract offers

16. As an auditor, I want a contracts section listing pending offers from
    producer companies, so I can see who wants to contract me.
17. As an auditor, I want to accept a pending offer, so the producer can then
    designate me on its batches.
18. As an auditor, I want to decline a pending offer, so the relationship is
    marked revoked.
19. As an auditor, I want accept and decline to update the offer's status in
    the demo immediately with a toast, so the flow feels complete.
20. As an auditor, I want a history of all my contract relationships with their
    status (pending / accepted / revoked), not just pending offers.

### Certification page

21. As an auditor, I want to open a dedicated page for a pending batch showing
    the full batch summary, so I certify the right batch.
22. As an auditor, I want to pick the audit certificate PDF from my device.
23. As an auditor, I want non-PDF files and files over the 50 MiB storage limit
    rejected client-side, so I get feedback before any upload exists.
24. As an auditor, I want the SHA-256 digest of my PDF computed locally and
    shown to me, so I can verify it matches what I would declare on-chain.
25. As an auditor, I want to declare ESG approval as a yes/no choice.
26. As an auditor, I want to declare the EU Battery Regulation evaluation as
    conformant / non-conformant.
27. As an auditor, I want the certify action disabled until the PDF digest and
    both declarations are present, so the submission is always complete.
28. As an auditor, I want a single certification step (PDF + declarations in
    one submit), since both backend calls are stubbed at the same boundary.
29. As an auditor, I want the demo certification to move the batch to the
    certified section with my declared findings and a toast, mirroring the
    contract mutations.
30. As an auditor, I want a toast noting the on-chain transaction and index
    enable with the Anchor program, matching the producer form's boundary
    convention.
31. As an auditor opening a link to an unknown or already-certified batch, I
    want a clear state instead of the form.

### Account page

32. As an auditor, I want my account page's "Certificar lotes" card to link to
    the auditor workspace instead of saying "Próximamente".

## Implementation Decisions

- **Routes**: `/audit` (workspace) and `/audit/[pda]` (per-batch certification).
  `params` is a promise and must be awaited in the server page (Next 16).
- **Gates**: server-side session → company exists → `company_type === 'auditor'`
  → `wallet_verified_at`, mirroring the `/batches/new` page; client-side
  connected-wallet and address-match checks mirror `new-batch-client`.
- **Demo data**: one demo module exporting demo batches (with producer names —
  names only exist in demo since `companies` is never browser-readable,
  ADR-0003) and demo contract offers. It acts as an in-memory store:
  certifications and offer responses mutate it; a full reload resets the demo.
  The module carries a comment naming the issues that will replace it (index
  from 06, contracts API from 03) — same convention as the counterparties demo
  module.
- **Batch list**: pending (`created`) and certified sections. Certified entries
  display findings explicitly, including negative ones (ADR-0004).
- **Certify form**: single-step. PDF input validated for `application/pdf` and
  ≤ 50 MiB (the Storage bucket limit); SHA-256 computed in-browser via
  `crypto.subtle` and displayed lowercase-hex; ESG approval (yes/no) and EU
  assessment (conformant / non_conformant) as required choices. Submit mutates
  the demo batch to `audited` with the declared findings, toasts, and returns
  to `/audit`.
- **Boundary stub**: the certify submit stops at the future API/program
  boundary (certificate upload → `certify_batch` tx → audit index per
  end-to-end-flow stage 3), exactly as the register-batch form stops before
  `create_batch`.
- **Validation seam**: the certify rules live in a pure validation module next
  to the form, mirroring the register-batch validation module (input shape in,
  errors/payload out). The payload carries the lowercase-hex digest, the ESG
  boolean, and the EU assessment enum.
- **Demo notice**: visible "Datos simulados" notice on `/audit`, same amber
  style as the map demo notice.
- **Account page**: the auditor next-step card gains a link to `/audit`.
- **Conventions**: all UI text Spanish; numbers via `Intl.NumberFormat("es-AR")`;
  semantic tokens only (`bg-card`, `border-border`, `eyebrow`, `btn-primary`,
  `btn-secondary`); English identifiers and comments.

## Testing Decisions

- **Seam**: the pure certify-validation module is the only test seam — the same
  seam the register-batch form already uses. React components are not
  unit-tested anywhere in this repo; the demo data module is deliberately dumb
  and untested.
- **What a good test is**: input → errors/payload output, external behavior
  only. Cases: missing file, wrong MIME type, file over 50 MiB, missing ESG
  choice, missing EU choice, and the happy path producing the
  `{ digest, esgApproved, euAssessment }` payload.
- **Prior art**: `validation.test.ts` under the register-batch feature, run by
  `pnpm test` (vitest).
- **Verification**: `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm format:check`.

## Out of Scope

- Real index read (`SELECT batches WHERE auditor_wallet = ...`) — lands with
  issue 06's index API writing rows.
- Contracts API (offer/respond/counterparty directory) — issue 03. The
  producer-side half of the contracts UI — issue 04.
- Certificate upload endpoint, `certify_batch` Anchor instruction, audit index
  API — backend scope of this feature's later issues.
- Resolving producer company names outside demo data — requires the API
  directory (ADR-0003).
- Public passport verification of the certificate against the on-chain digest.

## Further Notes

- Negative findings are first-class: an audited batch with `esg_approved: false`
  or `non_conformant` is still certified and still purchasable (ADR-0004); the
  certified section must display them, not flag them as errors.
- When the real index exists, the demo module is deleted and the list queries
  `batches` filtered by the auditor's verified wallet — the public-read RLS
  policy already permits it, so no API is needed for the list itself.
- `docs/features/audit-certification.feature` is the behavioral contract for
  the backend side this frontend stubs.
