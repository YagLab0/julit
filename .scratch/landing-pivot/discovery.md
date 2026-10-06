# Discovery: landing pivot to atomic lot settlement

Grill-with-docs session for updating the public landing (`/`) following
`.scratch/atomic-lot-settlement/pivot-changes.pdf`. Decisions confirmed by the
user across two rounds; the landing spec and tickets are not written yet.

## Context

- The pivot (`atomic-lot-settlement`) replaces per-batch micro-audits with an
  atomic delivery-vs-payment protocol: `create_lot` (NFT to escrow) →
  `settle_lot` (DvP) → physical delivery → `redeem_lot` (burn).
- The pivot is not implemented yet; the demo still shows the previous model.
- The current landing at `/` describes the old model (Producer–Auditor–Buyer,
  Audit Certificate, Simulated Settlement).

## Confirmed decisions

1. **Landing ahead of code.** The landing describes the new model now. Demo
   links stay in the copy, but the landing is not deployed publicly before the
   new demo is ready — a publication rule in the spec, no gating code.
2. **Scratch slug.** This feature lives at `.scratch/landing-pivot/`; the old
   `.scratch/landing/` remains as historical record.
3. **Section architecture** (8 sections):
   1. Hero — same salar photography; settlement-forward headline; scope note
      changes to Devnet/test tokens.
   2. Problem/solution — settlement risk, digital title as common reference,
      plant-level certification, verifiable lifecycle trail.
   3. Process — single 5-step lifecycle chain (Discover → Tokenize → Settle →
      Deliver → Redeem), on-chain steps highlighted. The three existing
      process widgets are retired, including the big bag 3D.
   4. Passport — redefined as the public record of the lot's title and
      lifecycle. Six rows: lot/origin/producer; quantity/purity/price; plant
      certificate (SHA-256); digital title (mint/escrow); lifecycle status;
      transactions (create/settle/redeem). Same editorial treatment and
      "conceptual view" disclaimer.
   5. Participant benefits — Producer and Buyer only; the Auditor block is
      removed. Take rate stays off the landing.
   6. FAQ — new set: demo token value, what the digital title is, what plant
      certificate verification proves, off-chain physical delivery,
      no spot purchases, fictional demo identities.
   7. Team — unchanged.
   8. Dark close — unchanged.
4. **Language.** Plain Spanish first: "título digital", "liquidación atómica
   (entrega contra pago)". Technical terms (NFT, USDC, Solana Devnet) live in
   step descriptions and the FAQ.
5. **"Pasaporte" survives** as the name of the public lot record.
6. **Demo route.** The new demo surface is called **explorer** (`/explorer`);
   the spec names the CTA target accordingly (final path confirmed at
   implementation).
7. **Headline direction (b)**: keep "Del salar al mercado" continuity and add
   settlement — e.g. "Del salar al mercado, con liquidación atómica". Exact
   copy to be drafted in the spec for approval.
8. **Claims discipline**: "elimina el riesgo de liquidación" (not counterparty
   risk); the digital title is not automatic legal title; plant certificate
   hash proves integrity, not truth; physical delivery is off-chain.

## Docs written during this session

- `GLOSSARY.md` rewritten to pivot vocabulary (Lot, Digital Title, Escrow,
  Atomic Settlement, Take Rate, Redemption, Plant Certificate, dUSDC,
  Explorer, …). Removed: Auditor, Audit Certificate, Spot/Reserved Batch,
  Simulated Settlement, ESG/EU evaluation terms.
- ADRs superseded: 0001 (→ 0016, 0017), 0002 (→ 0014), 0004 (→ 0016).
- New ADRs: 0014 atomic DvP settlement; 0015 NFT digital title + Lot PDA
  lifecycle; 0016 plant-level certification; 0017 always-reserved lots;
  0018 project-owned dUSDC mint.
- Fixed a numbering collision: `0008-buyer-portfolio…` → ADR-0012 and
  `0009-public-passport-scope` → ADR-0013, with references updated in
  `.scratch/` and `app/batch/`.

## Open for to-spec

- Exact Spanish copy for all sections (draft for user approval).
- Whether `docs/landing.md` gets superseded at implementation time.
- Passport row for water/carbon footprint: dropped in favour of the plant
  certificate row; revisit if the metrics warrant their own row.
