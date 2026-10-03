begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'contract-company-' || n || '@example.test'
from generate_series(1, 4) as n;

insert into public.companies (id, name, company_type, wallet_address, wallet_verified_at, origin_id) values
  ('00000000-0000-0000-0000-000000000001', 'Producer One', 'producer', repeat('2', 31) || '2', now(), 'olaroz'),
  ('00000000-0000-0000-0000-000000000002', 'Auditor One', 'auditor', repeat('3', 31) || '3', now(), null),
  ('00000000-0000-0000-0000-000000000003', 'Buyer One', 'buyer', repeat('4', 31) || '4', now(), null),
  ('00000000-0000-0000-0000-000000000004', 'Producer Two', 'producer', repeat('5', 31) || '5', now(), 'cauchari_olaroz');

set local role service_role;

select throws_ok($$insert into public.companies (id, name, company_type, origin_id)
    values ('00000000-0000-0000-0000-000000000010', 'Bad auditor', 'auditor', 'olaroz')$$,
  '23514', null, 'An auditor cannot carry an origin');

select throws_ok($$update public.companies set origin_id = 'cauchari_olaroz'
    where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'A bound origin cannot be changed once set');

select lives_ok($$insert into public.company_contracts (producer_id, counterparty_id)
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002')$$,
  'A producer can offer a contract to an auditor');

select results_eq($$select status::text from public.company_contracts
    where producer_id = '00000000-0000-0000-0000-000000000001'$$,
  $$values ('pending')$$,
  'New contracts start pending');

select throws_ok($$insert into public.company_contracts (producer_id, counterparty_id)
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002')$$,
  '23505', null, 'The same producer-counterparty pair cannot duplicate');

select throws_ok($$insert into public.company_contracts (producer_id, counterparty_id)
    values ('00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'Only a producer can be the contract producer');

select throws_ok($$insert into public.company_contracts (producer_id, counterparty_id)
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000004')$$,
  '23514', null, 'A producer cannot be a contract counterparty');

select throws_ok($$update public.company_contracts set status = 'accepted'
    where producer_id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Accepting without responded_at violates consistency');

update public.company_contracts
set status = 'accepted', responded_at = now()
where producer_id = '00000000-0000-0000-0000-000000000001';

insert into public.company_contracts (producer_id, counterparty_id)
values ('00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000003');
update public.company_contracts
set status = 'accepted', responded_at = now()
where counterparty_id = '00000000-0000-0000-0000-000000000003';

-- Batch indexing: uncontracted auditor is rejected, accepted contract is fine.
select throws_ok($$insert into public.batches (
    pda_address, batch_id, producer_wallet, auditor_wallet, origin_id,
    volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc
  ) values (
    repeat('6', 44), 'LIT-T1', repeat('5', 31) || '5', repeat('3', 31) || '3',
    'cauchari_olaroz', 10, 99.5, 50, 8000, 1000
  )$$,
  '23514', null, 'An auditor without a contract with that producer is rejected');

select throws_ok($$insert into public.batches (
    pda_address, batch_id, producer_wallet, auditor_wallet, origin_id,
    volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc
  ) values (
    repeat('6', 44), 'LIT-T2', repeat('2', 31) || '2', repeat('3', 31) || '3',
    'cauchari_olaroz', 10, 99.5, 50, 8000, 1000
  )$$,
  '23514', null, 'A batch origin differing from the producer origin is rejected');

select lives_ok($$insert into public.batches (
    pda_address, batch_id, producer_wallet, auditor_wallet, origin_id,
    volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc, creation_tx_signature, observed_slot
  ) values (
    repeat('6', 44), 'LIT-T3', repeat('2', 31) || '2', repeat('3', 31) || '3',
    'olaroz', 10, 99.5, 50, 8000, 1000, repeat('9', 88), 123456
  )$$,
  'A batch with an accepted auditor contract and matching origin is indexed');

select throws_ok($$insert into public.batches (
    pda_address, batch_id, producer_wallet, auditor_wallet, reserved_buyer_wallet,
    origin_id, volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc
  ) values (
    repeat('7', 44), 'LIT-T4', repeat('5', 31) || '5', repeat('3', 31) || '3',
    repeat('4', 31) || '4', 'cauchari_olaroz', 10, 99.5, 50, 8000, 1000
  )$$,
  '23514', null, 'A reserved buyer without a contract with that producer is rejected');

select lives_ok($$insert into public.batches (
    pda_address, batch_id, producer_wallet, auditor_wallet, reserved_buyer_wallet,
    origin_id, volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc, creation_tx_signature, observed_slot
  ) values (
    repeat('7', 44), 'LIT-T5', repeat('2', 31) || '2', repeat('3', 31) || '3',
    repeat('4', 31) || '4', 'olaroz', 10, 99.5, 50, 8000, 1000, repeat('9', 88), 123456
  )$$,
  'A reserved buyer holding an accepted contract is indexed');

set local role anon;
select throws_ok($$select * from public.company_contracts$$,
  '42501', null, 'Anonymous clients cannot read company contracts');
select throws_ok($$insert into public.company_contracts (producer_id, counterparty_id)
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'Anonymous clients cannot create company contracts');

reset role;
select * from finish();
rollback;
