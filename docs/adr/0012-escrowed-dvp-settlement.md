# Settlement escrows the payment; redemption releases it

Supersedes [ADR-0002](./0002-completion-is-simulated-settlement.md) (simulated settlement) and the pay-first flow proposed in the pivot plan.

## Context

The pivot plan specified `settle_lot` as an atomic transfer: buyer's USDC goes directly to the producer while the escrowed NFT goes to the buyer, and `redeem_lot` burns the NFT as a post-payment receipt. Adversarial review (`.scratch/business-model-validation/`) found two defects in that ordering:

- The buyer pays the full principal _before_ shipment — worse exposure than a letter of credit, which releases only against conforming shipping documents.
- `redeem` had no economic incentive: post-payment, burning the NFT gives the buyer nothing, so lots would stall in `settled` forever.

## Decision

`settle_lot` is renamed `fund_lot` and deposits the full lot price into an escrow token account owned by the Lot PDA. `redeem_lot` — the buyer's confirmation of physical receipt — burns the Digital Title inside escrow and releases the funds to the producer minus the Take Rate. Redemption is the payment trigger: delivery-vs-payment becomes mechanical rather than metaphorical.

Supporting semantics, all decided with the pivot:

- **Claimable After**: a per-lot timestamp set at `create_lot`. Once passed without buyer action, the producer unilaterally claims the escrow via `claim_timeout` (burns the Digital Title, same Take Rate, status `claimed`). This is the producer's remedy against buyer hold-up — the same shape a letter of credit gives the seller.
- **Dispute**: the buyer may flag a funded lot via `raise_dispute`, freezing the timeout. There is no on-chain arbiter and no refund path in v1; the buyer's only forward action is Redemption (releasing funds = off-chain resolution in the producer's favor). A disputed lot with no resolution stays frozen — accepted risk.
- **Digital Title never leaves escrow**: minted to the escrow at `create_lot`, burned at Redemption or Timeout Claim. Because it is never held by a wallet, transfer-in-transit attacks are impossible by construction; no Token-2022 non-transferable extension is needed.
- **Cancellation**: the producer may `cancel_lot` at any time before Funding; after Funding the only exits are Redemption, Timeout Claim, or freeze via Dispute.
- **Take Rate**: charged only on release to the producer (Redemption or Timeout Claim) — revenue follows completed settlements, never funding or cancellation.

## Consequences

The escrowed USDC sits in a program-controlled account with real economic value, making the program a honeypot and shifting JuLit's risk profile: before mainnet this requires a security audit, a multisig or immutable upgrade authority, and a legal opinion on intermediary obligations. The producer now bears buyer hold-up risk between funding and Claimable After — the deliberate mirror of the LC shape the model replaces. A refund path for disputes resolved in the buyer's favor is explicitly deferred to a later version.
