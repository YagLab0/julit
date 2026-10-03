// Pure record contrast: indexed row + derived PDA + decoded on-chain account
// in, verdict out (ADR-0011). No I/O and no Number math — index decimal
// strings and on-chain scaled integers are both parsed to scaled BigInt with
// fixed multipliers. Price, reservation and buyer stay out of the contrast,
// like they stay out of the passport (ADR-0009).

import {
  BatchStatus as OnChainBatchStatus,
  JULIT_PROGRAM_ADDRESS,
} from "../generated/julit";
import type { BatchStatus as IndexedBatchStatus } from "../batches/data/batches";
import type { PassportBatch } from "./data/passport";

/** The indexed fields the contrast checks; decimals arrive as exact strings
 *  or numbers and are scaled without Number math. */
export type IndexedBatch = Pick<
  PassportBatch,
  "pda_address" | "batch_id" | "producer_wallet" | "origin_id" | "status"
> & {
  volume_tonnes: string | number;
  purity_pct: string | number;
  water_footprint_m3_per_tonne: string | number;
  carbon_footprint_kg_co2e_per_tonne: string | number;
};

/** The decoded batch account plus its owner programme; the decoded Account
 *  from `fetchMaybeBatch` is structurally assignable to this shape. */
export type OnChainBatch = {
  programAddress: string;
  data: {
    batchId: string;
    originId: string;
    producer: string;
    volumeTonnes: bigint;
    purityBasisPoints: bigint;
    waterM3PerTonneScaled: bigint;
    carbonKgCo2ePerTonneScaled: bigint;
    status: number;
  };
};

export type ContrastField =
  | "pda"
  | "programAddress"
  | "batchId"
  | "producer"
  | "origin"
  | "volume"
  | "purity"
  | "water"
  | "carbon"
  | "status";

export type RecordContrast =
  | { state: "verified" }
  | { state: "missing" }
  | { state: "mismatch"; fields: readonly ContrastField[] };

const ONCHAIN_STATUS: Readonly<Record<number, IndexedBatchStatus>> = {
  [OnChainBatchStatus.Created]: "created",
  [OnChainBatchStatus.Audited]: "audited",
  [OnChainBatchStatus.Completed]: "completed",
};

/**
 * Exact decimal text -> scaled BigInt with a fixed multiplier, never through
 * Number ("99.5" and "99.50" both become 9950 at scale 2; u64-boundary values
 * keep full precision). Returns null when the text cannot represent an exact
 * scaled integer — non-numeric, negative, or more decimals than the
 * multiplier keeps — which can only mismatch the on-chain value.
 */
export function scaledDecimal(
  value: string | number,
  scale: number
): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(value).trim());
  if (!match) return null;
  const [, whole, frac = ""] = match;
  if (frac.length > scale) return null;
  const base = 10n ** BigInt(scale);
  return BigInt(whole) * base + BigInt(frac.padEnd(scale, "0") || "0");
}

/**
 * Contrast the indexed record with the batch's on-chain account: the account
 * exists at the derived PDA, belongs to the JuLit programme, and every field
 * matches the index. A missing account is "missing"; any difference is a
 * "mismatch" naming the differing fields.
 */
export function contrastBatchRecord(input: {
  indexed: IndexedBatch;
  derivedPda: string;
  account: OnChainBatch | null;
}): RecordContrast {
  const { indexed, derivedPda, account } = input;

  // When the derivation already disagrees with the indexed PDA the row is
  // inconsistent, so a missing account reports that mismatch instead.
  if (account === null) {
    return derivedPda === indexed.pda_address
      ? { state: "missing" }
      : { state: "mismatch", fields: ["pda"] };
  }

  const fields: ContrastField[] = [];
  if (derivedPda !== indexed.pda_address) fields.push("pda");
  if (account.programAddress !== JULIT_PROGRAM_ADDRESS)
    fields.push("programAddress");
  if (account.data.batchId !== indexed.batch_id) fields.push("batchId");
  if (account.data.producer !== indexed.producer_wallet)
    fields.push("producer");
  if (account.data.originId !== indexed.origin_id) fields.push("origin");
  if (scaledDecimal(indexed.volume_tonnes, 0) !== account.data.volumeTonnes)
    fields.push("volume");
  if (scaledDecimal(indexed.purity_pct, 2) !== account.data.purityBasisPoints)
    fields.push("purity");
  if (
    scaledDecimal(indexed.water_footprint_m3_per_tonne, 2) !==
    account.data.waterM3PerTonneScaled
  )
    fields.push("water");
  if (
    scaledDecimal(indexed.carbon_footprint_kg_co2e_per_tonne, 2) !==
    account.data.carbonKgCo2ePerTonneScaled
  )
    fields.push("carbon");
  if (ONCHAIN_STATUS[account.data.status] !== indexed.status)
    fields.push("status");

  return fields.length === 0
    ? { state: "verified" }
    : { state: "mismatch", fields };
}

const HEX_64 = /^[0-9a-f]{64}$/;

/**
 * Certificate digest comparison: the PDF's computed SHA-256 against the hex
 * digest recorded for the batch, case-insensitive. Anything that is not an
 * exact 64-hex equality — including malformed input — is a mismatch.
 */
export function certificateVerdict(
  recordedHex: string,
  computedHex: string
): "match" | "mismatch" {
  const recorded = recordedHex.trim().toLowerCase();
  const computed = computedHex.trim().toLowerCase();
  if (!HEX_64.test(recorded) || !HEX_64.test(computed)) return "mismatch";
  return recorded === computed ? "match" : "mismatch";
}

/**
 * The batch's passport route. The public URL the QR encodes is always derived
 * per view — the request origin plus this path — so it can never drift apart
 * from the record (database contract).
 */
export function passportPath(pda: string): string {
  return `/batch/${pda}`;
}
