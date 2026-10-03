# 01: Origins catalogue in the database

**What to build:** The two Origins — Olaroz and Cauchari-Olaroz — become the database's mine catalogue: each row carries the short name, code, salar, operating Producer's display name, shareholders, processing-plant coordinates, and its reference block (capacity, altitude when published, water-footprint reference when published, note, source label and URL). The Cauchari-Olaroz identifier is normalized to `cauchari-olaroz`. Anonymous readers select origins as before, and every identifier in the demo matches the database exactly.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `origins` has the enriched explicit columns — name, unique code, salar, producer, shareholders, longitude/latitude constrained to valid ranges, capacity_tpa greater than zero, nullable altitude_m and water_m3_per_tonne, note, source_label, source_url — with public read unchanged.
- [ ] Both Origins hold the exact values from the parent spec (Spanish display strings and SEC source URLs verbatim); nulls where no published value exists; no invented values.
- [ ] One new migration renames `cauchari_olaroz` to `cauchari-olaroz`; applied migrations are never edited; no reference to the old identifier remains in the repository.
- [ ] pgTAP covers both rows' values, absence of the old identifier, anonymous select on origins, and a server-role Batch insert referencing `cauchari-olaroz`.
- [ ] Database contract updated with the new origins shape; local workflow green (reset or migration up, `supabase test db`, advisors gate without warnings).
