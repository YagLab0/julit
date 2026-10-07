# 01: Production Specification columns on companies

**What to build:** the demo operator can record a producer's Production
Specification — purity, water footprint, carbon footprint — on its company
row, with the same scale and range guarantees the `lots` table enforces.
Producer demo rows carry spec values out of the seed, and the decision is
documented.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Migration adds `purity_pct`, `water_footprint_m3_per_tonne`,
      `carbon_footprint_kg_co2e_per_tonne` to `companies`, all nullable.
- [ ] Each column carries the `lots` scale/range check when set (purity
      ×100 integral within 99.50–100.00; water and carbon ×100 integral
      within the u64-scaled range).
- [ ] An all-or-none check rejects rows where only some of the three are
      set; no `company_type` restriction.
- [ ] `supabase/seed.sql` gives the two producer demo companies spec
      values.
- [ ] A pgTAP-style test under `supabase/tests/database/` covers the
      checks: scale enforcement, purity range, all-or-none rejection.
- [ ] `docs/database.md` documents the new columns.
- [ ] `docs/adr/0020-*.md` records that a lot's declared specs are sourced
      from the producer's company record (not per-lot input, not a new
      table).
