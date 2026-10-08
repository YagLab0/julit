-- Rename the plant-certificate columns to the lot spec sheet vocabulary.
-- The generated path column follows the SHA column rename automatically;
-- only its own name needs updating. The storage bucket keeps its
-- `plant-certificates` id: renaming it would orphan the stored PDFs.
alter table public.lots
  rename column plant_cert_sha256 to spec_sheet_sha256;
alter table public.lots
  rename column plant_certificate_path to spec_sheet_path;
alter table public.lots
  rename constraint lots_plant_cert_sha256_check to lots_spec_sheet_sha256_check;

comment on column public.lots.spec_sheet_sha256 is 'SHA-256 of the lot spec sheet PDF stored under plant-certificates/<producer_wallet>/.';
