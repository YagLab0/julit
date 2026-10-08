begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'contract-company-' || n || '@example.test'
from generate_series(1, 4) as n;

insert into public.companies (id, name, company_type, wallet_address, wallet_verified_at, origin_id) values
  ('00000000-0000-0000-0000-000000000001', 'Producer One', 'producer', repeat('2', 31) || '2', now(), 'pena_blanca'),
  ('00000000-0000-0000-0000-000000000003', 'Buyer One', 'buyer', repeat('4', 31) || '4', now(), null),
  ('00000000-0000-0000-0000-000000000004', 'Producer Two', 'producer', repeat('5', 31) || '5', now(), 'condor'),
  ('00000000-0000-0000-0000-000000000005', 'Buyer Two', 'buyer', repeat('4', 31) || '6', now(), null);

set local role service_role;

delete from public.lots;
delete from public.company_contracts;

select throws_ok($$update public.companies set origin_id = 'condor'
    where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'A bound origin cannot be changed once set');

-- Producer One offers to Buyer One
select lives_ok($$insert into public.company_contracts (producer_id, counterparty_id, initiator_id)
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000001')$$,
  'A producer can offer a contract to a buyer');

select results_eq($$select status::text from public.company_contracts
    where producer_id = '00000000-0000-0000-0000-000000000001'$$,
  $$values ('pending')$$,
  'New contracts start pending');

select throws_ok($$insert into public.company_contracts (producer_id, counterparty_id, initiator_id)
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000001')$$,
  '23505', null, 'The same producer-counterparty pair cannot duplicate');

select throws_ok($$insert into public.company_contracts (producer_id, counterparty_id, initiator_id)
    values ('00000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000003')$$,
  '23514', null, 'Only a producer can be the contract producer');

select throws_ok($$insert into public.company_contracts (producer_id, counterparty_id, initiator_id)
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000004',
            '00000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'A producer cannot be a contract counterparty');

select throws_ok($$insert into public.company_contracts (producer_id, counterparty_id, initiator_id)
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000004')$$,
  '23514', null, 'A third party cannot be the contract initiator');

select throws_ok($$update public.company_contracts set status = 'accepted'
    where producer_id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Accepting without responded_at violates consistency');

update public.company_contracts
set status = 'accepted', responded_at = now(),
    initiator_signature = repeat('s', 88),
    counterparty_signature = repeat('c', 88),
    initiator_signed_at = now(),
    counterparty_signed_at = now()
where producer_id = '00000000-0000-0000-0000-000000000001';

select throws_ok($$update public.company_contracts set initiator_signature = '   '
    where counterparty_id = '00000000-0000-0000-0000-000000000003'$$,
  '23514', null, 'Whitespace-only signature is rejected');

-- Buyer Two initiates a contract with Producer One.
select lives_ok($$insert into public.company_contracts (producer_id, counterparty_id, initiator_id)
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000005',
            '00000000-0000-0000-0000-000000000005')$$,
  'A buyer can initiate a contract request with a producer');

-- Lot indexing: the designated buyer must hold an accepted contract.
select throws_ok($$insert into public.lots (
    pda_address, lot_id, producer_wallet, buyer_wallet, origin_id, mint_address,
    volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc, claimable_after,
    spec_sheet_sha256, creation_tx_signature, observed_slot
  ) values (
    repeat('6', 44), 'LIT-T1', repeat('2', 31) || '2', repeat('4', 31) || '6',
    'pena_blanca', repeat('7', 44), 10, 99.5, 50, 8000, 1000,
    now() + interval '30 days', repeat('a', 64), repeat('6', 63) || '8', 2000
  )$$,
  '23514', null, 'A buyer without an accepted contract with that producer is rejected');

select throws_ok($$insert into public.lots (
    pda_address, lot_id, producer_wallet, buyer_wallet, origin_id, mint_address,
    volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc, claimable_after,
    spec_sheet_sha256, creation_tx_signature, observed_slot
  ) values (
    repeat('6', 44), 'LIT-T2', repeat('2', 31) || '2', repeat('4', 31) || '4',
    'condor', repeat('7', 44), 10, 99.5, 50, 8000, 1000,
    now() + interval '30 days', repeat('a', 64), repeat('6', 63) || '8', 2000
  )$$,
  '23514', null, 'A lot origin differing from the producer origin is rejected');

select lives_ok($$insert into public.lots (
    pda_address, lot_id, producer_wallet, buyer_wallet, origin_id, mint_address,
    volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc, claimable_after,
    spec_sheet_sha256, creation_tx_signature, observed_slot
  ) values (
    repeat('6', 44), 'LIT-T3', repeat('2', 31) || '2', repeat('4', 31) || '4',
    'pena_blanca', repeat('7', 44), 10, 99.5, 50, 8000, 1000,
    now() + interval '30 days', repeat('a', 64), repeat('6', 63) || '8', 2000
  )$$,
  'A lot whose buyer holds an accepted contract and whose origin matches is indexed');

-- Bilateral RLS checks
set local role authenticated;

-- Producer One sees its 2 contracts (Buyer One and Buyer Two)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select results_eq($$select count(*)::int from public.company_contracts$$,
  $$values (2)$$,
  'Producer One sees contracts where it is the producer');

-- Buyer One sees its 1 contract with Producer One
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select results_eq($$select count(*)::int from public.company_contracts$$,
  $$values (1)$$,
  'Buyer One sees contracts where it is the counterparty');

-- Producer Two sees 0 contracts
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select results_eq($$select count(*)::int from public.company_contracts$$,
  $$values (0)$$,
  'Unrelated producer sees 0 contracts');

set local role anon;
select throws_ok($$select * from public.company_contracts$$,
  '42501', null, 'Anonymous clients cannot read company contracts');
select throws_ok($$insert into public.company_contracts (producer_id, counterparty_id, initiator_id)
    values ('00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'Anonymous clients cannot create company contracts');

reset role;
select * from finish();
rollback;
