# 04: Map reads Origins from Supabase; mock Batches removed

**What to build:** The demo batches view loads Origins from the database through the anonymous client (with loading and error states) instead of the static module, and every simulated Batch disappears: no prices, event histories, report digests or demo report links anywhere in the UI. Batch-dependent surfaces degrade to empty or zero; the static module keeps only real geographic reference (salar polygons, other salares, export routes and ports, with attribution).

**Blocked by:** 01 — Origins catalogue in the database.

**Status:** done

- [x] The view fetches origins anonymously and renders both Origins with their catalogue fields; explicit loading and error states; no session required.
- [x] The mock batch fixtures and the static Origins records are deleted together with any component code that only rendered invented batch content (`batch-model`, batch metrics/cards/sorters); no simulated batch survives anywhere in the repository or build output.
- [x] Origin summaries show an empty/zero state ("Sin lotes registrados en este origen.") without fabricating counts or prices.
- [x] The static data module contains only geographic reference data with sources; no Origin or Batch records remain; salar and route `originId`s are aligned to the database identifier `cauchari_olaroz`.
- [x] Build and lint pass; the map's visual limitation is reported (no browser verification available).

## Comments

Delivered via subagent (`OriginsMapRefactor`) and reviewed by the parent: new `app/batches/data/origins.ts` (row type, `ORIGIN_COLUMNS`, coordinates helper), page-level anonymous fetch with Spanish loading/error copy, mock deletions verified by grep, `pnpm build`/`pnpm lint` green. Unverified visually: MapLibre markers, WebGPU glow, Three.js placement, basemaps and responsive layouts.
