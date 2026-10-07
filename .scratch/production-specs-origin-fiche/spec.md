# Spec: Production specifications on the company record + single-lot origin fiche

**Status:** ready-for-agent

## Problem Statement

The lot registration form asks the producer to type chemical purity, water
footprint and carbon footprint on every lot — but these are fixed
characteristics of the producer's operation at its bound origin, provisioned
by the demo operator, not per-lot declarations. Retyping them per lot is
error-prone and misattributes where the data comes from.

Separately, the origin fiche modal is organised around lot browsing: a
sortable list of published and settled lots, a commercial-contract banner,
and a lifecycle action footer. The explorer is pivoting to showcase the
mine's production characteristics rather than the lots themselves, and lot
lifecycle interaction (fund, redeem, dispute, claim, cancel) is moving to
the buyer's account view in a follow-up feature.

## Solution

Store the Production Specification — purity, water footprint, carbon
footprint — on the producer's `companies` row, provisioned by the operator.
The registration form drops those inputs, shows the producer's
specification read-only, and still declares the values on-chain via
`create_lot` exactly as today. Volume and price move into the
"Identificación" section.

The origin modal becomes a single centred fiche of the mine: the 3D lot
stage, declared metrics, plant certificate, public passport and public
source references. The right-hand column (contract banner, lot lists,
switcher), the sorting machinery and the lifecycle footer disappear; a
single centred "Conectar con productor" button (a `mailto:` link, target
configured later) takes the footer's place.

No on-chain changes: the `create_lot` instruction, the `lots` index table
and the passport keep their current shape — only the source of the spec
values changes.

## User Stories

1. As a producer, I want the registration form to stop asking me for
   purity and footprints, so that I don't retype fixed characteristics of
   my operation on every lot.
2. As a producer, I want to see my Production Specification read-only in
   the form, so that I know exactly what will be declared on-chain before
   I sign.
3. As a producer, I want volume (tonnes) and lot price (USDC) inside the
   "Identificación" section, so that the form is a single coherent block.
4. As a producer, I want buyer designation, claimable-after and the plant
   certificate upload to behave exactly as today.
5. As a producer whose company has no Production Specification
   provisioned, I want a gate message telling me it is provisioned by the
   operator, instead of a form I cannot complete.
6. As the protocol, I want `create_lot` to receive the same scaled values
   as today, so that the on-chain record and the `lots` index contract are
   untouched.
7. As the demo operator, I want to set production specs on producer
   company rows via seeds/SQL, so that they flow automatically to every
   lot that producer registers.
8. As the database, I want spec values to carry the same scale and range
   checks as `lots`, and to be stored all-or-none, so that partial
   specifications cannot exist.
9. As an explorer visitor, I want the origin fiche centred on one lot's
   3D stage and declared metrics — the mine's production profile — rather
   than a list of lots to browse.
10. As an explorer visitor, I want the origin's available tonnage and
    plant capacity in the fiche header.
11. As an explorer visitor, I want the origin's public source references
    reachable from the fiche.
12. As an explorer visitor, I want a "Conectar con productor" contact
    button, so that I can reach the producer without an in-app contract
    flow.
13. As an explorer visitor, I want plant certificate and public passport
    links to keep working from the fiche.
14. As an explorer visitor of an origin with no indexed lots, I want the
    existing empty state.

## Implementation Decisions

- **Schema**: `companies` gains three nullable numeric columns —
  `purity_pct`, `water_footprint_m3_per_tonne`,
  `carbon_footprint_kg_co2e_per_tonne` — with the same scale and range
  checks as `lots` (purity ×100 integral within 99.50–100.00; water and
  carbon ×100 integral within the u64-scaled range). An all-or-none check
  requires the three to be null together or set together. No
  `company_type` restriction: seeds only populate producer rows.
  One new migration; `docs/database.md` and `supabase/seed.sql` updated
  (producer demo rows receive spec values).
