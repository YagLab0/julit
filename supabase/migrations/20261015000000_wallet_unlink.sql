begin;

-- A verified wallet may now be cleared (unlinked) so the account holder can
-- link a different one. Swapping directly to another wallet and changing
-- company_type while linked stay forbidden.
create or replace function private.enforce_company_identity()
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
    (new.wallet_address is not null and new.wallet_address is distinct from old.wallet_address)
    or new.company_type is distinct from old.company_type
  ) then
    raise exception 'A verified company wallet and its company type are fixed.' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Only the server role may call it, same contract as link_company_wallet.
-- Lots referencing the wallet block the update with a foreign key violation.
create function public.unlink_company_wallet(
  p_auth_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.companies as c
  set wallet_address = null, wallet_verified_at = null
  where c.id = p_auth_user_id and c.wallet_address is not null;

  if not found then
    raise exception 'The company has no verified wallet to unlink.'
      using errcode = '23514';
  end if;
end;
$$;

revoke all on function public.unlink_company_wallet(uuid)
  from public, anon, authenticated;
grant execute on function public.unlink_company_wallet(uuid) to service_role;

comment on function public.unlink_company_wallet(uuid) is
  'Clears the company verified wallet so a new one can be linked; blocked while lots reference it.';

commit;
