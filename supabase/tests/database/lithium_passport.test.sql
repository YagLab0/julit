begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'company-' || n || '@example.test'
from generate_series(1, 7) as n;

insert into public.companies (id, name, company_type, wallet_address, wallet_verified_at, origin_id) values
  ('00000000-0000-0000-0000-000000000001', 'Producer A', 'producer', repeat('1', 31) || '2', now(), 'pena_blanca'),
  ('00000000-0000-0000-0000-000000000002', 'Auditor', 'auditor', repeat('1', 31) || '3', now(), null),
  ('00000000-0000-0000-0000-000000000003', 'Buyer A', 'buyer', repeat('1', 31) || '4', now(), null),
  ('00000000-0000-0000-0000-000000000004', 'Buyer B', 'buyer', repeat('1', 31) || '5', now(), null),
  ('00000000-0000-0000-0000-000000000005', 'Producer B', 'producer', repeat('1', 31) || '6', now(), 'pena_blanca'),
  ('00000000-0000-0000-0000-000000000006', 'Unlinked buyer', 'buyer', null, null, null);

set local role service_role;

delete from public.batches;

insert into public.company_contracts (producer_id, counterparty_id, status, responded_at) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'accepted', now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'accepted', now()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'accepted', now());

insert into public.batches (
  pda_address, batch_id, producer_wallet, auditor_wallet, reserved_buyer_wallet,
  origin_id, volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
  carbon_footprint_kg_co2e_per_tonne, price_usdc, creation_tx_signature, observed_slot
) values (
  repeat('1', 31) || '7', 'LIT-2026-EXAR-02', repeat('1', 31) || '2',
  repeat('1', 31) || '3', repeat('1', 31) || '4',
  'pena_blanca', 100, 99.50, 125.50, 450.25, 12000.123456, repeat('1', 63) || '2', 1000
), (
  repeat('1', 31) || '8', 'LIT-2026-EXAR-03', repeat('1', 31) || '2',
  repeat('1', 31) || '3', null,
  'pena_blanca', 50, 99.75, 80.25, 300.50, 7000, repeat('1', 63) || '3', 1001
);

select throws_ok($$update public.companies set wallet_address = repeat('1', 31) || '9'
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'A verified company wallet cannot be replaced');
select throws_ok($$update public.companies set company_type = 'buyer'
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'A verified producer cannot become a buyer');
select throws_ok($$update public.companies set id = '00000000-0000-0000-0000-000000000007'
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'A company cannot be transferred to another Auth account');
select throws_ok($$insert into public.companies (id, name, company_type, wallet_address, wallet_verified_at)
  values ('00000000-0000-0000-0000-000000000007', 'Duplicate owner', 'buyer', repeat('1', 31) || '2', now())$$,
  '23505', null, 'One wallet cannot be linked to two companies');
select throws_ok($$update public.companies set wallet_address = repeat('1', 31) || '9'
  where id = '00000000-0000-0000-0000-000000000006'$$,
  '23514', null, 'Wallet linking requires verification metadata');

