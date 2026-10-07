# Spec: Buyer section — designated-lot inbox with real lifecycle actions

**Status:** ready-for-agent

## Problem Statement

A buyer company cannot act on lots anywhere in the app. Lots a producer
designates to it are invisible while `listed` — the account page's
portfolio only queries from `funded` onward — and no UI surface signs
`fund_lot`, `redeem_lot`, or `raise_dispute` (tickets 03–06 claimed these
actions existed; only `create_lot` signing was actually built). The entire
buyer leg of the DvP lifecycle exists on-chain and behind RPC-verified API
endpoints but is unreachable, so a designated lot can never be "claimed"
(funded), redeemed, or disputed from the app.

## Solution

Extend the buyer's `/account` section into an actionable surface: a
"Lotes designados" card lists every lot whose `buyer_wallet` is the
company's verified wallet and still awaits a buyer decision, with the
correct action per status — **"Comprar con escrow"** on `listed` (the
buyer's "claim": accepting the designation by depositing the price into
escrow via `fund_lot`), "Confirmar recepción" or dispute on `funded`,
confirm reception on `disputed`. The existing acquired-lots portfolio
becomes the settled-history view. Every action signs a real transaction
through the generated Codama client, is gated to the company's verified
wallet, shows a summary confirmation before signing, and indexes through
the existing verified endpoints. No program, IDL, API, or schema changes.

## User Stories

1. As a buyer, I want a "Lotes designados" card in my account listing
   every lot where my company's verified wallet is the designated buyer
   and the lot still awaits my decision (`listed`, `funded`, `disputed`),
   so that lots the producer sends me are visible the moment they exist.
2. As a buyer, I want each designated lot to show lot id, producer
   identity, origin, volume, purity, price, and `claimable_after`, so I
   can decide without leaving the page.
3. As a buyer, I want an honest empty state when nothing is designated to
   me, pointing me to request contracts so producers can designate me.
4. As a buyer, I want a "Comprar con escrow" action on `listed`
   designated lots that opens a confirmation with the full summary — lot,
   producer, price, `claimable_after` — before signing `fund_lot`, so I
   never lock escrow funds blindly. Claiming a lot means committing the
   payment, not just clicking accept.
5. As a buyer, I want my dUSDC balance checked before funding, with the
   action disabled and an explanatory hint when it cannot cover the lot
   price, so I never hit a cryptic on-chain failure.
6. As a buyer, I want signing `fund_lot` to send the real transaction and
   index it via the verified `POST /api/lots/fund` endpoint, then refresh
   the account so the lot leaves `listed` pending.
7. As a buyer, I want "Confirmar recepción" on `funded` lots to open a
   confirmation explaining that it releases the escrowed payment to the
   producer minus the Take Rate and burns the Digital Title, before
   signing `redeem_lot`.
8. As a buyer, I want "Confirmar recepción" to remain available on
   `disputed` lots, since releasing the escrow is the on-chain resolution
   in the producer's favor.
9. As a buyer, I want a dispute action on `funded` lots whose
   confirmation explains that it freezes the producer's Timeout Claim and
   that my only on-chain exit is Redemption, before signing
   `raise_dispute`.
10. As a buyer, I want `funded` lots to display `claimable_after` and
    whether the producer's Timeout Claim is already live, so I understand
    the clock I am on.
11. As a buyer, I want every action available only when the connected
    wallet is my company's verified wallet — which is the lot's
    `buyer_wallet` — with the existing gate pattern explaining the
    mismatch.
12. As a buyer, I want a toast with a Solana Explorer link after each
    confirmed transaction, and a distinct message when the transaction
    landed on-chain but indexing failed, so I can retry indexing.
13. As a buyer, I want the portfolio card to keep showing terminal lots
    (`redeemed`, `claimed`) as my settled history, without duplicating
    lots that still live in the pending card.
14. As a buyer, I want `cancelled` lots once designated to me hidden — the
    producer withdrew them before funding; they are noise.
15. As a buyer, I want no decline action on a designated lot in v1 — it
    stays in my inbox until I fund it or the producer cancels it; there is
    no on-chain decline.
