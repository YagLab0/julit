# Atomic delivery-vs-payment settlement

Settlement is a single Solana transaction (`settle_lot`): the buyer's USDC payment splits to the producer and to treasury (the take rate), and the lot's digital title leaves escrow to the buyer, atomically. Either both legs execute or neither does. This supersedes the simulated completion of ADR-0002: the transaction is real, though it runs on Devnet with a valueless demo mint (ADR-0018).

A sequential pay-then-deliver design was rejected because it reintroduces exactly the settlement risk the pivot exists to remove. Physical delivery still happens off-chain; the protocol guarantees the title-vs-payment exchange, not the cargo.
