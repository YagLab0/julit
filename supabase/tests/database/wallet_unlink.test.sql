begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'unlink-company-' || n || '@example.test'
from generate_series(1, 4) as n;

insert into public.companies (id, name, company_type, wallet_address, wallet_verified_at, origin_id) values
  ('00000000-0000-0000-0000-000000000001', 'Lot producer', 'producer', repeat('1', 31) || '2', now(), 'pena_blanca'),
  ('00000000-0000-0000-0000-000000000002', 'Lot buyer', 'buyer', repeat('1', 31) || '4', now(), null),
  ('00000000-0000-0000-0000-000000000003', 'Swappable buyer', 'buyer', repeat('1', 31) || '5', now(), null),
  ('00000000-0000-0000-0000-000000000004', 'Unlinked buyer', 'buyer', null, null, null);

set local role service_role;

insert into public.company_contracts (producer_id, counterparty_id, status, responded_at) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'accepted', now());

insert into public.lots (
  pda_address, lot_id, producer_wallet, buyer_wallet,
  origin_id, mint_address, volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
  carbon_footprint_kg_co2e_per_tonne, price_usdc,
  spec_sheet_sha256, creation_tx_signature, observed_slot,
  ship_by, confirm_window_secs
) values (
  repeat('5', 31) || '1', 'LIT-UNLINK-01', repeat('1', 31) || '2',
  repeat('1', 31) || '4', 'pena_blanca', repeat('2', 31) || '1',
  10, 99.50, 50, 8000, 1000, repeat('d', 64),
  repeat('5', 63) || '2', 1000, now() + interval '30 days', 3600
);

select throws_ok($$select public.unlink_company_wallet(
    '00000000-0000-0000-0000-000000000001'::uuid)$$,
  '23503', null, 'A producer wallet referenced by lots cannot be unlinked');

select throws_ok($$select public.unlink_company_wallet(
    '00000000-0000-0000-0000-000000000002'::uuid)$$,
  '23503', null, 'A designated buyer wallet referenced by lots cannot be unlinked');

select lives_ok($$select public.unlink_company_wallet(
    '00000000-0000-0000-0000-000000000003'::uuid)$$,
  'A company without indexed lots can unlink its wallet');

select results_eq($$select wallet_address is null and wallet_verified_at is null
  from public.companies where id = '00000000-0000-0000-0000-000000000003'$$,
  $$values (true)$$,
  'Unlinking clears the wallet and its verification date');

select throws_ok($$select public.unlink_company_wallet(
    '00000000-0000-0000-0000-000000000003'::uuid)$$,
  '23514', null, 'Unlinking twice is rejected');

select throws_ok($$select public.unlink_company_wallet(
    '00000000-0000-0000-0000-000000000004'::uuid)$$,
  '23514', null, 'A company that never linked a wallet cannot unlink');

select throws_ok($$update public.companies set company_type = 'buyer'
  where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'The company type stays fixed while a wallet is linked');

insert into public.wallet_link_challenges (
  nonce, auth_user_id, account_email, wallet_address, domain, issued_at, expires_at
) values (
  repeat('u', 43), '00000000-0000-0000-0000-000000000003',
  'unlink-company-3@example.test', repeat('7', 31) || '7', 'localhost:3000',
  now(), now() + interval '5 minutes'
);

select results_eq($$select wallet_address from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000003'::uuid, repeat('7', 31) || '7', repeat('u', 43))$$,
  $$values (repeat('7', 31) || '7')$$,
  'An unlinked company can verify a different wallet');

select throws_ok($$update public.companies set wallet_address = repeat('9', 31) || '9'
  where id = '00000000-0000-0000-0000-000000000003'$$,
  '23514', null, 'A relinked wallet cannot be replaced without unlinking first');

set local role anon;
select throws_ok($$select public.unlink_company_wallet(
    '00000000-0000-0000-0000-000000000003'::uuid)$$,
  '42501', null, 'Anonymous clients cannot unlink wallets');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok($$select public.unlink_company_wallet(
    '00000000-0000-0000-0000-000000000003'::uuid)$$,
  '42501', null, 'Authenticated companies cannot bypass the API to unlink');

reset role;
select * from finish();
rollback;
