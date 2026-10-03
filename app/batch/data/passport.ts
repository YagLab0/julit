// Passport index read: the Batch by `pda_address` plus its Origin row,
// anonymous under RLS like the catalogue reads. The row is a public index
// snapshot, not the authoritative ledger, so the page never claims
// verification. Unlike the catalogue columns, the passport read also selects
// the producer wallet and the creation transaction signature, and never
// selects the price: commercial terms stay in the catalogue (ADR-0009) and a
// column that is not read cannot leak into the client payload.

import { cache } from "react";
import type { Batch } from "../../batches/data/batches";
import { ORIGIN_COLUMNS, type Origin } from "../../batches/data/origins";
import { createClient } from "../../lib/supabase/server";

export type PassportBatch = Omit<Batch, "price_usdc"> & {
  producer_wallet: string;
  creation_tx_signature: string;
};

export const PASSPORT_BATCH_COLUMNS =
  "pda_address, batch_id, origin_id, status, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, esg_approved, eu_regulation_assessment, audit_sha256, audit_certificate_path, indexed_at, producer_wallet, creation_tx_signature" as const;

// Same base58 shape the `batches` table enforces on `pda_address`.
const PDA_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type PassportRecord = {
  batch: PassportBatch;
  origin: Origin;
};

/**
 * Batch and Origin for `/batch/<pda>`, or null when the address is malformed
 * or absent from the index. Cached per request so the page and its
 * per-batch metadata share one read.
 */
export const getPassportRecord = cache(
  async (pda: string): Promise<PassportRecord | null> => {
    if (!PDA_PATTERN.test(pda)) return null;

    const supabase = await createClient();
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select(PASSPORT_BATCH_COLUMNS)
      .eq("pda_address", pda)
      .maybeSingle();
    if (batchError) {
      throw new Error(
        `Could not load the passport record: ${batchError.message}`
      );
    }
    if (batch === null) return null;

    const { data: origin, error: originError } = await supabase
      .from("origins")
      .select(ORIGIN_COLUMNS)
      .eq("id", batch.origin_id)
      .maybeSingle();
    if (originError) {
      throw new Error(
        `Could not load the passport origin: ${originError.message}`
      );
    }
    if (origin === null) return null;

    return {
      batch: batch as PassportBatch,
      origin: origin as Origin,
    };
  }
);
