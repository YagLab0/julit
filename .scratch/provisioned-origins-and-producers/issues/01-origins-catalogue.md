# 01: Origins catalogue in the database

**What to build:** The two Origins — Olaroz and Cauchari-Olaroz — become the database's origin catalogue: each row carries the short name, code, salar, operating Producer's display name, shareholders, processing-plant coordinates, and its reference block (capacity, altitude when published, water-footprint reference when published, note, source label and URL). Anonymous readers select origins as before, and every identifier in the demo matches the database exactly.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] `origins` has the enriched explicit columns — name, unique code, salar, producer, shareholders, longitude/latitude constrained to valid ranges, capacity_tpa greater than zero, nullable altitude_m and water_m3_per_tonne, note, source_label, source_url — with public read unchanged.
- [x] Both Origins hold the exact values from the parent spec (Spanish display strings and SEC source URLs verbatim); nulls where no published value exists; no invented values.
- [x] No identifier rename: `cauchari_olaroz` is kept after merge reconciliation; the new migration only enriches the existing rows and never edits applied migrations.
- [x] pgTAP covers both rows' values, anonymous select, row constraints (longitude range, non-positive capacity, duplicated code) and a server-role Batch insert referencing `cauchari_olaroz` under the origin-binding and contract triggers.
- [x] Database contract updated with the new origins shape; local workflow green (`supabase test db`: 4 files, 80 tests).

## Comments

Delivered `20261003020000_origins_catalogue.sql` and `origins_catalogue.test.sql` (TDD: red on the missing `code` column, green after the migration). The `cauchari-olaroz` rename was dropped during implementation once the parallel producer-binding workstream landed using `cauchari_olaroz` everywhere.
