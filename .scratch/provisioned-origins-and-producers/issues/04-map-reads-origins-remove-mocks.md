# 04: Map reads Origins from Supabase; mock Batches removed

**What to build:** The demo batches view loads Origins from the database through the anonymous client (with loading and error states) instead of the static module, and every simulated Batch disappears: no prices, event histories, report digests or demo report links anywhere in the UI. Batch-dependent surfaces degrade to empty or zero; the static module keeps only real geographic reference (salar polygons, other salares, export routes and ports, with attribution).

**Blocked by:** 01 — Origins catalogue in the database.

**Status:** ready-for-agent

- [ ] The view fetches origins anonymously and renders both Origins with their catalogue fields; explicit loading and error states; no session required.
- [ ] The mock batch fixtures and the static Origins records are deleted together with any component code that only rendered invented batch content; no simulated batch survives anywhere in the repository or build output.
- [ ] Origin summaries show a zero/empty state without fabricating counts or prices.
- [ ] The static data module contains only geographic reference data with sources; no Origin or Batch records remain.
- [ ] Build and lint pass; the map's visual limitation is reported in the implementation notes (no browser verification).
