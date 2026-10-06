# Certification is declared at plant level, not audited per lot

The auditor role is removed entirely — from the program, schema, contracts, API, and UI. Industry feedback established that real lithium operations certify plants, not individual lots. The producer uploads a plant certificate (PDF) whose SHA-256 is declared on each lot (`plant_cert_hash`); public verification recomputes the hash and proves the document matches the recorded digest, without proving the truth of its contents.

This supersedes ADR-0001 (per-batch auditor designation) and ADR-0004 (auditor declarations and shared evidence). The hash-verification mechanism is unchanged; it moves from batch scope to plant scope.
