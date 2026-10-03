# Producer origin binding and mutual-consent company contracts

A producer company operates exactly one origin. Companies gain a fixed
`origin_id`, assigned at onboarding: required for producers, empty for
auditors and buyers. Batches derive their origin from the producer's
profile rather than a submitted field, and the index validates that a
batch's origin matches the producer's bound origin.

Producers maintain business contracts with auditor and buyer companies. A
company contract is created by the producer and accepted by the
counterparty (mutual consent, statuses `pending`/`accepted`/`revoked`).
Only accepted contracts scope which counterparties a producer may
designate as a batch's auditor or reserved buyer.

Contracts are off-chain business rules the Solana program cannot observe.
The index therefore rejects batches that reference a counterpart without
an accepted contract; a producer bypassing the UI on-chain only makes
their own batch unindexable. ESG approval and EU regulation assessment
remain auditor declarations made at certification — they are never
producer input at registration.
