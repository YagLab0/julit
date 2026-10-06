begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'spec-company-' || n || '@example.test'
from generate_series(1, 4) as n;

insert into public.companies (id, name, company_type, origin_id) values
  ('00000000-0000-0000-0000-000000000001', 'Spec producer', 'producer', 'pena_blanca'),
  ('00000000-0000-0000-0000-000000000002', 'Spec buyer', 'buyer', null);

set local role service_role;

select results_eq($$
  update public.companies
    set purity_pct = 99.55,
        water_footprint_m3_per_tonne = 50.80,
        carbon_footprint_kg_co2e_per_tonne = 8200.00
    where id = '00000000-0000-0000-0000-000000000001'
    returning purity_pct::text, water_footprint_m3_per_tonne::text,
              carbon_footprint_kg_co2e_per_tonne::text$$,
  $$values ('99.55'::text, '50.80'::text, '8200.00'::text)$$,
  'A producer carries a complete Production Specification');

select throws_ok($$update public.companies set purity_pct = 99.49
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Spec purity below battery grade is rejected');
select throws_ok($$update public.companies set purity_pct = 100.01
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Spec purity above 100 percent is rejected');
select throws_ok($$update public.companies set purity_pct = 99.555
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Spec purity is not silently rounded to two decimals');
select throws_ok($$update public.companies set water_footprint_m3_per_tonne = -0.01
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Negative spec water footprint is rejected');
select throws_ok($$update public.companies set water_footprint_m3_per_tonne = 50.805
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Spec water footprint is not silently rounded');
select throws_ok($$update public.companies set carbon_footprint_kg_co2e_per_tonne = 8200.005
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Spec carbon footprint is not silently rounded');

select throws_ok($$
  insert into public.companies (id, name, company_type, purity_pct)
    values ('00000000-0000-0000-0000-000000000003', 'Partial spec', 'producer', 99.60)$$,
  '23514', null, 'A partial Production Specification is rejected');
select throws_ok($$update public.companies set purity_pct = null
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Removing a single spec value is rejected');

select lives_ok($$update public.companies
  set purity_pct = null,
      water_footprint_m3_per_tonne = null,
      carbon_footprint_kg_co2e_per_tonne = null
  where id = '00000000-0000-0000-0000-000000000001'$$,
  'Clearing the whole Production Specification is allowed');
select lives_ok($$update public.companies
  set purity_pct = 99.60,
      water_footprint_m3_per_tonne = 70.00,
      carbon_footprint_kg_co2e_per_tonne = 7500.00
  where id = '00000000-0000-0000-0000-000000000002'$$,
  'Spec columns carry no company_type restriction');

reset role;
select * from finish();
rollback;
