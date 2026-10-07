begin;

-- ADR-0020: the Production Specification (purity, water and carbon
-- footprints) describes the producer's operation at its bound origin, so it
-- is provisioned on the company row instead of being retyped per lot.
-- Columns stay nullable so buyers and unprovisioned rows remain valid; when
-- set, the same scale and range checks as lots apply, and the three values
-- arrive together or not at all.

alter table public.companies
  add column purity_pct numeric
    check (
      purity_pct is null
      or (purity_pct between 99.50 and 100.00
        and purity_pct * 100 = trunc(purity_pct * 100))
    ),
  add column water_footprint_m3_per_tonne numeric
    check (
      water_footprint_m3_per_tonne is null
      or (water_footprint_m3_per_tonne between 0 and 184467440737095516.15
        and water_footprint_m3_per_tonne * 100 = trunc(water_footprint_m3_per_tonne * 100))
    ),
  add column carbon_footprint_kg_co2e_per_tonne numeric
    check (
      carbon_footprint_kg_co2e_per_tonne is null
      or (carbon_footprint_kg_co2e_per_tonne between 0 and 184467440737095516.15
        and carbon_footprint_kg_co2e_per_tonne * 100 = trunc(carbon_footprint_kg_co2e_per_tonne * 100))
    ),
  add constraint companies_production_spec_complete check (
    (purity_pct is null) = (water_footprint_m3_per_tonne is null)
    and (water_footprint_m3_per_tonne is null)
      = (carbon_footprint_kg_co2e_per_tonne is null)
  );

comment on column public.companies.purity_pct is
  'Production Specification: declared Li2CO3 purity (%), provisioned by the operator.';
comment on column public.companies.water_footprint_m3_per_tonne is
  'Production Specification: declared water per tonne (m3/t), provisioned by the operator.';
comment on column public.companies.carbon_footprint_kg_co2e_per_tonne is
  'Production Specification: declared CO2e per tonne (kg/t), provisioned by the operator.';

commit;
