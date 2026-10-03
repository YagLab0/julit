# Wallet link challenges are single-use

Linking a wallet must prove control of its private key without creating a second authentication mechanism: the Supabase Auth session identifies the company, and the wallet signature only proves ownership of the address (ADR-0003). The database contract requires a domain-bound signed message with expiry and replay protection, so a signature over static text is not enough.

The authenticated API issues a wallet link challenge (`POST /api/companies/wallet/challenge`): a `wallet_link_challenges` row holding a 32-byte random nonce, the account and its email, the wallet address, the request domain, the issue time, and an expiry five minutes later. The client signs the message with the wallet-standard `solana:signMessage` feature and submits `{ nonce, wallet_address, signature }` to `POST /api/companies/wallet`.

The API rebuilds the message from the stored row — never from submitted text — verifies the Ed25519 signature over the exact message bytes, then calls `public.link_company_wallet`, which consumes the challenge and sets `wallet_address` and `wallet_verified_at` in one transaction. The function is executable only by the server role; it is reachable through PostgREST because PostgREST cannot call functions in the non-exposed `private` schema. A failed link keeps the challenge usable; an expired, consumed, or mismatched challenge is rejected. The table is reachable only by the server role; browsers hold no grants.

The signed message, in Spanish because the wallet shows it to the end user:

```text
JuLit: vinculación de wallet

Cuenta: {account_email}
Sitio: {domain}
Wallet: {wallet_address}
Nonce: {nonce}
Emitido: {issued_at}
Expira: {expires_at}
```

Consequences: wallets that modify the signed bytes, such as offchain-message wrapping, are rejected because verification is byte-exact; wallets without `solana:signMessage` cannot link. The company type and wallet never enter JWT claims; application roles stay in `companies` (ADR-0003).
