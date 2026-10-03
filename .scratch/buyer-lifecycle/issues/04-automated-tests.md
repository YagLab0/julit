# Issue 04: Automated Unit & API Route Tests

**Status:** closed
**Spec:** `../spec.md`

## Description

Provide comprehensive automated test coverage for Web Crypto verification and the simulated purchase completion route.

## Acceptance Criteria
- [x] Web Crypto SHA-256 verification tests (`app/batch/passport-verification.test.ts`).
- [x] Validation unit tests for `POST /api/batches/complete` (`app/api/batches/complete/validation.test.ts`) covering:
  - Valid PDA & signature format (base58 regex)
  - Invalid PDA & signature formats (400)
  - Unauthenticated / missing company profile (403)
  - Non-buyer company types (producer, auditor) (403)
  - Unlinked wallet (403)
  - Non-existent batch (404)
  - Already completed batch (409)
  - Non-audited batch (e.g. status = created) (409)
  - Reserved batch third-party attempt (403)
  - Reserved batch designated buyer approval (200)
  - Open spot batch buyer approval (200)
