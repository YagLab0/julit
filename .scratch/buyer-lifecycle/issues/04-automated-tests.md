# Issue 04: Automated Unit & API Route Tests

**Status:** in-progress
**Spec:** `../spec.md`

## Description

Provide comprehensive automated test coverage for Web Crypto verification and the simulated purchase completion route.

## Acceptance Criteria
- [x] Web Crypto SHA-256 verification tests (`app/batch/passport-verification.test.ts`).
- [ ] API Route tests for `POST /api/batches/complete` (`app/api/batches/complete/route.test.ts`) covering:
  - Unauthenticated requests (401)
  - Non-buyer companies (403)
  - Unlinked wallet (403)
  - Invalid PDA or signature format (400)
  - Batch not found (404)
  - Batch not in audited status (409)
  - Reserved batch third-party attempt (403)
  - Successful settlement update (200)
