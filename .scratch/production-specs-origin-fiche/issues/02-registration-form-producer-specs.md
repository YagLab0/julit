# 02: Registration form sources specs from the producer record

**What to build:** registering a lot no longer asks for purity or
footprints — the producer's provisioned Production Specification is shown
read-only and declared on-chain exactly as today. Volume and price move
into the "Identificación" section. A producer without provisioned specs
sees a gate message instead of a form it cannot complete.

**Blocked by:** 01 — Production Specification columns on companies.

**Status:** ready-for-agent

- [ ] The `/explorer/new` page selects the three spec columns on the
      session's company and passes them through `ProducerInfo`.
- [ ] Missing spec set renders a `GateCard` (provisioned-by-operator
      message), same pattern as the `origin_id` gate.
- [ ] The form drops the "Producción y sostenibilidad" and "Comercial"
      cards; volume and price inputs live in the "Identificación" grid.
- [ ] The Production Specification displays read-only in the form (no
      inputs for purity, water or carbon).
- [ ] `validateLotForm` takes spec values from the producer context (not
      form values) and emits the identical scaled payload
      (`purityBasisPoints`, `waterM3PerTonneScaled`,
      `carbonKgCo2ePerTonneScaled`); buyer, volume, price, claimable and
      certificate validation unchanged.
- [ ] `validation.test.ts` updated: specs via context produce the same
      payload; field-level spec errors are gone.
- [ ] The counterparties endpoint and the on-chain `create_lot` call are
      unchanged.
