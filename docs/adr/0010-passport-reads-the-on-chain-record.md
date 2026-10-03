# The passport contrasts the indexed batch with its on-chain account

Every passport reads the batch's PDA account from Devnet and contrasts it with the indexed row: the account exists, belongs to the JuLit programme, and its fields — batch id, producer, origin, metrics, status — match. The result is shown explicitly; a missing account or a mismatch is surfaced, never hidden, and the cached index JSON is never treated as canonical ([ADR-0009](./0009-staged-passport-verification.md)).

This is possible now that the programme registers batches on Devnet (`create_batch`) and every indexed batch has a real PDA. For a batch that is not yet certified it is all the Solana verification there is: the certificate digest can only be compared once certification exists on-chain ([ADR-0009](./0009-staged-passport-verification.md)).

An unavailable RPC degrades to an explicit "could not check" state, never to a silent pass, and the read must not defeat the passport's mobile load target.
