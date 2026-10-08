-- ============================================================================
-- PASO 1: Habilitar el valor 'admin' en el enum
-- (PostgreSQL requiere ejecutar esto primero para que el nuevo valor del enum esté confirmado)
-- ============================================================================
ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'admin';

-- ============================================================================
-- PASO 2: Políticas RLS y provisión del usuario administrador
-- ============================================================================

-- Políticas RLS para lectura global de administradores (utiliza JWT para evitar recursión)
DROP POLICY IF EXISTS companies_read_admin ON public.companies;
CREATE POLICY companies_read_admin ON public.companies
FOR SELECT TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'admin@julit.dev'
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS company_contracts_read_admin ON public.company_contracts;
CREATE POLICY company_contracts_read_admin ON public.company_contracts
FOR SELECT TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'admin@julit.dev'
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Usuario Administrador en Auth
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1a1a1a1-0000-4000-8000-000000000003',
  'authenticated', 'authenticated',
  'admin@julit.dev',
  extensions.crypt('julit-demo-2026', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  '', '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = extensions.crypt('julit-demo-2026', extensions.gen_salt('bf')),
  email_confirmed_at = now();

-- Identidad en Auth
INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES (
  'a1a1a1a1-0000-4000-8000-000000000003',
  'a1a1a1a1-0000-4000-8000-000000000003',
  'a1a1a1a1-0000-4000-8000-000000000003',
  '{"sub":"a1a1a1a1-0000-4000-8000-000000000003","email":"admin@julit.dev","email_verified":true}'::jsonb,
  'email', now(), now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- Registro de empresa en Companies
INSERT INTO public.companies (
  id, name, company_type, origin_id, wallet_address, wallet_verified_at,
  purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne
) VALUES (
  'a1a1a1a1-0000-4000-8000-000000000003',
  'JuLit Protocol Admin',
  'admin',
  null, null, null, null, null, null
)
ON CONFLICT (id) DO UPDATE SET
  company_type = excluded.company_type,
  name = excluded.name;
