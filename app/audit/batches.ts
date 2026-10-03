import { createServiceClient } from "../lib/supabase/service";

export type EuAssessment = "conformant" | "non_conformant";
export type BatchStatus = "created" | "audited" | "completed";

export type AuditBatch = {
  pdaAddress: string;
  batchId: string;
  producerName: string;
  producerWallet: string;
  originName: string;
  volumeTonnes: number;
  purityPct: number;
  waterM3PerTonne: number;
  carbonKgCo2ePerTonne: number;
  priceUsdc: number;
  status: BatchStatus;
  esgApproved: boolean | null;
  euAssessment: EuAssessment | null;
  auditSha256: string | null;
};

type BatchRow = {
  pda_address: string;
  batch_id: string;
  producer_wallet: string;
  status: BatchStatus;
  volume_tonnes: number;
  purity_pct: number;
  water_footprint_m3_per_tonne: number;
  carbon_footprint_kg_co2e_per_tonne: number;
  price_usdc: number;
  esg_approved: boolean | null;
  eu_regulation_assessment: EuAssessment | null;
  audit_sha256: string | null;
  producer: { name: string };
  origin: { name: string };
};

const BATCH_SELECT =
  "pda_address, batch_id, producer_wallet, status, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, price_usdc, esg_approved, eu_regulation_assessment, audit_sha256, producer:companies!batches_producer_wallet_fkey(name), origin:origins!batches_origin_id_fkey(name)";

function toAuditBatch(row: BatchRow): AuditBatch {
  return {
    pdaAddress: row.pda_address,
    batchId: row.batch_id,
    producerName: row.producer.name,
    producerWallet: row.producer_wallet,
    originName: row.origin.name,
    volumeTonnes: Number(row.volume_tonnes),
    purityPct: Number(row.purity_pct),
    waterM3PerTonne: Number(row.water_footprint_m3_per_tonne),
    carbonKgCo2ePerTonne: Number(row.carbon_footprint_kg_co2e_per_tonne),
    priceUsdc: Number(row.price_usdc),
    status: row.status,
    esgApproved: row.esg_approved,
    euAssessment: row.eu_regulation_assessment,
    auditSha256: row.audit_sha256,
  };
}

/**
 * Server-side read of the batches designated to an auditor wallet. Producer
 * names live in `companies`, which browsers cannot read (ADR-0003), so the
 * join goes through the service role; `batches` itself is a public read index.
 */
export async function loadAuditorBatches(
  auditorWallet: string
): Promise<AuditBatch[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("batches")
    .select(BATCH_SELECT)
    .eq("auditor_wallet", auditorWallet)
    .order("indexed_at", { ascending: true })
    .returns<BatchRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(toAuditBatch);
}

/**
 * Same read scoped to a single batch PDA for the certification page; only
 * returns the batch when it is designated to this auditor.
 */
export async function loadAuditorBatch(
  pdaAddress: string,
  auditorWallet: string
): Promise<AuditBatch | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("batches")
    .select(BATCH_SELECT)
    .eq("pda_address", pdaAddress)
    .eq("auditor_wallet", auditorWallet)
    .maybeSingle()
    .returns<BatchRow>();

  if (error) {
    throw error;
  }

  return data ? toAuditBatch(data) : null;
}
