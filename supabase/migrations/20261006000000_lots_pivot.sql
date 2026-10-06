begin;

-- Pivot rewrite (ADR-0012): the auditor model is dropped in place. The index
-- mirrors the on-chain lot lifecycle: listed -> funded -> redeemed, with
-- disputed and claimed branches from funded, and cancelled before funding.
-- Demo data is discarded; the seed file provisions the new accounts.

drop trigger batches_check_participants on public.batches;
drop function private.check_batch_participants();
drop table public.batches;
drop type public.batch_status;
drop type public.eu_regulation_assessment;

-- company_type loses 'auditor'. The enum is swapped via a new type; the demo
-- seed no longer inserts auditor companies, so the cast always succeeds.
create type public.company_type_new as enum ('producer', 'buyer');
alter table public.companies
  alter column company_type type public.company_type_new
  using company_type::text::public.company_type_new;
drop type public.company_type;
alter type public.company_type_new rename to company_type;

comment on column public.companies.origin_id is
  'Producer-bound origin, fixed once set; null for buyers.';

-- Contracts only link a producer with a buyer. Either party may initiate;
-- initiator_id records who offered (migration 20261003030000).
create or replace function private.check_contract_parties()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.companies
    where id = new.producer_id and company_type = 'producer'
  ) then
    raise exception 'The contract producer must be a registered producer company.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.companies
    where id = new.counterparty_id and company_type = 'buyer'
  ) then
    raise exception 'The contract counterparty must be a registered buyer.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create type public.lot_status as enum
  ('listed', 'funded', 'disputed', 'redeemed', 'claimed', 'cancelled');

