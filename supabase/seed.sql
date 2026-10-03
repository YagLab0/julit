-- Demo-only producer accounts, one per origin, provisioned instead of
-- self-registered. Applied locally by `supabase db reset` and to the linked
-- project by the reviewed `supabase db push --include-seed` runbook.
-- Idempotent: re-running never duplicates or overwrites.
--
-- Credentials are demo-only:
--   productor.olaroz@julit.dev          -> Sales de Jujuy  (olaroz)
--   productor.cauchari-olaroz@julit.dev -> Minera Exar    (cauchari_olaroz)
--   password: julit-demo-2026

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1a1a1a1-0000-4000-8000-000000000001',
    'authenticated', 'authenticated',
    'productor.olaroz@julit.dev',
    extensions.crypt('julit-demo-2026', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1a1a1a1-0000-4000-8000-000000000002',
    'authenticated', 'authenticated',
    'productor.cauchari-olaroz@julit.dev',
    extensions.crypt('julit-demo-2026', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values
  (
    'a1a1a1a1-0000-4000-8000-000000000001',
    'a1a1a1a1-0000-4000-8000-000000000001',
    'a1a1a1a1-0000-4000-8000-000000000001',
    '{"sub":"a1a1a1a1-0000-4000-8000-000000000001","email":"productor.olaroz@julit.dev","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    'a1a1a1a1-0000-4000-8000-000000000002',
    'a1a1a1a1-0000-4000-8000-000000000002',
    'a1a1a1a1-0000-4000-8000-000000000002',
    '{"sub":"a1a1a1a1-0000-4000-8000-000000000002","email":"productor.cauchari-olaroz@julit.dev","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  )
on conflict do nothing;

insert into public.companies (id, name, company_type, origin_id) values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'Sales de Jujuy', 'producer', 'olaroz'),
  ('a1a1a1a1-0000-4000-8000-000000000002', 'Minera Exar', 'producer', 'cauchari_olaroz')
on conflict (id) do nothing;