- **Registration page**: the server component already selects the
  session's company row; it additionally selects the three spec columns
  and passes them through `ProducerInfo`. A missing spec set renders a
  `GateCard` ("provisioned by the operator"), same pattern as the
  `origin_id` gate — the admin guarantees provisioned specs, so this is a
  data-provisioning gate, not user input.
- **Registration form**: the "Producción y sostenibilidad" and
  "Comercial" cards are deleted; volume and price inputs move into the
  "Identificación" grid. The Production Specification renders read-only
  alongside the origin field. `LotFormValues` loses the three spec
  fields; `validateLotForm` takes the spec values from the producer
  context instead of form values and produces the identical scaled
  payload (`purityBasisPoints`, `waterM3PerTonneScaled`,
  `carbonKgCo2ePerTonneScaled`).
- **Counterparties endpoint**: unchanged — specs are the producer's own,
  not the buyer's.
- **Origin modal**: single centred column (replaces the two-column grid):
  the 3D `LotStage`, `LotMetrics`, certificate/provenance block, passport
  block, and `OriginReference` at the bottom. Lot shown: first `listed`,
  else first non-listed — no lot switcher. Header stats keep only
  "Disponible" and "Capacidad". Footer is a single centred
  "Conectar con productor" button rendered as a `mailto:` anchor; the
  target address is a placeholder constant to be configured later.
- **Removed from the modal**: the contract-request banner and its state
  machine (`handleRequestContract`, producer/contract fetches), all five
  lifecycle handlers (fund, redeem, dispute, claim, cancel) and their
  generated-instruction/ATA/memo imports, `useQuantizedNow`, sort state,
  `selectedPda`, and the unused `filter` prop (including its call site).
  Exports that become dead in `lot-display.tsx` (`SortSelect`,
  `sortLots`, `SortKey`, `LotRow`) are deleted — no compatibility
  retention.
- **Skeleton**: `FicheSkeleton` becomes a single-column placeholder.
- **Vocabulary**: `GLOSSARY.md` defines **Production Specification**
  (already added during the grill). ADR 0020 records the decision that a
  lot's declared specs are sourced from the producer's company record.
- **Display semantics**: `lots` keeps its NOT NULL spec columns, still
  populated by the indexer decoding `create_lot` args — so the modal,
  passport and buyer portfolio keep reading per-lot values unchanged.

## Testing Decisions

- Good tests assert external behaviour (valid payload in, scaled values
  out; constraint violations rejected), not layout or internals.
- **Form validation** (existing seam): `validateLotForm` vitest suite is
  updated — spec values now arrive via the producer context; assert the
  scaled payload matches the previous contract and that volume/price/
  buyer/claimable/cert validation is unchanged.
- **Schema** (existing seam): a pgTAP-style test alongside
  `supabase/tests/database/*.test.sql` covering the new `companies`
  checks — scale enforcement, purity range, all-or-none rejection.
- **UI**: the codebase has no component-test seam; modal and form are
  verified manually in dev (register a lot on devnet, open the origin
  fiche).

## Out of Scope

- The buyer-side "reclamar lote" section in `/account` — a follow-up
  feature. Interim consequence: no UI remains for fund/redeem/dispute/
  claim/cancel until that lands; accepted for the demo timeline.
- An admin UI for editing production specs — seeds/SQL suffice for now.
- Anchor program, Codama client, and the `lots` table — untouched.
- The explorer list view (`assets-list-view`) and the public passport —
  unchanged.
- Blockchain-review findings 1–2 (`docs/blockchain-review-2026-10-06.md`)
  — tracked separately.
- A real contact address behind "Conectar con productor" — placeholder
  mailto, configured later.

## Further Notes

- Producer↔origin is a fixed 1:1 binding (ADR-0006/0007), so recording the
  Production Specification on the company row is equivalent to recording
  it on the origin; the company row is chosen because the registration
  page already loads it.
- If an origin has several indexed lots, the fiche shows the first
  `listed` one (else the first settled) — the modal no longer exposes
  switching. Accepted: the fiche's purpose is the mine's profile, not lot
  comparison.
- Dead-code cleanup is part of the change, per the project rule against
  compatibility layers.