-- Unconstrained numeric plus checks rejects excess precision instead of rounding it.
-- Scaled values retain the entire unsigned u64 range used by the program.
create table public.lots (
  pda_address text primary key
    check (pda_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  lot_id text not null check (octet_length(lot_id) between 1 and 32),
  producer_wallet text not null references public.companies (wallet_address),
  buyer_wallet text not null references public.companies (wallet_address),
  origin_id text not null references public.origins (id),
  mint_address text not null
    check (mint_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
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
  claimable_after timestamptz not null,
  plant_cert_sha256 text not null check (plant_cert_sha256 ~ '^[0-9a-f]{64}$'),
  plant_certificate_path text generated always as (
    producer_wallet || '/' || plant_cert_sha256 || '.pdf'
  ) stored,
  status public.lot_status not null default 'listed',
  creation_tx_signature text not null
    check (creation_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  fund_tx_signature text
    check (fund_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  redeem_tx_signature text
    check (redeem_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  claim_tx_signature text
    check (claim_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  cancel_tx_signature text
    check (cancel_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  dispute_tx_signature text
    check (dispute_tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]{64,88}$'),
  observed_slot numeric not null check (
    observed_slot between 0 and 18446744073709551615
    and observed_slot = trunc(observed_slot)
  ),
  indexed_at timestamptz not null default now(),
  constraint lots_producer_lot_id_key unique (producer_wallet, lot_id),
  constraint lots_funding_state_check check (
    (status in ('funded', 'disputed', 'redeemed', 'claimed')
      and fund_tx_signature is not null)
    or (status in ('listed', 'cancelled') and fund_tx_signature is null)
  ),
  constraint lots_dispute_state_check check (
    (status = 'disputed' and dispute_tx_signature is not null)
    or (status <> 'disputed'
      and (dispute_tx_signature is null or status = 'redeemed'))
  ),
  constraint lots_redeem_state_check check (
    (status = 'redeemed' and redeem_tx_signature is not null)
    or (status <> 'redeemed' and redeem_tx_signature is null)
  ),
  constraint lots_claim_state_check check (
    (status = 'claimed' and claim_tx_signature is not null)
    or (status <> 'claimed' and claim_tx_signature is null)
  ),
  constraint lots_cancel_state_check check (
    (status = 'cancelled' and cancel_tx_signature is not null)
    or (status <> 'cancelled' and cancel_tx_signature is null)
  )
);

comment on table public.lots is 'Solana Devnet read index of escrowed lot settlements, not an authoritative ledger or proof of funds transfer.';
comment on column public.lots.buyer_wallet is 'Designated buyer fixed at lot creation; only this wallet may fund the escrow.';
comment on column public.lots.mint_address is 'Digital Title mint; the NFT stays in the lot escrow until redeem or timeout claim burns it.';
comment on column public.lots.price_usdc is 'Total lot quote in USDC, not price per tonne; at most six decimals.';
comment on column public.lots.claimable_after is 'Unix time after which the producer may claim escrowed funds if the buyer never confirmed receipt.';
comment on column public.lots.plant_cert_sha256 is 'SHA-256 of the producer plant certificate PDF stored under plant-certificates/<producer_wallet>/.';
comment on column public.lots.status is 'listed -> funded -> redeemed; disputed pauses the claim clock; claimed is a producer timeout collection; cancelled only before funding.';
comment on column public.lots.observed_slot is 'RPC context slot for the on-chain snapshot copied into this index.';

create index lots_listed_catalog_idx
  on public.lots (indexed_at desc, pda_address) where status = 'listed';
create index lots_buyer_wallet_idx on public.lots (buyer_wallet);
create index lots_producer_wallet_idx on public.lots (producer_wallet);
create index lots_origin_id_idx on public.lots (origin_id);

create function private.check_lot_participants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.companies
    where wallet_address = new.producer_wallet
      and company_type = 'producer'
      and origin_id = new.origin_id
  ) then
    raise exception 'The lot producer wallet must belong to a registered producer bound to this origin.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.companies
    where wallet_address = new.buyer_wallet and company_type = 'buyer'
  ) then
    raise exception 'The buyer wallet must belong to a registered buyer.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.company_contracts cc
    join public.companies p on p.id = cc.producer_id
    join public.companies b on b.id = cc.counterparty_id
    where p.wallet_address = new.producer_wallet
      and b.wallet_address = new.buyer_wallet
      and b.company_type = 'buyer'
      and cc.status = 'accepted'
  ) then
    raise exception 'The designated buyer must hold an accepted contract with the producer.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger lots_check_participants
before insert or update of producer_wallet, buyer_wallet, origin_id
on public.lots
for each row execute function private.check_lot_participants();

alter table public.lots enable row level security;

revoke all on table public.lots
  from public, anon, authenticated, service_role;
grant select on table public.lots to anon, authenticated;
grant select, insert, update, delete on table public.lots to service_role;

create policy lots_public_read on public.lots
for select to anon, authenticated using (true);

revoke all on function private.check_lot_participants() from public, anon, authenticated;
grant execute on function private.check_lot_participants() to service_role;

-- Storage: audit-certificates -> plant-certificates, same policies.
update storage.buckets
set id = 'plant-certificates', name = 'plant-certificates'
where id = 'audit-certificates';

-- Restrictive policies also block this bucket if another bucket has a broad allow policy.
-- Public downloads bypass Storage RLS; mutations still require the server secret key.
drop policy audit_certificates_no_client_insert on storage.objects;
drop policy audit_certificates_no_client_update on storage.objects;
drop policy audit_certificates_no_client_delete on storage.objects;

create policy plant_certificates_no_client_insert on storage.objects
as restrictive for insert to anon, authenticated
with check (bucket_id <> 'plant-certificates');
create policy plant_certificates_no_client_update on storage.objects
as restrictive for update to anon, authenticated
using (bucket_id <> 'plant-certificates')
with check (bucket_id <> 'plant-certificates');
create policy plant_certificates_no_client_delete on storage.objects
as restrictive for delete to anon, authenticated
using (bucket_id <> 'plant-certificates');

commit;