select throws_ok($$update public.batches set auditor_wallet = repeat('1', 31) || '9'
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'An unregistered wallet cannot be designated as auditor');
select throws_ok($$update public.batches set auditor_wallet = repeat('1', 31) || '4'
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A buyer company cannot certify a batch');
select throws_ok($$update public.batches set producer_wallet = repeat('1', 31) || '4'
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A buyer wallet cannot be indexed as a producer');
select throws_ok($$update public.batches set reserved_buyer_wallet = repeat('1', 31) || '3'
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A reserved participant must be a buyer company');
select throws_ok($$update public.batches set origin_id = 'unknown'
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A batch cannot reference an origin the producer is not bound to');

select throws_ok($$update public.batches set purity_pct = 99.49
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Purity below battery grade is rejected');
select throws_ok($$update public.batches set purity_pct = 100.01
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Purity above 100 percent is rejected');
select throws_ok($$update public.batches set purity_pct = 99.505
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Purity is not silently rounded to two decimals');
select throws_ok($$update public.batches set water_footprint_m3_per_tonne = -0.01
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Negative water footprint is rejected');
select throws_ok($$update public.batches set water_footprint_m3_per_tonne = 125.505
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Water footprint is not silently rounded');
select throws_ok($$update public.batches set carbon_footprint_kg_co2e_per_tonne = 450.255
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Carbon footprint is not silently rounded');
select throws_ok($$update public.batches set volume_tonnes = 1.5
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Fractional production tonnage is rejected');
select throws_ok($$update public.batches set volume_tonnes = 18446744073709551616
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Values above unsigned u64 are rejected');
select results_eq($$update public.batches set volume_tonnes = 18446744073709551615
  where batch_id = 'LIT-2026-EXAR-02' returning volume_tonnes::text$$,
  $$values ('18446744073709551615'::text)$$,
  'The full unsigned u64 range is preserved without signed-bigint overflow');
select throws_ok($$update public.batches set price_usdc = 1.0000001
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'USDC precision beyond six decimals is rejected');
select results_eq($$update public.batches set price_usdc = 18446744073709.551615
  where batch_id = 'LIT-2026-EXAR-02' returning price_usdc::text$$,
  $$values ('18446744073709.551615'::text)$$,
  'A total price preserves the maximum unsigned USDC base-unit amount');
select throws_ok($$update public.batches set carbon_footprint_kg_co2e_per_tonne = 'NaN'::numeric
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Non-finite production metrics are rejected');

select throws_ok($$update public.batches set batch_id = repeat('A', 33)
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A batch identifier must fit the 32-byte PDA seed limit');
select throws_ok($$update public.batches set batch_id = repeat(chr(233), 17)
  where batch_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'The seed limit counts UTF-8 bytes rather than characters');
select throws_ok($$update public.batches set batch_id = 'LIT-2026-EXAR-02'
  where batch_id = 'LIT-2026-EXAR-03'$$,
  '23505', null, 'A producer cannot reuse its batch identifier');
select results_eq($$insert into public.batches (
    pda_address, batch_id, producer_wallet, auditor_wallet, origin_id, volume_tonnes,
    purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne,
    price_usdc, creation_tx_signature, observed_slot
  ) values (
    repeat('1', 31) || '9', 'LIT-2026-EXAR-02', repeat('1', 31) || '6', repeat('1', 31) || '3',
    'pena_blanca', 25, 99.50, 100, 200, 3000, repeat('1', 63) || '4', 1002
  ) returning producer_wallet, batch_id$$,
  $$values (repeat('1', 31) || '6', 'LIT-2026-EXAR-02'::text)$$,
  'A different producer can use the same batch identifier');

select throws_ok($$update public.batches set status = 'audited'
  where pda_address = repeat('1', 31) || '7'$$,
  '23514', null, 'Audited requires a digest, findings, and certification signature');
select results_eq($$update public.batches set status = 'audited', audit_sha256 = repeat('a', 64),
    esg_approved = false, eu_regulation_assessment = 'non_conformant',
    audit_tx_signature = repeat('1', 63) || '5'
  where pda_address = repeat('1', 31) || '7'
  returning status::text, esg_approved, eu_regulation_assessment::text$$,
  $$values ('audited'::text, false, 'non_conformant'::text)$$,
  'Certification records negative findings without treating Audited as approval');
select throws_ok($$update public.batches set audit_sha256 = repeat('a', 63)
  where pda_address = repeat('1', 31) || '7'$$,
  '23514', null, 'A sealed SHA-256 requires all 64 hexadecimal characters');
select throws_ok($$update public.batches set status = 'completed'
  where pda_address = repeat('1', 31) || '7'$$,
  '23514', null, 'Completed requires the actual buyer and completion signature');
select throws_ok($$update public.batches set status = 'completed',
    buyer_wallet = repeat('1', 31) || '5', completion_tx_signature = repeat('1', 63) || '6'
  where pda_address = repeat('1', 31) || '7'$$,
  '23514', null, 'Another registered buyer cannot complete a reserved batch');
select results_eq($$update public.batches set status = 'completed',
    buyer_wallet = repeat('1', 31) || '4', completion_tx_signature = repeat('1', 63) || '6'
  where pda_address = repeat('1', 31) || '7'
  returning status::text, buyer_wallet, esg_approved, eu_regulation_assessment::text$$,
  $$values ('completed'::text, repeat('1', 31) || '4', false, 'non_conformant'::text)$$,
  'The assigned buyer can complete simulated settlement despite both negative findings');

update public.batches set status = 'audited', audit_sha256 = repeat('b', 64),
  esg_approved = false, eu_regulation_assessment = 'non_conformant',
  audit_tx_signature = repeat('1', 63) || '7'
where pda_address = repeat('1', 31) || '8';

set local role anon;
select results_eq($$select pda_address, esg_approved, eu_regulation_assessment::text
  from public.batches where status = 'audited' order by pda_address$$,
  $$values (repeat('1', 31) || '8', false, 'non_conformant'::text)$$,
  'The public catalogue retains audited batches with negative findings');
select throws_ok($$select * from public.companies$$,
  '42501', null, 'Anonymous visitors cannot read private company accounts');
select throws_ok($$update public.batches set esg_approved = true$$,
  '42501', null, 'Anonymous visitors cannot forge audit approval');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select results_eq($$select id::text from public.companies order by id$$,
  $$values ('00000000-0000-0000-0000-000000000001'::text)$$,
  'An authenticated company sees its own account and no other company accounts');
select throws_ok($$update public.companies set wallet_address = repeat('1', 31) || 'A'
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'A company cannot bypass the API to link or replace a wallet');
select throws_ok($$update public.batches set status = 'created'$$,
  '42501', null, 'Authenticated companies cannot directly overwrite the on-chain index');
select throws_ok($$delete from public.batches$$,
  '42501', null, 'Authenticated companies cannot delete public passports');

reset role;
select * from finish();
rollback;
