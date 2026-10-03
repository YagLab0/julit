begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select results_eq(
  $$select name, code, salar, producer, shareholders, longitude, latitude,
           capacity_tpa, altitude_m, water_m3_per_tonne, note, source_label, source_url
    from public.origins where id = 'olaroz'$$,
  $$values (
      'Olaroz'::text,
      'OLZ'::text,
      'Salar de Olaroz'::text,
      'Sales de Jujuy'::text,
      'Rio Tinto 66,5 % · Toyota Tsusho 25 % · JEMSE 8,5 %'::text,
      (-66.70248)::numeric,
      (-23.46293)::numeric,
      42500,
      3900,
      51.00::numeric,
      'Huella hídrica publicada: 51,0 m³/t Li₂CO₃ (Díaz Paz et al., Heliyon 2025).'::text,
      'Rio Tinto 20-F FY2025'::text,
      'https://www.sec.gov/Archives/edgar/data/863064/000162828026009531/rio-20251231.htm'::text
    )$$,
  'Olaroz carries its published catalogue values');

select results_eq(
  $$select name, code, salar, producer, shareholders, longitude, latitude,
           capacity_tpa, altitude_m, water_m3_per_tonne, note, source_label, source_url
    from public.origins where id = 'cauchari_olaroz'$$,
  $$values (
      'Cauchari-Olaroz'::text,
      'EXAR'::text,
      'Salar de Cauchari'::text,
      'Minera Exar'::text,
      'Ganfeng Lithium · Lithium Argentina · JEMSE'::text,
      (-66.77329)::numeric,
      (-23.67394)::numeric,
      40000,
      null::integer,
      null::numeric,
      'Producción 2025: ~34.100 t de carbonato de litio. Sin huella hídrica publicada con la misma metodología.'::text,
      'Cauchari-Olaroz SK 1300 Technical Report 2026'::text,
      'https://www.sec.gov/Archives/edgar/data/1440972/000110465926032465/tm269254d1_ex99-1.htm'::text
    )$$,
  'Cauchari-Olaroz carries its values and leaves unpublished references null');

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
    values ('duplicate-code', 'Duplicate code', 'OLZ', 'Salar', 'Producer',
      'Shareholders', 0, 0, 1, 'note', 'label', 'https://example.test')$$,
  '23505', null, 'A duplicated origin code is rejected');

set local role anon;
select results_eq($$select id, code from public.origins order by id$$,
  $$values ('cauchari_olaroz'::text, 'EXAR'::text), ('olaroz'::text, 'OLZ'::text)$$,
  'Anonymous clients read the origins catalogue');
reset role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000101', 'catalogue-producer@example.test'),
  ('00000000-0000-0000-0000-000000000102', 'catalogue-auditor@example.test');

insert into public.companies
  (id, name, company_type, wallet_address, wallet_verified_at, origin_id) values
  ('00000000-0000-0000-0000-000000000101', 'Catalogue Producer', 'producer',
    repeat('3', 31) || '2', now(), 'cauchari_olaroz'),
  ('00000000-0000-0000-0000-000000000102', 'Catalogue Auditor', 'auditor',
    repeat('3', 31) || '3', now(), null);

set local role service_role;

insert into public.company_contracts (producer_id, counterparty_id, status, responded_at)
  values ('00000000-0000-0000-0000-000000000101',
          '00000000-0000-0000-0000-000000000102', 'accepted', now());

select results_eq($$insert into public.batches (
    pda_address, batch_id, producer_wallet, auditor_wallet, origin_id,
    volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
    carbon_footprint_kg_co2e_per_tonne, price_usdc, creation_tx_signature,
    observed_slot
  ) values (
    repeat('3', 31) || '4', 'LIT-2026-CAT-01', repeat('3', 31) || '2',
    repeat('3', 31) || '3', 'cauchari_olaroz', 25, 99.50, 100, 200, 3000,
    repeat('3', 63) || '5', 1002
  ) returning origin_id$$,
  $$values ('cauchari_olaroz'::text)$$,
  'A batch references the Cauchari-Olaroz origin catalogue row');

reset role;
select * from finish();
rollback;
