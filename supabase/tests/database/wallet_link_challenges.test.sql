begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'challenge-company-' || n || '@example.test'
from generate_series(1, 4) as n;

insert into public.companies (id, name, company_type, wallet_address, wallet_verified_at) values
  ('00000000-0000-0000-0000-000000000001', 'Linked producer', 'producer', repeat('2', 31) || '2', now()),
  ('00000000-0000-0000-0000-000000000002', 'Unlinked producer', 'producer', null, null),
  ('00000000-0000-0000-0000-000000000003', 'Other producer', 'producer', null, null);

set local role service_role;

select throws_ok($$insert into public.wallet_link_challenges (
    nonce, auth_user_id, account_email, wallet_address, domain, expires_at
  ) values (
    repeat('a', 42), '00000000-0000-0000-0000-000000000002',
    'challenge-company-2@example.test', repeat('3', 31) || '3', 'localhost:3000',
    now() + interval '5 minutes'
  )$$,
  '23514', null, 'A wallet link nonce is 32 random bytes in base64url');

insert into public.wallet_link_challenges (
  nonce, auth_user_id, account_email, wallet_address, domain, issued_at, expires_at
) values
  (repeat('a', 43), '00000000-0000-0000-0000-000000000002',
    'challenge-company-2@example.test', repeat('3', 31) || '3', 'localhost:3000',
    now(), now() + interval '5 minutes'),
  (repeat('b', 43), '00000000-0000-0000-0000-000000000003',
    'challenge-company-3@example.test', repeat('3', 31) || '4', 'localhost:3000',
    now(), now() + interval '5 minutes'),
  (repeat('c', 43), '00000000-0000-0000-0000-000000000001',
    'challenge-company-1@example.test', repeat('3', 31) || '5', 'localhost:3000',
    now(), now() + interval '5 minutes'),
  (repeat('d', 43), '00000000-0000-0000-0000-000000000004',
    'challenge-company-4@example.test', repeat('3', 31) || '6', 'localhost:3000',
    now(), now() + interval '5 minutes'),
  (repeat('e', 43), '00000000-0000-0000-0000-000000000003',
    'challenge-company-3@example.test', repeat('2', 31) || '2', 'localhost:3000',
    now(), now() + interval '5 minutes'),
  (repeat('f', 43), '00000000-0000-0000-0000-000000000003',
    'challenge-company-3@example.test', repeat('3', 31) || '7', 'localhost:3000',
    now() - interval '10 minutes', now() - interval '5 minutes');

select throws_ok($$select * from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000001'::uuid, repeat('3', 31) || '3', repeat('a', 43))$$,
  '23514', null, 'A challenge cannot link a wallet to another account');

select throws_ok($$select * from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000003'::uuid, repeat('3', 31) || '9', repeat('b', 43))$$,
  '23514', null, 'A challenge cannot link a wallet it was not issued for');

select results_eq($$select consumed_at is null from public.wallet_link_challenges
  where nonce in (repeat('a', 43), repeat('b', 43)) order by nonce$$,
  $$values (true), (true)$$,
  'Rejected link attempts do not consume their challenges');

select results_eq($$select wallet_address, wallet_verified_at is not null
  from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000002'::uuid, repeat('3', 31) || '3', repeat('a', 43))$$,
  $$values (repeat('3', 31) || '3', true)$$,
  'A valid challenge links the verified wallet to its account');

select results_eq($$select wallet_address from public.companies
  where id = '00000000-0000-0000-0000-000000000002'$$,
  $$values (repeat('3', 31) || '3')$$,
  'The linked wallet and its verification are recorded on the company');

select results_eq($$select consumed_at is not null from public.wallet_link_challenges
  where nonce = repeat('a', 43)$$,
  $$values (true)$$,
  'Linking consumes the challenge');

select throws_ok($$select * from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000002'::uuid, repeat('3', 31) || '3', repeat('a', 43))$$,
  '23514', null, 'A consumed challenge cannot authorize another link');

select throws_ok($$select * from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000003'::uuid, repeat('3', 31) || '7', repeat('f', 43))$$,
  '23514', null, 'An expired challenge is rejected');

select throws_ok($$select * from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000001'::uuid, repeat('3', 31) || '5', repeat('c', 43))$$,
  '23514', null, 'A company with a verified wallet rejects another link');

select results_eq($$select consumed_at is null from public.wallet_link_challenges
  where nonce = repeat('c', 43)$$,
  $$values (true)$$,
  'The challenge survives a rejected link');

select throws_ok($$select * from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000003'::uuid, repeat('2', 31) || '2', repeat('e', 43))$$,
  '23505', null, 'A wallet cannot be linked to two companies');

select results_eq($$select consumed_at is null from public.wallet_link_challenges
  where nonce = repeat('e', 43)$$,
  $$values (true)$$,
  'Rollback keeps the challenge unconsumed when the wallet is already taken');

select throws_ok($$select * from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000004'::uuid, repeat('3', 31) || '6', repeat('d', 43))$$,
  '23514', null, 'A challenge without a company profile cannot link');

set local role anon;

select throws_ok($$select * from public.wallet_link_challenges$$,
  '42501', null, 'Anonymous clients cannot read wallet link challenges');
select throws_ok($$insert into public.wallet_link_challenges (
    nonce, auth_user_id, account_email, wallet_address, domain, expires_at
  ) values (
    repeat('g', 43), '00000000-0000-0000-0000-000000000002',
    'challenge-company-2@example.test', repeat('3', 31) || '8', 'localhost:3000',
    now() + interval '5 minutes'
  )$$,
  '42501', null, 'Anonymous clients cannot issue wallet link challenges');
select throws_ok($$select * from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000002'::uuid, repeat('3', 31) || '3', repeat('a', 43))$$,
  '42501', null, 'Anonymous clients cannot link wallets');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok($$select * from public.wallet_link_challenges$$,
  '42501', null, 'Authenticated companies cannot read wallet link challenges');
select throws_ok($$select * from public.link_company_wallet(
    '00000000-0000-0000-0000-000000000002'::uuid, repeat('3', 31) || '3', repeat('a', 43))$$,
  '42501', null, 'Authenticated companies cannot consume a wallet link challenge');

reset role;
select * from finish();
rollback;
