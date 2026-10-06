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
  ('00000000-0000-0000-0000-000000000003', 'Buyer A', 'buyer', repeat('1', 31) || '4', now(), null),
  ('00000000-0000-0000-0000-000000000004', 'Buyer B', 'buyer', repeat('1', 31) || '5', now(), null),
  ('00000000-0000-0000-0000-000000000005', 'Producer B', 'producer', repeat('1', 31) || '6', now(), 'pena_blanca'),
  ('00000000-0000-0000-0000-000000000006', 'Unlinked buyer', 'buyer', null, null, null);

set local role service_role;

delete from public.lots;

insert into public.company_contracts (producer_id, counterparty_id, status, responded_at) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'accepted', now());

insert into public.lots (
  pda_address, lot_id, producer_wallet, buyer_wallet,
  origin_id, mint_address, volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
  carbon_footprint_kg_co2e_per_tonne, price_usdc, claimable_after,
  plant_cert_sha256, creation_tx_signature, observed_slot
) values (
  repeat('1', 31) || '7', 'LIT-2026-EXAR-02', repeat('1', 31) || '2',
  repeat('1', 31) || '4',
  'pena_blanca', repeat('2', 31) || '7', 100, 99.50, 125.50, 450.25,
  12000.123456, now() + interval '30 days', repeat('a', 64),
  repeat('1', 63) || '2', 1000
), (
  repeat('1', 31) || '8', 'LIT-2026-EXAR-03', repeat('1', 31) || '2',
  repeat('1', 31) || '4',
  'pena_blanca', repeat('2', 31) || '8', 50, 99.75, 80.25, 300.50,
  7000, now() + interval '45 days', repeat('b', 64),
  repeat('1', 63) || '3', 1001
);

select throws_ok($$insert into public.companies (id, name, company_type)
    values ('00000000-0000-0000-0000-000000000010', 'Bad auditor', 'auditor')$$,
  '22P02', null, 'The auditor company type no longer exists');
select throws_ok($$insert into public.companies (id, name, company_type, origin_id)
    values ('00000000-0000-0000-0000-000000000010', 'Bad buyer', 'buyer', 'pena_blanca')$$,
  '23514', null, 'A buyer cannot carry an origin');

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

