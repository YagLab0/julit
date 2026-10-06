# Completion represents simulated settlement

_Superseded by [ADR-0012](./0012-escrowed-dvp-settlement.md) — completion is now escrowed DvP settlement with real USDC._

For this delivery, completing a batch records a simulated purchase on Solana without transferring USDC or other tokens. Although the broader JuLit product description proposes atomic USDC settlement, the SRS explicitly permits simulation and that option was selected for this delivery. The application and database must not present completion as evidence that funds were received.
