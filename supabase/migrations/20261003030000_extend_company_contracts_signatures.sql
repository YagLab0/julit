begin;

-- Extend company_contracts for bilateral initiation and cryptographic signatures (ADR-0009).
-- Contracts can be initiated by either the producer or the counterparty (buyer/auditor).
-- Signatures record off-chain Ed25519 wallet signatures confirming mutual consent.

alter table public.company_contracts
  add column initiator_id uuid references public.companies (id) on delete restrict,
  add column initiator_signature text,
  add column counterparty_signature text,
  add column initiator_signed_at timestamptz,
  add column counterparty_signed_at timestamptz;

comment on column public.company_contracts.initiator_id is
  'Company that initiated the contract request (either the producer or the counterparty).';
comment on column public.company_contracts.initiator_signature is
  'Base58-encoded Ed25519 wallet signature of the initiator over the canonical contract message.';
comment on column public.company_contracts.counterparty_signature is
  'Base58-encoded Ed25519 wallet signature of the counterparty over the canonical contract message.';
comment on column public.company_contracts.initiator_signed_at is
  'Timestamp when the initiator cryptographically signed the contract request.';
comment on column public.company_contracts.counterparty_signed_at is
  'Timestamp when the counterparty cryptographically signed their acceptance.';

create function private.default_contract_initiator()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.initiator_id is null then
    new.initiator_id := new.producer_id;
  end if;
  return new;
end;
$$;

create trigger company_contracts_default_initiator
before insert on public.company_contracts
for each row execute function private.default_contract_initiator();

-- Backfill existing contracts to have initiator_id = producer_id
update public.company_contracts
set initiator_id = producer_id
where initiator_id is null;

alter table public.company_contracts
  alter column initiator_id set not null;

-- Ensure initiator is one of the two contract participants
alter table public.company_contracts
  add constraint company_contracts_initiator_is_party
  check (initiator_id = producer_id or initiator_id = counterparty_id);

-- Disallow empty signatures
alter table public.company_contracts
  add constraint company_contracts_initiator_sig_nonempty
  check (initiator_signature is null or length(btrim(initiator_signature)) > 0),
  add constraint company_contracts_counterparty_sig_nonempty
  check (counterparty_signature is null or length(btrim(counterparty_signature)) > 0);

-- Grant delete to service_role
grant delete on public.company_contracts to service_role;
revoke all on function private.default_contract_initiator() from public, anon, authenticated;
grant execute on function private.default_contract_initiator() to service_role;

commit;
