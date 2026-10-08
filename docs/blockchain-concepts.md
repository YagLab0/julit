# Blockchain concepts in JuLit

The concepts the demo relies on, mapped to where they live. Companion
references: [GLOSSARY](../GLOSSARY.md) for domain language,
[end-to-end-flow](./end-to-end-flow.md) for the user journey, and
[ADR-0019](./adr/0019-escrowed-dvp-settlement.md) for the settlement design.

## Solana account model

Programs are stateless; all state lives in **accounts**. JuLit's state is
split between two kinds: program accounts owned by the Julit Anchor program
(`Config`, `Lot`) and token accounts owned by PDAs. The Supabase index is a
read cache — the ledger is the authority.

## Program-Derived Addresses (PDAs)

Deterministic, keyless addresses derived from seeds + the program id:

- `Config` — `[b"config"]`: singleton with admin, `fee_bps`, `usdc_mint`,
  `treasury`, and the claim window bounds.
- `Lot` — `[b"lot", producer_wallet, lot_id]`: the lot's full record
  (metrics, price, designated buyer, `claimable_after`, `spec_sheet_hash`,
  status). The producer wallet is a seed, so each producer has its own
  lot namespace.
- `mint` — `[b"mint", lot]`: the Digital Title mint, bound to its lot.

PDAs have no private key, so only the program can sign for them. Every
instruction re-derives the PDA and checks the stored bump — a forged
account cannot satisfy the seeds constraint.

## Escrow

Token accounts whose authority is the Lot PDA:

- `escrow_title` — holds the single Digital Title token from `create_lot`
  until it is burned.
- `escrow_usdc` — holds the buyer's deposit between Funding and release.

No party — including JuLit — holds keys to these accounts. The program
alone moves their contents, signing via `invoke_signed` with the lot's
seeds.

## The Digital Title (tokenization)

A Metaplex **NonFungible**: mint `decimals = 0`, exactly 1 token minted,
and a Master Edition with `max_supply(0)` that caps supply at one forever.
Metadata is immutable (`is_mutable(false)`, update authority = Lot PDA).

The title represents a **contractual right over the lot** — not the cargo
itself and not automatic legal title. It is deliberately non-transferable:
minted into escrow, never held by a wallet, and **burned** at Redemption,
Timeout Claim, or Cancellation. Transfer-in-transit attacks are impossible
by construction — no Token-2022 extension is needed.

## Atomic settlement (delivery-vs-payment)

Solana transactions are atomic: every instruction succeeds or the whole
transaction reverts. `redeem_lot` and `claim_timeout` use this to fuse two
effects that must never separate — burning the Digital Title and releasing
the escrowed USDC (`price − fee` to the producer, `fee` to treasury).

This removes settlement risk without trusting either party:

- the buyer's payment cannot be released without their confirmation
  (`redeem_lot` requires the designated buyer's signature),
- the producer cannot be held hostage forever — after `claimable_after`
  the clock replaces the buyer's signature (`claim_timeout`).

## State machine

`listed → funded → {redeemed | claimed}`, with `funded → disputed`
(frozen) and `listed → cancelled`. Enforced on-chain: `fund_lot` requires
`Listed`, `redeem_lot` requires `Funded | Disputed`, `claim_timeout`
requires `Funded` — a dispute therefore freezes the timeout. There is no
on-chain refund path in v1: a disputed lot exits only via the buyer
redeeming.

## Signers and constraints

Anchor account constraints express the trust model declaratively:

- role checks: only `lot.buyer` funds/disputes/redeems; only
  `lot.producer` claims/cancels;
- canonical derivation: `associated_token::mint/authority` constraints
  guarantee every token account is the expected ATA;
- settlement mint pinned to `config.usdc_mint`;
- fee math in `u128` with checked arithmetic.

## Anchoring off-chain evidence

The lot spec sheet PDF lives in Supabase Storage; its SHA-256 digest
(`spec_sheet_hash`) is declared on-chain at `create_lot`. The public
passport contrasts the indexed row field-by-field against the decoded
on-chain account — integrity of the record, without trusting the index.

## Cluster and value

Everything runs on **Devnet** with **dUSDC**, a project-owned mint (ADR-0018):
real transactions, real signatures, real state — no economic value. The
same program would settle mainnet USDC by changing `config.usdc_mint`.
