# Issue 01: Public Passport Route & Zero-Trust Verification

**Status:** closed
**Spec:** `../spec.md`

## Description

Implement the public passport route at `app/batch/[pda]/page.tsx` and client component `app/batch/[pda]/passport-client.tsx`.

## Acceptance Criteria

- [x] Route loads in under 1 second without 3D map canvas.
- [x] Displays chemical purity, water footprint, carbon footprint, ESG audit approval, and EU Battery Regulation evaluation.
- [x] Generates dynamic QR code for public access and mobile scanning.
- [x] Zero-Trust verification: downloads laboratory certificate PDF from Supabase Storage, hashes in browser via `crypto.subtle.digest("SHA-256")`, and compares against on-chain hash.
- [x] Displays verification badge (verified, mismatch, or error).
