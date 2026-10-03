begin;

-- Producer-bound origin (ADR-0006): a producer operates exactly one origin,
-- fixed once set. Auditors and buyers never have one. Producers may lack an
-- origin until onboarding assigns it; batch indexing enforces the match.
alter table public.companies
  add column origin_id text references public.origins (id);

comment on column public.companies.origin_id is
  'Producer-bound origin, fixed once set; null for auditors and buyers.';

alter table public.companies
  add constraint companies_origin_producer_only
  check (origin_id is null or company_type = 'producer');

create function private.enforce_company_origin()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.origin_id is not null
     and new.origin_id is distinct from old.origin_id then
    raise exception 'A company origin is fixed once set.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger companies_enforce_origin
before update of origin_id on public.companies
for each row execute function private.enforce_company_origin();

-- Mutual-consent company contracts (ADR-0006): created by the producer,
-- accepted or declined by the counterparty. Only accepted contracts scope
-- which auditors and buyers a producer may designate on its batches.
create type public.contract_status as enum ('pending', 'accepted', 'revoked');

create table public.company_contracts (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.companies (id) on delete restrict,
  counterparty_id uuid not null references public.companies (id) on delete restrict,
  status public.contract_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint company_contracts_distinct_parties
    check (producer_id <> counterparty_id),
  constraint company_contracts_response_consistency check (
    (status = 'pending' and responded_at is null)
    or (status <> 'pending' and responded_at is not null)
  )
);

comment on table public.company_contracts is
  'Mutual-consent commercial contract between a producer and an auditor or buyer company.';

create unique index company_contracts_pair_idx
  on public.company_contracts (producer_id, counterparty_id);

create index company_contracts_counterparty_idx
  on public.company_contracts (counterparty_id);

create function private.check_contract_parties()
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
    where id = new.counterparty_id and company_type in ('auditor', 'buyer')
  ) then
    raise exception 'The contract counterparty must be a registered auditor or buyer.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger company_contracts_check_parties
before insert or update of producer_id, counterparty_id on public.company_contracts
for each row execute function private.check_contract_parties();

-- Extend batch participant checks: designated auditor and reserved buyer must
-- hold an accepted contract with the producer, and the batch origin must match
-- the producer's bound origin. The index rejects uncontracted participants
-- (ADR-0006): on-chain cannot observe off-chain contracts, so indexing is the
-- enforcement point.
create or replace function private.check_batch_participants()
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
    where wallet_address = new.producer_wallet
      and company_type = 'producer'
      and origin_id = new.origin_id
  ) then
    raise exception 'The batch origin must match the producer origin.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.companies
    where wallet_address = new.auditor_wallet and company_type = 'auditor'
  ) then
    raise exception 'The auditor wallet must belong to a registered auditor.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.company_contracts cc
    join public.companies p on p.id = cc.producer_id
    join public.companies a on a.id = cc.counterparty_id
    where p.wallet_address = new.producer_wallet
      and a.wallet_address = new.auditor_wallet
      and a.company_type = 'auditor'
      and cc.status = 'accepted'
  ) then
    raise exception 'The designated auditor must hold an accepted contract with the producer.' using errcode = '23514';
  end if;
  if new.reserved_buyer_wallet is not null then
    if not exists (
      select 1 from public.companies
      where wallet_address = new.reserved_buyer_wallet and company_type = 'buyer'
    ) then
      raise exception 'The reserved wallet must belong to a registered buyer.' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.company_contracts cc
      join public.companies p on p.id = cc.producer_id
      join public.companies b on b.id = cc.counterparty_id
      where p.wallet_address = new.producer_wallet
        and b.wallet_address = new.reserved_buyer_wallet
        and b.company_type = 'buyer'
        and cc.status = 'accepted'
    ) then
      raise exception 'The reserved buyer must hold an accepted contract with the producer.' using errcode = '23514';
    end if;
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

-- Re-create the participant trigger to also fire on origin changes.
drop trigger batches_check_participants on public.batches;
create trigger batches_check_participants
before insert or update of producer_wallet, auditor_wallet, reserved_buyer_wallet,
  buyer_wallet, origin_id on public.batches
for each row execute function private.check_batch_participants();

-- Access: each company reads only contracts where it is a party; writes go
-- through the API's service role (ADR-0003). No anonymous access.
alter table public.company_contracts enable row level security;

revoke all on table public.company_contracts
  from public, anon, authenticated, service_role;
grant select on public.company_contracts to authenticated;
grant select, insert, update on public.company_contracts to service_role;

create policy company_contracts_read_own on public.company_contracts
for select to authenticated
using (
  producer_id = (select auth.uid())
  or counterparty_id = (select auth.uid())
);

revoke all on function private.enforce_company_origin() from public, anon, authenticated;
revoke all on function private.check_contract_parties() from public, anon, authenticated;
grant execute on function private.enforce_company_origin() to service_role;
grant execute on function private.check_contract_parties() to service_role;

commit;
