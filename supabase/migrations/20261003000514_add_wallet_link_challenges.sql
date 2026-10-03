begin;

create table public.wallet_link_challenges (
  nonce text primary key
    check (nonce ~ '^[A-Za-z0-9_-]{43}$'),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  account_email text not null check (length(btrim(account_email)) > 0),
  wallet_address text not null
    check (wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  domain text not null check (length(btrim(domain)) > 0),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint wallet_link_challenges_expiry_check check (expires_at > issued_at)
);

create index wallet_link_challenges_auth_user_id_idx
  on public.wallet_link_challenges (auth_user_id);

alter table public.wallet_link_challenges enable row level security;

revoke all on table public.wallet_link_challenges
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.wallet_link_challenges to service_role;

-- PostgREST only reaches functions in exposed schemas, so this lives in public
-- with execute revoked from every client role; only the server role may call it.
create function public.link_company_wallet(
  p_auth_user_id uuid,
  p_wallet_address text,
  p_nonce text
)
returns table (wallet_address text, wallet_verified_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.wallet_link_challenges as c
  set consumed_at = now()
  where c.nonce = p_nonce
    and c.auth_user_id = p_auth_user_id
    and c.wallet_address = p_wallet_address
    and c.consumed_at is null
    and c.expires_at > now();

  if not found then
    raise exception 'The wallet link challenge is invalid, expired, or already consumed.'
      using errcode = '23514';
  end if;

  update public.companies as c
  set wallet_address = p_wallet_address, wallet_verified_at = now()
  where c.id = p_auth_user_id and c.wallet_address is null;

  if not found then
    raise exception 'The company already has a verified wallet or no company profile exists.'
      using errcode = '23514';
  end if;

  return query
    select c.wallet_address, c.wallet_verified_at
    from public.companies c
    where c.id = p_auth_user_id;
end;
$$;

revoke all on function public.link_company_wallet(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.link_company_wallet(uuid, text, text) to service_role;

comment on table public.wallet_link_challenges is
  'Single-use wallet link proofs; issued and consumed only by the authenticated API.';
comment on function public.link_company_wallet(uuid, text, text) is
  'Consumes a wallet link challenge and sets the company verified wallet in one transaction.';

commit;
