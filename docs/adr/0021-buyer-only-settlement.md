# Settlement releases only on buyer redemption

Partially supersedes [ADR-0019](./0019-escrowed-dvp-settlement.md): the escrowed funding and atomic release design stands; the Timeout Claim, the Claimable After window and the Dispute state are removed.

## Context

ADR-0019 gave the producer a unilateral exit from buyer hold-up: after a per-lot `claimable_after` timestamp, `claim_timeout` released the escrow to the producer. The `raise_dispute` instruction was later removed, leaving `disputed` as a legacy state that still paused the timeout clock. The result was a lifecycle of six statuses, two settlement paths, a configurable claim window on `Config`, a per-lot deadline on `Lot`, and UI surface (claim-date input, dispute mediation panels, timeout indicators) for behaviour the demo never exercised — there was no claim button in the UI and no way to open a dispute.

## Decision

The lifecycle reduces to `listed → funded → redeemed` with `listed → cancelled` as the only branch:

- `claim_timeout` is deleted. Redemption is the sole settlement path after funding.
- `claimable_after` is deleted from `create_lot` and the `Lot` account; `claim_min_secs`/`claim_max_secs` are deleted from `Config` and `initialize`.
- `LotStatus` reduces to `Listed | Funded | Redeemed | Cancelled`; `redeem_lot` requires `Funded`.
- The index drops `claimable_after`, `claim_tx_signature` and `dispute_tx_signature`, and the `lot_status` enum loses `disputed`/`claimed` (existing rows in those states are deleted by the migration — the demo re-seeds).
- The account layouts change, so the program is redeployed to Devnet and Config is re-initialized.

## Consequences

A `funded` lot has exactly one exit: the designated buyer's `redeem_lot` signature. If the buyer never confirms, the escrowed USDC stays locked in the Lot PDA's escrow permanently — there is no timeout, refund, dispute or admin-rescue path. This is an accepted protocol risk for the demo: the narrative simplifies to "the escrow only releases on the buyer's confirmation", and the producer's protection against an unresponsive buyer lives entirely off-chain in the commercial contract. Before any mainnet consideration, this decision must be revisited — escrow permanence with real value is a fund-loss vector, not just a UX gap.