16. As the platform, I want the whole surface built on the existing index,
    verified transition endpoints, and generated client — no schema, API,
    or program changes.

## Implementation Decisions

- **Data**: the account page's server query widens to include `listed`
  designated lots plus the columns the cards need (`producer_wallet`,
  `claimable_after`, `mint_address`, remaining tx-signature columns) and
  splits rows into pending (`listed`, `funded`, `disputed`) vs history
  (`redeemed`, `claimed`). RLS already allows the read; no schema work.
- **Producer identity**: resolve the producer company name server-side by
  `producer_wallet`; fall back to the ellipsified wallet.
- **Action availability seam**: one new pure module maps
  `(lot status, connected wallet vs lot.buyer_wallet, dUSDC balance,
  now vs claimable_after)` → available actions with labels, disabled
  reasons, and required confirmations. UI renders its verdict; all policy
  lives there.
- **Instruction building** via the generated Codama client:
  `fund_lot` needs `usdcMint` (fetched from the Config PDA, same pattern
  as lot creation); buyer/escrow ATAs auto-resolve. `redeem_lot` needs
  `lot`, `mint` (derived from the lot), `producer`, `treasury` and
  `usdcMint` (from Config); escrow/producer/treasury ATAs auto-resolve.
  `raise_dispute` needs only `lot` + buyer signer.
- **Sign → index → refresh**: reuse the existing send-transaction hook,
  POST `{ lot_pda, tx_signature }` to the matching verified endpoint, then
  `router.refresh()` + toast with Explorer link — the same flow lot
  creation already uses, including the on-chain-ok/index-failed branch.
- **dUSDC balance**: read the buyer's ATA over RPC; a missing ATA counts
  as zero and disables funding with a hint. No ATA auto-creation — an
  empty ATA cannot fund anything.
- **No decline**: a `listed` designated lot the buyer ignores simply stays
  pending; only the producer's `cancel_lot` removes it. No hidden flag, no
  schema column, no notification path.
- **Wallet gating**: the pending card's action area is wrapped in the
  existing verified-wallet gate; per-lot the action also requires
  connected wallet = `buyer_wallet`.
- **Copy**: Spanish UI strings per FRONTEND.md. Funding action label:
  "Comprar con escrow". The word "claim"/"reclamar" is never used for
  buyer actions — it belongs to the producer's Timeout Claim. Reception
  action: "Confirmar recepción".

## Testing Decisions

- Good tests assert external behavior: given a lot state and context, what
  actions are offered and how — not component internals.
- **One new seam**: the pure action-availability module, tested with
  vitest co-located with it (matching `validation.test.ts` /
  `company-contracts.test.ts` / `verify.test.ts` style): status→action
  mapping, wallet-mismatch gating, insufficient-balance disable, dispute
  only from `funded`, redeem from `funded` + `disputed`, no actions on
  terminal states.
- The verified API routes are already covered by `verify.test.ts`; no
  schema change means no pgTAP work.

## Out of Scope

- Producer-side action surface: `claim_timeout` / `cancel_lot` UI and a
  producer lot list — separate follow-up ticket.
- Buyer-side decline of a designation (no on-chain path in v1; producer
  cancels).
- dUSDC faucet/airdrop UI for unseeded wallets.
- Realtime subscriptions; refresh-after-action is sufficient.
- Explorer catalogue, public passport, and landing changes.
- Buyer portfolio features beyond the lifecycle (inventory, regulatory
  reporting).

## Further Notes

- The user's "claimear" maps to **Funding** — accepting the designation
  by depositing the escrowed price (`fund_lot`), surfaced as "Comprar con
  escrow". Do not introduce "claim" wording for buyer actions anywhere.
- "Lotes designados" is a candidate GLOSSARY term (lots designated to a
  buyer still awaiting their decision); Buyer Portfolio stays
  terminal-state history.
- Workflow follow-up: producer action ticket (`claim_timeout`,
  `cancel_lot`, producer's own lot list) — same missing-UI gap on the
  other side.
