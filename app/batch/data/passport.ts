// Passport index read: the Lot by `pda_address` plus its Origin row,
// anonymous under RLS like the catalogue reads. The row is a public index
// snapshot, not the authoritative ledger, so the page never claims
// verification. Unlike the catalogue columns, the passport read also selects
// the producer wallet and the per-transition transaction signatures, and
// never selects the price: commercial terms stay in the catalogue
// (ADR-0013) and a column that is not read cannot leak into the client
// payload.

import { cache } from "react";
import type { Lot } from "../../explorer/data/lots";
import { ORIGIN_COLUMNS, type Origin } from "../../explorer/data/origins";
import { createClient } from "../../lib/supabase/server";

export type PassportLot = Omit<Lot, "price_usdc"> & {
  producer_wallet: string;
  creation_tx_signature: string;
  fund_tx_signature: string | null;
  redeem_tx_signature: string | null;
  cancel_tx_signature: string | null;
};

export const PASSPORT_LOT_COLUMNS =
  "pda_address, lot_id, origin_id, status, mint_address, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, buyer_wallet, spec_sheet_sha256, spec_sheet_path, indexed_at, producer_wallet, creation_tx_signature, fund_tx_signature, redeem_tx_signature, cancel_tx_signature" as const;

// Same base58 shape the `lots` table enforces on `pda_address`.
const PDA_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type PassportRecord = {
  lot: PassportLot;
  origin: Origin;
};

/**
 * Lot and Origin for `/batch/<pda>`, or null when the address is malformed
 * or absent from the index. Cached per request so the page and its
 * per-lot metadata share one read.
 */
export const getPassportRecord = cache(
  async (pda: string): Promise<PassportRecord | null> => {
    if (!PDA_PATTERN.test(pda)) return null;

    const supabase = await createClient();
    const { data: lot, error: lotError } = await supabase
      .from("lots")
      .select(PASSPORT_LOT_COLUMNS)
      .eq("pda_address", pda)
      .maybeSingle();
    if (lotError) {
      throw new Error(
        `Could not load the passport record: ${lotError.message}`
      );
    }
    if (lot === null) return null;

    const { data: origin, error: originError } = await supabase
      .from("origins")
      .select(ORIGIN_COLUMNS)
      .eq("id", lot.origin_id)
      .maybeSingle();
    if (originError) {
      throw new Error(
        `Could not load the passport origin: ${originError.message}`
      );
    }
    if (origin === null) return null;

    return {
      lot: lot as PassportLot,
      origin: origin as Origin,
    };
  }
);
