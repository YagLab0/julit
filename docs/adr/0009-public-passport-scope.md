# Every indexed batch has a public passport, as a product record

The public passport at `/batch/<PDA_ADDRESS>` exists for every batch in the public index, not only for certified ones. The page is status-aware: a `created` batch shows its origin, declared production and sustainability metrics, and a certification-pending state with no findings and no certificate; an `audited` or `completed` batch adds the audit certificate and the auditor's findings, displayed explicitly including negative ones ([ADR-0004](./0004-auditor-declarations-and-shared-evidence.md)).

The passport carries the product record the glossary defines — origin, production metrics, sustainability metrics, and certification evidence. Commercial terms stay in the catalogue: Batch Price, reservation and buyer assignment belong to the catalogue and purchase surfaces, never to the passport.

The public index is not seeded with audited batches or stand-in certificates: the audit certificate and its digest comparison render only when a genuinely certified batch is indexed. This extends ADR-0007's no-simulated-batch-content rule to the passport, and the flow is exercised with disposable local fixtures, never with production rows.