select throws_ok($$update public.lots set producer_wallet = repeat('1', 31) || '4'
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A buyer wallet cannot be indexed as a producer');
select throws_ok($$update public.lots set buyer_wallet = repeat('1', 31) || '2'
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A producer wallet cannot be the designated buyer');
select throws_ok($$update public.lots set buyer_wallet = repeat('1', 31) || '5'
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A buyer without an accepted contract cannot be designated');
select throws_ok($$update public.lots set origin_id = 'unknown'
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A lot cannot reference an origin the producer is not bound to');
select throws_ok($$update public.lots set origin_id = 'condor'
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A lot cannot adopt an origin other than the producer bound origin');

select throws_ok($$update public.lots set purity_pct = 99.49
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Purity below battery grade is rejected');
select throws_ok($$update public.lots set purity_pct = 100.01
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Purity above 100 percent is rejected');
select throws_ok($$update public.lots set purity_pct = 99.505
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Purity is not silently rounded to two decimals');
select throws_ok($$update public.lots set water_footprint_m3_per_tonne = -0.01
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Negative water footprint is rejected');
select throws_ok($$update public.lots set water_footprint_m3_per_tonne = 125.505
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Water footprint is not silently rounded');
select throws_ok($$update public.lots set carbon_footprint_kg_co2e_per_tonne = 450.255
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Carbon footprint is not silently rounded');
select throws_ok($$update public.lots set volume_tonnes = 1.5
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Fractional production tonnage is rejected');
select throws_ok($$update public.lots set volume_tonnes = 18446744073709551616
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Values above unsigned u64 are rejected');
select results_eq($$update public.lots set volume_tonnes = 18446744073709551615
  where lot_id = 'LIT-2026-EXAR-02' returning volume_tonnes::text$$,
  $$values ('18446744073709551615'::text)$$,
  'The full unsigned u64 range is preserved without signed-bigint overflow');
select throws_ok($$update public.lots set price_usdc = 1.0000001
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'USDC precision beyond six decimals is rejected');
select results_eq($$update public.lots set price_usdc = 18446744073709.551615
  where lot_id = 'LIT-2026-EXAR-02' returning price_usdc::text$$,
  $$values ('18446744073709.551615'::text)$$,
  'A total price preserves the maximum unsigned USDC base-unit amount');
select throws_ok($$update public.lots set carbon_footprint_kg_co2e_per_tonne = 'NaN'::numeric
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'Non-finite production metrics are rejected');

select throws_ok($$update public.lots set lot_id = repeat('A', 33)
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A lot identifier must fit the 32-byte PDA seed limit');
select throws_ok($$update public.lots set lot_id = repeat(chr(233), 17)
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'The seed limit counts UTF-8 bytes rather than characters');
select throws_ok($$update public.lots set lot_id = 'LIT-2026-EXAR-02'
  where lot_id = 'LIT-2026-EXAR-03'$$,
  '23505', null, 'A producer cannot reuse its lot identifier');
select throws_ok($$update public.lots set mint_address = 'not-base58!'
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'The Digital Title mint must be a base58 address');
select throws_ok($$update public.lots set plant_cert_sha256 = repeat('a', 63)
  where lot_id = 'LIT-2026-EXAR-02'$$,
  '23514', null, 'A plant certificate digest requires all 64 hexadecimal characters');

insert into public.company_contracts (producer_id, counterparty_id, status, responded_at) values
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'accepted', now());

select results_eq($$insert into public.lots (
    pda_address, lot_id, producer_wallet, buyer_wallet, origin_id, mint_address,
    volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc, claimable_after,
    plant_cert_sha256, creation_tx_signature, observed_slot
  ) values (
    repeat('1', 31) || '9', 'LIT-2026-EXAR-02', repeat('1', 31) || '6',
    repeat('1', 31) || '5', 'pena_blanca', repeat('2', 31) || '9',
    25, 99.50, 100, 200, 3000, now() + interval '30 days', repeat('c', 64),
    repeat('1', 63) || '4', 1002
  ) returning producer_wallet, lot_id$$,
  $$values (repeat('1', 31) || '6', 'LIT-2026-EXAR-02'::text)$$,
  'A different producer can use the same lot identifier');

-- Lifecycle state checks: every transition writes its transaction signature.
select throws_ok($$update public.lots set status = 'funded'
  where pda_address = repeat('1', 31) || '7'$$,
  '23514', null, 'Funded requires the funding transaction signature');
select results_eq($$update public.lots set status = 'funded',
    fund_tx_signature = repeat('1', 63) || '5'
  where pda_address = repeat('1', 31) || '7'
  returning status::text$$,
  $$values ('funded'::text)$$,
  'A funded lot records the escrow funding signature');
select throws_ok($$update public.lots set status = 'disputed'
  where pda_address = repeat('1', 31) || '7'$$,
  '23514', null, 'Disputed requires the dispute transaction signature');
select results_eq($$update public.lots set status = 'disputed',
    dispute_tx_signature = repeat('1', 63) || '6'
  where pda_address = repeat('1', 31) || '7'
  returning status::text$$,
  $$values ('disputed'::text)$$,
  'A disputed lot records the dispute signature');
select results_eq($$update public.lots set status = 'redeemed',
    redeem_tx_signature = repeat('1', 63) || '7'
  where pda_address = repeat('1', 31) || '7'
  returning status::text$$,
  $$values ('redeemed'::text)$$,
  'A disputed lot can still be redeemed by the buyer');
select throws_ok($$update public.lots set status = 'listed',
    fund_tx_signature = null, dispute_tx_signature = null,
    redeem_tx_signature = null
  where pda_address = repeat('1', 31) || '8'$$,
  '23514', null, 'A funded lot cannot revert to listed');

select results_eq($$update public.lots set status = 'claimed',
    fund_tx_signature = repeat('1', 63) || '8',
    claim_tx_signature = repeat('1', 63) || '9'
  where pda_address = repeat('1', 31) || '8'
  returning status::text$$,
  $$values ('claimed'::text)$$,
  'A claimed lot records funding and timeout claim signatures');
select throws_ok($$update public.lots set status = 'claimed',
    claim_tx_signature = repeat('2', 63) || '9'
  where pda_address = repeat('1', 31) || '9'$$,
  '23514', null, 'Claimed without a funding signature is rejected');

select results_eq($$insert into public.lots (
    pda_address, lot_id, producer_wallet, buyer_wallet, origin_id, mint_address,
    volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc, claimable_after,
    plant_cert_sha256, creation_tx_signature, observed_slot,
    status, cancel_tx_signature
  ) values (
    repeat('3', 31) || '9', 'LIT-2026-EXAR-09', repeat('1', 31) || '2',
    repeat('1', 31) || '4', 'pena_blanca', repeat('4', 31) || '9',
    10, 99.50, 50, 8000, 1000, now() + interval '30 days', repeat('d', 64),
    repeat('3', 63) || '8', 1003, 'cancelled', repeat('3', 63) || '9'
  ) returning status::text$$,
  $$values ('cancelled'::text)$$,
  'A cancelled lot keeps its creation and cancellation signatures');
select throws_ok($$insert into public.lots (
    pda_address, lot_id, producer_wallet, buyer_wallet, origin_id, mint_address,
    volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc, claimable_after,
    plant_cert_sha256, creation_tx_signature, observed_slot,
    status, fund_tx_signature
  ) values (
    repeat('5', 31) || '9', 'LIT-2026-EXAR-10', repeat('1', 31) || '2',
    repeat('1', 31) || '4', 'pena_blanca', repeat('6', 31) || '9',
    10, 99.50, 50, 8000, 1000, now() + interval '30 days', repeat('e', 64),
    repeat('5', 63) || '8', 1004, 'cancelled', repeat('5', 63) || '9'
  )$$,
  '23514', null, 'A cancelled lot cannot carry a funding signature');

set local role anon;
select results_eq($$select pda_address, status::text
  from public.lots where status = 'listed' order by pda_address$$,
  $$values (repeat('1', 31) || '9', 'listed'::text)$$,
  'The public catalogue lists lots open for funding');
select throws_ok($$select * from public.companies$$,
  '42501', null, 'Anonymous visitors cannot read private company accounts');
select throws_ok($$update public.lots set status = 'redeemed'$$,
  '42501', null, 'Anonymous visitors cannot forge settlement states');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select results_eq($$select id::text from public.companies order by id$$,
  $$values ('00000000-0000-0000-0000-000000000001'::text)$$,
  'An authenticated company sees its own account and no other company accounts');
select throws_ok($$update public.companies set wallet_address = repeat('1', 31) || 'A'
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'A company cannot bypass the API to link or replace a wallet');
select throws_ok($$update public.lots set status = 'listed'$$,
  '42501', null, 'Authenticated companies cannot directly overwrite the on-chain index');
select throws_ok($$delete from public.lots$$,
  '42501', null, 'Authenticated companies cannot delete public passports');

reset role;
select * from finish();
rollback;
