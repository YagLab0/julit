begin;

-- Add 'admin' to public.company_type enum
alter type public.company_type add value if not exists 'admin';

-- Function to check if current authenticated user is an admin without RLS recursion
create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select (
    (auth.jwt() ->> 'email') = 'admin@julit.dev'
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

-- RLS: Allow authenticated admin users to read all companies and all contracts
drop policy if exists companies_read_admin on public.companies;
create policy companies_read_admin on public.companies
for select to authenticated
using (private.is_admin());

drop policy if exists company_contracts_read_admin on public.company_contracts;
create policy company_contracts_read_admin on public.company_contracts
for select to authenticated
using (private.is_admin());

commit;
