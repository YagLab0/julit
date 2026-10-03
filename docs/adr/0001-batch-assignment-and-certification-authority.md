# Batch assignment and certification authority

JuLit supports both spot batches and batches reserved for a designated buyer. The producer designates one auditor per batch rather than relying on a global auditor allowlist. Buyer exclusivity and certification authority must be enforced by the Solana program; storing those assignments only in Supabase would allow direct on-chain callers to bypass them.
