begin;

create type public.company_type as enum ('producer', 'auditor', 'buyer');
create type public.batch_status as enum ('created', 'audited', 'completed');
create type public.eu_regulation_assessment as enum ('conformant', 'non_conformant');

create table public.companies (
  id uuid primary key references auth.users (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  company_type public.company_type not null,
  wallet_address text unique
    check (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  wallet_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint companies_wallet_verification_check check (
    (wallet_address is null and wallet_verified_at is null)
    or (wallet_address is not null and wallet_verified_at is not null)
  )
);

create table public.origins (
  id text primary key,
  name text not null unique
);

insert into public.origins (id, name) values
  ('olaroz', 'Salar de Olaroz'),
  ('cauchari_olaroz', 'Cauchari-Olaroz');

-- Unconstrained numeric plus checks rejects excess precision instead of rounding it.
-- Scaled values retain the entire unsigned u64 range used by the program.
create table public.batches (
  pda_address text primary key
    check (pda_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  batch_id text not null check (octet_length(batch_id) between 1 and 32),
  producer_wallet text not null references public.companies (wallet_address),
  auditor_wallet text not null references public.companies (wallet_address),
  reserved_buyer_wallet text references public.companies (wallet_address),
  buyer_wallet text references public.companies (wallet_address),
  origin_id text not null references public.origins (id),
  volume_tonnes numeric not null check (
    volume_tonnes between 0 and 18446744073709551615
    and volume_tonnes = trunc(volume_tonnes)
  ),
  purity_pct numeric not null check (
    purity_pct between 99.50 and 100.00
    and purity_pct * 100 = trunc(purity_pct * 100)
  ),
  water_footprint_m3_per_tonne numeric not null check (
    water_footprint_m3_per_tonne between 0 and 184467440737095516.15
    and water_footprint_m3_per_tonne * 100 = trunc(water_footprint_m3_per_tonne * 100)
  ),
  carbon_footprint_kg_co2e_per_tonne numeric not null check (
    carbon_footprint_kg_co2e_per_tonne between 0 and 184467440737095516.15
    and carbon_footprint_kg_co2e_per_tonne * 100 = trunc(carbon_footprint_kg_co2e_per_tonne * 100)
  ),
  price_usdc numeric not null check (
    price_usdc between 0 and 18446744073709.551615
    and price_usdc * 1000000 = trunc(price_usdc * 1000000)
  ),
  status public.batch_status not null default 'created',
  audit_sha256 text check (audit_sha256 ~ '^[0-9a-f]{64}$'),
  audit_certificate_path text generated always as (
    pda_address || '/' || audit_sha256 || '.pdf'
  ) stored,
  esg_approved boolean,
  eu_regulation_assessment public.eu_regulation_assessment,
  creation_tx_signature text not null
    check (creation_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  audit_tx_signature text
    check (audit_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  completion_tx_signature text
    check (completion_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  observed_slot numeric not null check (
    observed_slot between 0 and 18446744073709551615
    and observed_slot = trunc(observed_slot)
  ),
  indexed_at timestamptz not null default now(),
  constraint batches_producer_batch_id_key unique (producer_wallet, batch_id),
  constraint batches_audit_state_check check (
    (status = 'created' and audit_sha256 is null and esg_approved is null
      and eu_regulation_assessment is null and audit_tx_signature is null)
    or (status in ('audited', 'completed') and audit_sha256 is not null
      and esg_approved is not null and eu_regulation_assessment is not null
      and audit_tx_signature is not null)
  ),
  constraint batches_completion_state_check check (
    (status = 'completed' and buyer_wallet is not null and completion_tx_signature is not null)
    or (status <> 'completed' and buyer_wallet is null and completion_tx_signature is null)
  ),
  constraint batches_reserved_buyer_check check (
    reserved_buyer_wallet is null or buyer_wallet is null
    or buyer_wallet = reserved_buyer_wallet
  )
);

create index batches_audited_catalog_idx
  on public.batches (indexed_at desc, pda_address) where status = 'audited';
create index batches_auditor_wallet_idx on public.batches (auditor_wallet);
create index batches_reserved_buyer_wallet_idx
  on public.batches (reserved_buyer_wallet) where reserved_buyer_wallet is not null;
create index batches_buyer_wallet_idx
  on public.batches (buyer_wallet) where buyer_wallet is not null;
create index batches_origin_id_idx on public.batches (origin_id);

create schema if not exists private;

create function private.enforce_company_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'A company cannot be reassigned to another account.' using errcode = '23514';
  end if;
  if old.wallet_address is not null and (
    new.wallet_address is distinct from old.wallet_address
    or new.company_type is distinct from old.company_type
  ) then
    raise exception 'A verified company wallet and its company type are fixed.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger companies_enforce_identity
before update of id, wallet_address, company_type on public.companies
for each row execute function private.enforce_company_identity();

create function private.check_batch_participants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.companies
    where wallet_address = new.producer_wallet and company_type = 'producer'
  ) then
    raise exception 'The producer wallet must belong to a registered producer.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.companies
    where wallet_address = new.auditor_wallet and company_type = 'auditor'
  ) then
    raise exception 'The auditor wallet must belong to a registered auditor.' using errcode = '23514';
  end if;
  if new.reserved_buyer_wallet is not null and not exists (
    select 1 from public.companies
    where wallet_address = new.reserved_buyer_wallet and company_type = 'buyer'
  ) then
    raise exception 'The reserved wallet must belong to a registered buyer.' using errcode = '23514';
  end if;
  if new.buyer_wallet is not null and not exists (
    select 1 from public.companies
    where wallet_address = new.buyer_wallet and company_type = 'buyer'
  ) then
    raise exception 'The purchasing wallet must belong to a registered buyer.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger batches_check_participants
before insert or update of producer_wallet, auditor_wallet, reserved_buyer_wallet, buyer_wallet
on public.batches
for each row execute function private.check_batch_participants();

revoke all on function private.enforce_company_identity() from public, anon, authenticated;
revoke all on function private.check_batch_participants() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.enforce_company_identity() to service_role;
grant execute on function private.check_batch_participants() to service_role;

alter table public.companies enable row level security;
alter table public.origins enable row level security;
alter table public.batches enable row level security;

revoke all on table public.companies, public.origins, public.batches
  from public, anon, authenticated, service_role;
grant select on table public.companies to authenticated;
grant select, insert, update on table public.companies to service_role;
grant select on table public.origins to anon, authenticated, service_role;
grant select on table public.batches to anon, authenticated;
grant select, insert, update, delete on table public.batches to service_role;

create policy companies_read_own on public.companies
for select to authenticated using (id = (select auth.uid()));
create policy origins_public_read on public.origins
for select to anon, authenticated using (true);
create policy batches_public_read on public.batches
for select to anon, authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audit-certificates', 'audit-certificates', true, 52428800, array['application/pdf']);

-- Restrictive policies also block this bucket if another bucket has a broad allow policy.
-- Public downloads bypass Storage RLS; mutations still require the server secret key.
create policy audit_certificates_no_client_insert on storage.objects
as restrictive for insert to anon, authenticated
with check (bucket_id <> 'audit-certificates');
create policy audit_certificates_no_client_update on storage.objects
as restrictive for update to anon, authenticated
using (bucket_id <> 'audit-certificates')
with check (bucket_id <> 'audit-certificates');
create policy audit_certificates_no_client_delete on storage.objects
as restrictive for delete to anon, authenticated
using (bucket_id <> 'audit-certificates');

comment on table public.companies is 'Private company accounts; wallet ownership is verified by the authenticated API.';
comment on table public.batches is 'Solana Devnet read index, not an authoritative ledger or proof of funds transfer.';
comment on column public.batches.price_usdc is 'Total batch quote in USDC, not price per tonne; at most six decimals.';
comment on column public.batches.eu_regulation_assessment is 'Declared auditor evaluation of specified EU 2023/1542 requirements, not official legal certification.';
comment on column public.batches.status is 'Audited may contain negative findings; completed means simulated settlement without token transfer.';
comment on column public.batches.observed_slot is 'RPC context slot for the on-chain snapshot copied into this index.';

commit;
