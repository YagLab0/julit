# Spec: Buyer-initiated contracts and producer offer inbox

> **Superseded** by `.scratch/atomic-lot-settlement/spec.md` (ADR-0019): the batch/auditor model was replaced by escrowed lot settlement. This spec is kept for history only — do not implement from it.

**Status:** superseded

## Problem Statement

Today every company contract is offered by the producer to either an auditor
or a buyer. That works for auditors — the producer chooses who audits it —
but it is backwards for buyers: commercially it is the buyer who seeks to
lock supply from a producer. A buyer company has no way to express interest
in a producer, and a producer has no inbox to review who wants to buy from
it. The producer-side contract UI also offers a choice it should not have:
offering contracts to buyers.

## Solution

Contract initiation direction becomes fixed per party pair
(ADR-0008): producers offer contracts only to auditors, and buyers offer
contracts to producers. The same `company_contracts` table and statuses
apply — only who creates the row and who responds changes per pair. The
producer's account gains a dedicated inbox card listing pending offers
from buyer companies with accept/decline actions, separate from its
auditor-contract management. The batch registration form is untouched:
its reserved-buyer dropdown keeps listing buyers holding an accepted
contract regardless of who offered it.

## User Stories

### Producer offering (account page)

1. As a producer, I want to offer contracts only to auditor companies, so
   that the offer flow matches the commercial reality that I choose my
   auditor.
2. As a producer, I want the counterparty-type picker removed from my
   offer controls, so that offering is a single-step company choice.
3. As a producer, I want the directory feeding my offer dropdown to list
   only auditors, so I cannot accidentally offer to a buyer.
4. As a producer, I want offering a contract to a buyer to be rejected by
   the API as well, so the restriction cannot be bypassed with a crafted
   request.
5. As a producer, I want my contracts card text to describe the auditor
   flow only, so the copy does not promise a buyer-offering feature that
   no longer exists.

### Buyer offering (API support for a later UI)

6. As a buyer, I want to be able to create a contract offer to a producer
   through the contracts API, so that I can express interest in its
   supply.
7. As a buyer, I want my offer to land as `pending` waiting on the
   producer's response, so the producer stays in control of who buys
   from it.
8. As a buyer, I want offering to auditors or other buyers rejected, so
   only the two sanctioned flows exist.
9. As an auditor, I want offering contracts to anyone rejected, so the
   two-flow model holds.
10. As any company, I want duplicate offers for the same pair still
    rejected, regardless of who initiated, so a pair never holds two
    contracts.

### Producer offer inbox (account page)

11. As a producer, I want a dedicated card in my account listing pending
    offers from buyer companies, so I can see who wants to contract me.
12. As a producer, I want each pending offer to show the buyer's company
    name, so I know who is asking.
13. As a producer, I want to accept a pending buyer offer, so the buyer
    becomes an eligible reserved buyer on my batches.
14. As a producer, I want to decline a pending buyer offer, so the
    relationship is marked revoked.
15. As a producer, I want the inbox card to show only pending offers with
    actions — my full contract history stays in the existing contracts
    card — so the two cards do not duplicate.
16. As a producer, I want an empty state when there are no pending buyer
    offers, so the card does not look broken.
17. As a producer, I want the inbox to refresh after I respond, so the
    offer disappears immediately.
18. As a buyer or auditor, I want not to see the buyer-offer inbox card,
    so it stays producer-only UI.

### Responding correctly per direction

19. As a producer, I want to be able to respond (accept/decline) to
    pending contracts where the buyer is the counterparty, so I am the
    responder in the buyer-initiated flow.
20. As a buyer, I want NOT to be able to respond to my own outgoing
    offer, so only the producer resolves it.
21. As an auditor, I want responding to producer offers to keep working
    exactly as today, so the auditor flow is not regressed.
22. As a producer, I want to still NOT respond to my own outgoing auditor
    offers, so each direction has exactly one responder.
23. As any company, I want responding to a non-pending contract still
    rejected, so status transitions stay `pending` →
    `accepted`/`revoked`.

### Listing and display

24. As any company, I want my contracts list to show each relationship
    with the other party's name and type plus its status, regardless of
    who offered it.
25. As any company, I want the list to tell me whether I offered or was
    offered each contract, so pending items make sense ("oferta recibida"
    vs "oferta enviada").
26. As a buyer, I want my outgoing pending offers visible in my contracts
    card, so I can see they are waiting on the producer.

### Batch registration continuity

27. As a producer, I want the "Mis clientes" dropdown to keep listing
    every buyer holding an accepted contract with me — including those
    who offered the contract — so reserved batches keep working.
28. As a producer, I want the auditor dropdown and the rest of the batch
    form untouched, so this change does not affect registration.
29. As a producer, I want a batch naming a buyer whose accepted contract
    I accepted from their offer to be indexable, so the DB enforcement
    stays satisfied (the contract row is identical regardless of
    initiator).

## Implementation Decisions

- **Fixed direction per pair (ADR-0008)**: producer↔auditor is initiated
  by the producer; producer↔buyer is initiated by the buyer. No other
  pair may initiate. The initiator is never submitted and never stored —
  it is derived from the company types of the pair
  (`counterparty.company_type === 'auditor'` → producer initiated;
  `'buyer'` → buyer initiated).
