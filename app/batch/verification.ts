// Pure record contrast: indexed row + derived PDA + decoded on-chain account
// in, verdict out (ADR-0011). No I/O and no Number math — index decimal
// strings and on-chain scaled integers are both parsed to scaled BigInt with
// fixed multipliers. Price stays out of the contrast, like it stays out of
// the passport (ADR-0013).

import type { ReadonlyUint8Array } from "@solana/kit";
import {
  LotStatus as OnChainLotStatus,
  JULIT_PROGRAM_ADDRESS,
} from "../generated/julit";
import type { LotStatus as IndexedLotStatus } from "../explorer/data/lots";
import type { PassportLot } from "./data/passport";

/** The indexed fields the contrast checks; decimals arrive as exact strings
 *  or numbers and are scaled without Number math. */
export type IndexedLot = Pick<
  PassportLot,
  | "pda_address"
  | "lot_id"
  | "producer_wallet"
  | "buyer_wallet"
  | "origin_id"
  | "mint_address"
  | "status"
  | "claimable_after"
  | "plant_cert_sha256"
> & {
  volume_tonnes: string | number;
  purity_pct: string | number;
  water_footprint_m3_per_tonne: string | number;
  carbon_footprint_kg_co2e_per_tonne: string | number;
};

/** The decoded lot account plus its owner programme; the decoded Account
 *  from `fetchMaybeLot` is structurally assignable to this shape. */
export type OnChainLot = {
  programAddress: string;
  data: {
    lotId: string;
    originId: string;
    producer: string;
    buyer: string;
    mint: string;
    volumeTonnes: bigint;
    purityBasisPoints: bigint;
    waterM3PerTonneScaled: bigint;
    carbonKgCo2ePerTonneScaled: bigint;
    claimableAfter: bigint;
    plantCertHash: ReadonlyUint8Array;
    status: number;
  };
};

export type ContrastField =
  | "pda"
  | "programAddress"
  | "lotId"
  | "producer"
  | "buyer"
  | "mint"
  | "origin"
  | "volume"
  | "purity"
  | "water"
  | "carbon"
  | "claimableAfter"
  | "plantCertHash"
  | "status";

export type RecordContrast =
  | { state: "verified" }
  | { state: "missing" }
  | { state: "mismatch"; fields: readonly ContrastField[] };

const ONCHAIN_STATUS: Readonly<Record<number, IndexedLotStatus>> = {
  [OnChainLotStatus.Listed]: "listed",
  [OnChainLotStatus.Funded]: "funded",
  [OnChainLotStatus.Disputed]: "disputed",
  [OnChainLotStatus.Redeemed]: "redeemed",
  [OnChainLotStatus.Claimed]: "claimed",
  [OnChainLotStatus.Cancelled]: "cancelled",
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

/** 32-byte hash -> lowercase hex, or null when the length is wrong. */
function bytesToHexLower(bytes: ReadonlyUint8Array): string | null {
  if (bytes.length !== 32) return null;
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Indexed timestamptz -> unix seconds, or null when unparseable. */
function unixSeconds(value: string): bigint | null {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return BigInt(Math.trunc(ms / 1000));
}

/**
 * Contrast the indexed record with the lot's on-chain account: the account
 * exists at the derived PDA, belongs to the JuLit programme, and every field
 * matches the index. A missing account is "missing"; any difference is a
 * "mismatch" naming the differing fields.
 */
export function contrastLotRecord(input: {
  indexed: IndexedLot;
  derivedPda: string;
  account: OnChainLot | null;
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
  if (account.data.lotId !== indexed.lot_id) fields.push("lotId");
  if (account.data.producer !== indexed.producer_wallet)
    fields.push("producer");
  if (account.data.buyer !== indexed.buyer_wallet) fields.push("buyer");
  if (account.data.mint !== indexed.mint_address) fields.push("mint");
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
  if (unixSeconds(indexed.claimable_after) !== account.data.claimableAfter)
    fields.push("claimableAfter");
  if (
    bytesToHexLower(account.data.plantCertHash) !==
    indexed.plant_cert_sha256.toLowerCase()
  )
    fields.push("plantCertHash");
  if (ONCHAIN_STATUS[account.data.status] !== indexed.status)
    fields.push("status");

  return fields.length === 0
    ? { state: "verified" }
    : { state: "mismatch", fields };
}

const HEX_64 = /^[0-9a-f]{64}$/;

/**
 * Certificate digest comparison: the PDF's computed SHA-256 against the hex
 * digest recorded for the lot, case-insensitive. Anything that is not an
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
 * The lot's passport route. The public URL the QR encodes is always derived
 * per view — the request origin plus this path — so it can never drift apart
 * from the record (database contract).
 */
export function passportPath(pda: string): string {
  return `/batch/${pda}`;
}
