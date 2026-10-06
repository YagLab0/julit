begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select results_eq(
  $$select name, code, salar, producer, shareholders, longitude, latitude,
           capacity_tpa, altitude_m, water_m3_per_tonne, note, source_label, source_url
    from public.origins where id = 'pena_blanca'$$,
  $$values (
      'Salar de Peña Blanca'::text,
      'PBL'::text,
      'Salar de Peña Blanca'::text,
      'Sales del Altiplano S.A.'::text,
      'Altiplano Holding 60 % · Fondo Puna 25 % · Minera Jujeña 15 %'::text,
      (-66.70248)::numeric,
      (-23.46293)::numeric,
      42500,
      3900,
      51.00::numeric,
      'Huella hídrica de referencia: 51,0 m³/t Li₂CO₃. Datos de demostración: empresa y proyecto son ficticios.'::text,
      'Informe técnico Peña Blanca 2025'::text,
      'https://example.com/informes/pena-blanca-2025'::text
    )$$,
  'Peña Blanca carries its catalogue values');

select results_eq(
  $$select name, code, salar, producer, shareholders, longitude, latitude,
           capacity_tpa, altitude_m, water_m3_per_tonne, note, source_label, source_url
    from public.origins where id = 'condor'$$,
  $$values (
      'Salar del Cóndor'::text,
      'CNR'::text,
      'Salar del Cóndor'::text,
      'Minera Cóndor S.A.'::text,
      'Cóndor Holding 70 % · Fondo Puna 30 %'::text,
      (-66.77329)::numeric,
      (-23.67394)::numeric,
      40000,
      null::integer,
      null::numeric,
      'Producción de referencia 2025: ~34.100 t de carbonato de litio; sin huella hídrica publicada. Datos de demostración: empresa y proyecto son ficticios.'::text,
      'Informe técnico Cóndor 2026'::text,
      'https://example.com/informes/condor-2026'::text
    )$$,
  'Cóndor carries its values and leaves absent references null');

select throws_ok($$insert into public.origins
    (id, name, code, salar, producer, shareholders, longitude, latitude,
     capacity_tpa, note, source_label, source_url)
    values ('bad-longitude', 'Bad longitude', 'BADLON', 'Salar', 'Producer',
      'Shareholders', 181, 0, 1, 'note', 'label', 'https://example.test')$$,
  '23514', null, 'A longitude outside the valid range is rejected');

select throws_ok($$insert into public.origins
    (id, name, code, salar, producer, shareholders, longitude, latitude,
     capacity_tpa, note, source_label, source_url)
    values ('bad-capacity', 'Bad capacity', 'BADCAP', 'Salar', 'Producer',
      'Shareholders', 0, 0, 0, 'note', 'label', 'https://example.test')$$,
  '23514', null, 'A non-positive capacity is rejected');

select throws_ok($$insert into public.origins
    (id, name, code, salar, producer, shareholders, longitude, latitude,
     capacity_tpa, note, source_label, source_url)
    values ('duplicate-code', 'Duplicate code', 'PBL', 'Salar', 'Producer',
      'Shareholders', 0, 0, 1, 'note', 'label', 'https://example.test')$$,
  '23505', null, 'A duplicated origin code is rejected');

set local role anon;
select results_eq($$select id, code from public.origins order by id$$,
  $$values ('condor'::text, 'CNR'::text), ('pena_blanca'::text, 'PBL'::text)$$,
  'Anonymous clients read the origins catalogue');
reset role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000101', 'catalogue-producer@example.test'),
  ('00000000-0000-0000-0000-000000000102', 'catalogue-buyer@example.test');

insert into public.companies
  (id, name, company_type, wallet_address, wallet_verified_at, origin_id) values
  ('00000000-0000-0000-0000-000000000101', 'Catalogue Producer', 'producer',
    repeat('3', 31) || '2', now(), 'condor'),
  ('00000000-0000-0000-0000-000000000102', 'Catalogue Buyer', 'buyer',
    repeat('3', 31) || '3', now(), null);

set local role service_role;

insert into public.company_contracts (producer_id, counterparty_id, status, responded_at)
  values ('00000000-0000-0000-0000-000000000101',
          '00000000-0000-0000-0000-000000000102', 'accepted', now());

select results_eq($$insert into public.lots (
    pda_address, lot_id, producer_wallet, buyer_wallet, origin_id,
    mint_address, volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc, claimable_after,
    plant_cert_sha256, creation_tx_signature, observed_slot
  ) values (
    repeat('3', 31) || '4', 'LIT-2026-CAT-01', repeat('3', 31) || '2',
    repeat('3', 31) || '3', 'condor', repeat('3', 31) || '6', 25, 99.50,
    100, 200, 3000, now() + interval '30 days',
    repeat('a', 64), repeat('3', 63) || '5', 1002
  ) returning origin_id$$,
  $$values ('condor'::text)$$,
  'A lot references the Cóndor origin catalogue row');

reset role;
select * from finish();
rollback;