- **One pure derivation module**: a new pure function maps a contract's
  company-type pair to `{ initiator, responder }` (both roles being
  `'producer' | 'counterparty'`), plus a guard for whether a given
  initiator/counterparty pair is allowed at all. Both API routes and the
  account UI's role labels consume it. No schema change: no
  `initiated_by` column, no new statuses.
- **`POST /api/companies/contracts`** now accepts offers under both
  flows: a producer offering to an auditor (unchanged call shape:
  `counterparty_id` is the auditor), or a buyer offering to a producer
  (call shape: `counterparty_id` is the producer). The endpoint derives
  which side is the producer from the pair's types and stores
  `producer_id`/`counterparty_id` accordingly — the row shape is
  identical for both flows. All other pairs (producer→buyer,
  buyer→auditor, buyer→buyer, auditor→anything, producer→producer)
  return a validation error.
- **`PATCH /api/companies/contracts/[id]`** resolves the responder via
  the derivation module instead of assuming the counterparty always
  responds. The responder is the counterparty when the counterparty is
  an auditor, and the producer when the counterparty is a buyer. Only
  that party may accept or decline a `pending` contract.
- **`GET /api/companies/contracts`** keeps returning every contract the
  caller is part of, but each row's metadata distinguishes the caller's
  posture: `initiator` vs `responder` (replacing or augmenting today's
  `producer`/`counterparty` role), so the UI can label "oferta enviada"
  vs "oferta recibida" for any direction.
- **`GET /api/companies/contracts/counterparties`** is unchanged: it
  lists the caller's accepted counterparties by type with verified
  wallets. Buyer contracts accepted in either direction qualify, so the
  batch form keeps working.
- **`GET /api/companies/directory`** gains `type=producer` so the
  future buyer-side offer picker can list producers. (The buyer offer
  UI itself ships in a teammate's commit; this spec only makes the API
  not block it.)
- **Account page, producer offer row**: the auditor/buyer type picker is
  removed. The remaining controls are a single company select (auditors
  from the directory) plus the offer button. Copy updated to describe
  offering to auditors only.
- **Account page, new buyer-offers inbox card**: rendered for producers
  only, above or below the existing contracts card. It lists pending
  contracts where the caller is the responder and the counterparty is a
  buyer, each with the buyer's name and Aceptar/Rechazar buttons calling
  `PATCH`. Empty state text when none are pending. It reuses the
  contracts list fetched by the contracts card or fetches the same
  endpoint itself — simplest consistent option.
- **Pending-incoming section inside the existing contracts card**: keep
  it working for auditors (producer offers). For producers it will now
  also be able to render buyer offers, but the dedicated inbox card owns
  that surface — avoid double-rendering the same offers in both places
  by filtering producer-responder offers out of the generic section or
  scoping the generic section to non-producer callers.
- **DB untouched**: `company_contracts` schema, unique pair constraint,
  statuses, RLS and the batch-index triggers are unchanged — the row
  semantics do not depend on who offered. The pgTAP suite needs no new
  cases for direction (enforcement lives in the API, not the DB).
- **Conventions**: API writes via service client only (ADR-0003); UI
  text in Spanish; English identifiers; no backward-compatibility
  shims (AGENTS.md).

## Testing Decisions

- **Single seam**: the pure direction-derivation module is the only new
  test seam — same philosophy as `app/batches/new/validation.ts` (input
  in, decision out, no mocks).
- **What a good test is**: external behavior only. Cases:
  producer+auditor pair → producer initiates, counterparty responds;
  producer+buyer pair → buyer initiates, producer responds; every other
  pair → not allowed; responder resolution picks the right party for
  each allowed pair.
- **Prior art**: `validation.test.ts` under `app/batches/new/`, run by
  `pnpm test` (vitest). New test file sits next to the module it tests.
- **Not tested**: API routes (no route-level test infra exists; the
  routes are thin over the tested module), React components (repo has no
  component tests), pgTAP (schema unchanged).
- **Verification**: `pnpm build`, `pnpm lint`, `pnpm test`,
  `pnpm format:check`; manual smoke: producer offers auditor; buyer
  offer row inserted directly (or via teammate's UI) appears in the
  producer inbox and accepts/declines.

## Out of Scope

- The buyer-side offer UI (buyer account page picker/button) — ships in
  a teammate's commit; this spec only makes the API accept the flow and
  exposes `directory?type=producer`.
- Migrating or deleting any existing producer→buyer contract rows —
  none exist in the demo data.
- On-chain representation of contracts — stays off-chain per ADR-0006.
- Changes to `/audit`, batch registration form, or the Anchor program.
- Public passport or settlement implications of buyer contracts.

## Further Notes

- The audit workspace's demo contracts inbox
  (`.scratch/audit-certification`, ticket 02) models the auditor's
  pending producer offers — unaffected: auditors remain responders.
- `COMPANY_TYPE_LABELS` drives the "quiere contratarte como X" copy; the
  producer inbox copy should say the buyer "quiere comprar tu producción"
  or equivalent — responder-direction phrasing, not auditor phrasing.
- If a future flow lets auditors initiate, the derivation module is the
  single place that changes — flagged in ADR-0008 as a deliberate
  trade-off vs an `initiated_by` column.
