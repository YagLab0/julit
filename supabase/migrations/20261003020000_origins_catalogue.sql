begin;

-- Origins become the mine catalogue: one row per real origin, carrying the
-- mine's published metadata and its reference source. Public read is unchanged.
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
  name = 'Olaroz',
  code = 'OLZ',
  salar = 'Salar de Olaroz',
  producer = 'Sales de Jujuy',
  shareholders = 'Rio Tinto 66,5 % · Toyota Tsusho 25 % · JEMSE 8,5 %',
  longitude = -66.70248,
  latitude = -23.46293,
  capacity_tpa = 42500,
  altitude_m = 3900,
  water_m3_per_tonne = 51.00,
  note = 'Huella hídrica publicada: 51,0 m³/t Li₂CO₃ (Díaz Paz et al., Heliyon 2025).',
  source_label = 'Rio Tinto 20-F FY2025',
  source_url = 'https://www.sec.gov/Archives/edgar/data/863064/000162828026009531/rio-20251231.htm'
where id = 'olaroz';

update public.origins set
  name = 'Cauchari-Olaroz',
  code = 'EXAR',
  salar = 'Salar de Cauchari',
  producer = 'Minera Exar',
  shareholders = 'Ganfeng Lithium · Lithium Argentina · JEMSE',
  longitude = -66.77329,
  latitude = -23.67394,
  capacity_tpa = 40000,
  altitude_m = null,
  water_m3_per_tonne = null,
  note = 'Producción 2025: ~34.100 t de carbonato de litio. Sin huella hídrica publicada con la misma metodología.',
  source_label = 'Cauchari-Olaroz SK 1300 Technical Report 2026',
  source_url = 'https://www.sec.gov/Archives/edgar/data/1440972/000110465926032465/tm269254d1_ex99-1.htm'
where id = 'cauchari_olaroz';

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
  'Published site altitude; null when no published value exists.';
comment on column public.origins.water_m3_per_tonne is
  'Published reference water footprint; null when no published value exists.';

commit;
