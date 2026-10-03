begin;

-- Origins become the mine catalogue: one row per demo mine, carrying the
-- site's plant coordinates, capacity and water-footprint reference plus the
-- fictional producer's reference block. Public read is unchanged.
alter table public.origins
  add column code text,
  add column salar text,
  add column producer text,
  add column shareholders text,
  add column longitude numeric(8, 5),
  add column latitude numeric(8, 5),
  add column capacity_tpa integer,
  add column altitude_m integer,
  add column water_m3_per_tonne numeric,
  add column note text,
  add column source_label text,
  add column source_url text;

update public.origins set
  name = 'Salar de Peña Blanca',
  code = 'PBL',
  salar = 'Salar de Peña Blanca',
  producer = 'Sales del Altiplano S.A.',
  shareholders = 'Altiplano Holding 60 % · Fondo Puna 25 % · Minera Jujeña 15 %',
  longitude = -66.70248,
  latitude = -23.46293,
  capacity_tpa = 42500,
  altitude_m = 3900,
  water_m3_per_tonne = 51.00,
  note = 'Huella hídrica de referencia: 51,0 m³/t Li₂CO₃. Datos de demostración: empresa y proyecto son ficticios.',
  source_label = 'Informe técnico Peña Blanca 2025',
  source_url = 'https://example.com/informes/pena-blanca-2025'
where id = 'pena_blanca';

update public.origins set
  name = 'Salar del Cóndor',
  code = 'CNR',
  salar = 'Salar del Cóndor',
  producer = 'Minera Cóndor S.A.',
  shareholders = 'Cóndor Holding 70 % · Fondo Puna 30 %',
  longitude = -66.77329,
  latitude = -23.67394,
  capacity_tpa = 40000,
  altitude_m = null,
  water_m3_per_tonne = null,
  note = 'Producción de referencia 2025: ~34.100 t de carbonato de litio; sin huella hídrica publicada. Datos de demostración: empresa y proyecto son ficticios.',
  source_label = 'Informe técnico Cóndor 2026',
  source_url = 'https://example.com/informes/condor-2026'
where id = 'condor';

alter table public.origins
  alter column code set not null,
  alter column salar set not null,
  alter column producer set not null,
  alter column shareholders set not null,
  alter column longitude set not null,
  alter column latitude set not null,
  alter column capacity_tpa set not null,
  alter column note set not null,
  alter column source_label set not null,
  alter column source_url set not null,
  add constraint origins_code_key unique (code),
  add constraint origins_longitude_check check (longitude between -180 and 180),
  add constraint origins_latitude_check check (latitude between -90 and 90),
  add constraint origins_capacity_tpa_check check (capacity_tpa > 0),
  add constraint origins_altitude_m_check check (altitude_m is null or altitude_m > 0),
  add constraint origins_water_footprint_check check (
    water_m3_per_tonne is null or water_m3_per_tonne >= 0
  );

comment on column public.origins.producer is
  'Display name of the Producer company operating this origin.';
comment on column public.origins.altitude_m is
  'Reference site altitude used by the demo catalogue; null when absent.';
comment on column public.origins.water_m3_per_tonne is
  'Reference water footprint used by the demo catalogue; null when absent.';

commit;
