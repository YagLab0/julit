// Batch index rows from the public Supabase `batches` table (anonymous SELECT
// under RLS). Display-only surface: the row is a read index, not the
// authoritative ledger, so the fiche never claims verification.

export type BatchStatus = "created" | "audited" | "completed";
export type EuAssessment = "conformant" | "non_conformant";

export type Batch = {
  pda_address: string;
  batch_id: string;
  origin_id: string;
  status: BatchStatus;
  volume_tonnes: number;
  purity_pct: number;
  water_footprint_m3_per_tonne: number;
  carbon_footprint_kg_co2e_per_tonne: number;
  price_usdc: number;
  /** Present once the designated auditor certifies the batch. */
  esg_approved: boolean | null;
  eu_regulation_assessment: EuAssessment | null;
  audit_sha256: string | null;
  audit_certificate_path: string | null;
  indexed_at: string;
};

/** Columns the origin fiche needs, in one place for the per-origin query. */
export const BATCH_COLUMNS =
  "pda_address, batch_id, origin_id, status, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, price_usdc, esg_approved, eu_regulation_assessment, audit_sha256, audit_certificate_path, indexed_at" as const;

/** Public URL of the audited certificate PDF, content-addressed by digest. */
export function batchCertificateUrl(batch: Batch): string | null {
  if (batch.audit_certificate_path === null) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audit-certificates/${batch.audit_certificate_path}`;
}
