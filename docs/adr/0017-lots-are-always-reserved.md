# Every lot is created reserved to a designated buyer

`create_lot` requires a `buyer`: every lot is born reserved to a buyer company holding an accepted company contract, and only that buyer's verified wallet can settle it. There is no spot purchase and no open market — discovery and negotiation happen off-chain through the B2B directory and company contracts (buyer → producer, per ADR-0008).

An open spot market was rejected: it contradicts how these B2B deals actually close and would add a public purchase path the protocol does not need. This also supersedes the spot/reserved batch split of ADR-0001.
