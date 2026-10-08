-- JuLit: Script para corregir las políticas RLS en Supabase
-- Ejecutar este script en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/mrhxzmaxefpgmxtmnkpg/sql/new

BEGIN;

-- 1. Eliminar las políticas recursivas anteriores que causaban error 42P17
DROP POLICY IF EXISTS companies_read_admin ON public.companies;
DROP POLICY IF EXISTS company_contracts_read_admin ON public.company_contracts;

-- 2. Asegurar que el tipo 'admin' esté presente en el enum company_type
ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'admin';

-- 3. Crear políticas RLS limpias y directas sin recursión (usando claims del JWT)
CREATE POLICY companies_read_admin ON public.companies
FOR SELECT TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'admin@julit.dev'
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY company_contracts_read_admin ON public.company_contracts
FOR SELECT TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'admin@julit.dev'
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

COMMIT;
