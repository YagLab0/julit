# Contract initiation direction per party pair

[ADR-0006](./0006-producer-origin-binding-and-company-contracts.md) made the
producer the initiator of every company contract. The buyer relationship is
commercially different: it is the buyer who wants to lock supply from a
producer, so the buyer initiates and the producer accepts.

Initiation direction is fixed per party pair:

- **Producer ↔ auditor**: the producer initiates (it chooses who audits it).
- **Producer ↔ buyer**: the buyer initiates (it seeks supply); the producer
  accepts or declines.

No other pair may initiate a contract, and the initiator is never a
submitted field — it is derivable from the pair's company types. The
`company_contracts` table keeps its shape (`producer_id`,
`counterparty_id`, `status`); `counterparty_id` remains the non-producer
party, which is the auditor or the buyer regardless of who offered.

Consequences: the API enforces both directions (`POST` rejects a producer
offering to a buyer, and rejects any pair outside the two flows);
`PATCH` lets the _responder_ act — the counterparty for producer-auditor
contracts, the producer for buyer-producer ones. The responder is derived
from the same type rule, so no `initiated_by` column exists. Accepted
contracts keep feeding the batch form's counterparty options unchanged:
the reserved-buyer dropdown lists buyers holding an accepted contract
regardless of who offered it. Pending buyer offers surface in the
producer's account as an inbox separate from its auditor-contract
management.
