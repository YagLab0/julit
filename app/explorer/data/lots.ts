// Lot index rows from the public Supabase `lots` table (anonymous SELECT
// under RLS). Display-only surface: the row is a read index, not the
// authoritative ledger, so the fiche never claims verification.

export type LotStatus =
  "listed" | "funded" | "disputed" | "redeemed" | "claimed" | "cancelled";

export type Lot = {
  pda_address: string;
  lot_id: string;
  origin_id: string;
  status: LotStatus;
  mint_address: string;
  volume_tonnes: number;
  purity_pct: number;
  water_footprint_m3_per_tonne: number;
  carbon_footprint_kg_co2e_per_tonne: number;
  price_usdc: number;
  /** Producer's verified wallet — also the redeem release destination. */
  producer_wallet: string;
  /** Designated buyer fixed at creation; only this wallet may fund the escrow. */
  buyer_wallet: string;
  claimable_after: string;
  spec_sheet_sha256: string;
  spec_sheet_path: string;
  indexed_at: string;
};

/** Columns the origin fiche needs, in one place for the per-origin query. */
export const LOT_COLUMNS =
  "pda_address, lot_id, origin_id, status, mint_address, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, price_usdc, producer_wallet, buyer_wallet, claimable_after, spec_sheet_sha256, spec_sheet_path, indexed_at" as const;

/** Public URL of the lot's spec sheet PDF, content-addressed by digest. */
export function specSheetUrl(lot: Pick<Lot, "spec_sheet_path">): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/plant-certificates/${lot.spec_sheet_path}`;
}
