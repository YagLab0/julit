// Lot index rows from the public Supabase `lots` table (anonymous SELECT
// under RLS). Display-only surface: the row is a read index, not the
// authoritative ledger, so the fiche never claims verification.

export type LotStatus =
  | "listed"
  | "funded"
  | "redeemed"
  | "cancelled"
  | "shipped"
  | "refunded"
  | "claimed";

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
  spec_sheet_sha256: string;
  spec_sheet_path: string;
  /** Deadline for the producer to post shipping evidence. */
  ship_by: string;
  /** Buyer confirmation window in seconds, counted from shipped_at. */
  confirm_window_secs: number;
  /** Protocol take rate frozen at funding; null while unfunded. */
  fee_bps: number | null;
  /** mark_shipped timestamp; null until the producer ships. */
  shipped_at: string | null;
  /** SHA-256 hex of the bill of lading; null until shipped. */
  bl_hash: string | null;
  indexed_at: string;
};

/** Columns the origin fiche needs, in one place for the per-origin query. */
export const LOT_COLUMNS =
  "pda_address, lot_id, origin_id, status, mint_address, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, price_usdc, producer_wallet, buyer_wallet, spec_sheet_sha256, spec_sheet_path, ship_by, confirm_window_secs, fee_bps, shipped_at, bl_hash, indexed_at" as const;

/** Public URL of the lot's spec sheet PDF, content-addressed by digest. */
export function specSheetUrl(lot: Pick<Lot, "spec_sheet_path">): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/plant-certificates/${lot.spec_sheet_path}`;
}
