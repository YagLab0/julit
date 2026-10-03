# Issue 02: Simulated Settlement Complete API

**Status:** closed
**Spec:** `../spec.md`

## Description

Implement `POST /api/batches/complete` to record simulated purchase settlement in accordance with ADR-0002.

## Acceptance Criteria
- [x] Enforces authenticated user session.
- [x] Validates caller is a registered `buyer` company with a verified linked wallet.
- [x] Verifies batch existence and confirms batch status is `audited`.
- [x] Enforces `reserved_buyer_wallet` constraint: rejects purchases attempted by unauthorized wallets.
- [x] Updates batch in database to status `completed`, recording `buyer_wallet` and `completion_tx_signature`.
