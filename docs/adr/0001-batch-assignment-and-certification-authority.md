# Batch assignment and certification authority

**Status:** superseded by [ADR-0016](./0016-plant-level-certification.md) and [ADR-0017](./0017-lots-are-always-reserved.md) — the auditor role was removed entirely and every lot is now born reserved to a designated buyer.

JuLit supports both spot batches and batches reserved for a designated buyer. The producer designates one auditor per batch rather than relying on a global auditor allowlist. Buyer exclusivity and certification authority must be enforced by the Solana program; storing those assignments only in Supabase would allow direct on-chain callers to bypass them.
