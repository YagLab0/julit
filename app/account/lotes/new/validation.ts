// Validation for the create_lot form. Mirrors the lots table contract
// (docs/database.md): values are parsed as decimal strings into scaled
// integers — never through Number — so nothing is rounded or truncated.

import type { AccountDict } from "../../i18n";

const U64_MAX = (1n << 64n) - 1n;
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HEX_64_RE = /^[0-9a-f]{64}$/;
const INTEGER_RE = /^[0-9]+$/;
const DECIMAL_RE = /^([0-9]+)(?:\.([0-9]+))?$/;

export type LotFormValues = {
  lotId: string;
  volumeTonnes: string;
  priceUsdc: string;
  /** Designated buyer wallet — mandatory, must hold an accepted contract. */
  buyerWallet: string;
  /** `datetime-local` value; producer may claim escrowed funds after it. */
  claimableAfter: string;
  /** SHA-256 hex of the lot spec sheet uploaded to the API. */
  specSheetSha256: string;
};

/** The producer's Production Specification, provisioned on its company
 *  record (ADR-0020) — decimal strings, never user input. */
export type ProducerSpecs = {
  purityPct: string;
  waterM3PerTonne: string;
  carbonKgCo2ePerTonne: string;
};

export type FieldKey = keyof LotFormValues;
export type FieldErrors = Partial<Record<FieldKey | "producerSpecs", string>>;

/** Localized error copy, injected so the form follows the account locale. */
export type ValidationMessages = AccountDict["newLot"]["validation"];

export type LotFormContext = {
  /** The producer's verified company wallet. */
  producerWallet: string;
  /** The producer's bound origin (from the company profile, not user input). */
  originId: string;
  /** The producer's provisioned Production Specification. */
  producerSpecs: ProducerSpecs;
  /** Wallets of buyers holding an accepted contract with the producer. */
  contractedBuyers: string[];
  /** Unix seconds now, injected so tests stay deterministic. */
  nowUnixSeconds: number;
};

/** Exact decimal-string payload for the create_lot instruction. */
export type CreateLotPayload = {
  lotId: string;
  originId: string;
  /** Whole tonnes (u64 decimal string). */
  volumeTonnes: string;
  /** purity_pct × 100, basis points (u64 decimal string). */
  purityBasisPoints: string;
  /** water × 100 (u64 decimal string). */
  waterM3PerTonneScaled: string;
  /** carbon × 100 (u64 decimal string). */
  carbonKgCo2ePerTonneScaled: string;
  /** Total lot quote × 1_000_000 (u64 decimal string). */
  priceUsdcScaled: string;
  producerWallet: string;
  buyerWallet: string;
  /** Unix seconds (i64 decimal string). */
  claimableAfterUnix: string;
  specSheetSha256: string;
};

/** Parses a non-negative decimal string into a scaled integer, or null. */
function scaledInt(raw: string, decimals: number): bigint | null {
  const m = DECIMAL_RE.exec(raw.trim());
  if (!m) return null;
  const frac = m[2] ?? "";
  if (frac.length > decimals) return null;
  return BigInt(m[1] + frac.padEnd(decimals, "0"));
}

export function validateLotForm(
  values: LotFormValues,
  ctx: LotFormContext,
  messages: ValidationMessages
): { errors: FieldErrors; payload: CreateLotPayload | null } {
  const errors: FieldErrors = {};

  const lotId = values.lotId.trim();
  if (!lotId) {
    errors.lotId = messages.lotIdRequired;
  } else if (new TextEncoder().encode(lotId).length > 32) {
    errors.lotId = messages.lotIdTooLong;
  }

  const volume = INTEGER_RE.test(values.volumeTonnes.trim())
    ? BigInt(values.volumeTonnes.trim())
    : null;
  if (volume === null) {
    errors.volumeTonnes = messages.volumeInvalid;
  } else if (volume < 1n) {
    errors.volumeTonnes = messages.volumeMin;
  } else if (volume > U64_MAX) {
    errors.volumeTonnes = messages.volumeMax;
  }

  // The Production Specification comes from the producer's company record,
  // not the form. The page gates on its presence and the schema enforces
  // scale/range, so an invalid value here is a data error, not user input.
  const purity = scaledInt(ctx.producerSpecs.purityPct, 2);
  const water = scaledInt(ctx.producerSpecs.waterM3PerTonne, 2);
  const carbon = scaledInt(ctx.producerSpecs.carbonKgCo2ePerTonne, 2);
  if (
    purity === null ||
    purity < 9950n ||
    purity > 10000n ||
    water === null ||
    water > U64_MAX ||
    carbon === null ||
    carbon > U64_MAX
  ) {
    errors.producerSpecs = messages.specsInvalid;
  }

  const price = scaledInt(values.priceUsdc, 6);
  if (price === null) {
    errors.priceUsdc = messages.priceInvalid;
  } else if (price === 0n) {
    errors.priceUsdc = messages.priceMin;
  } else if (price > U64_MAX) {
    errors.priceUsdc = messages.priceMax;
  }

  const buyerWallet = values.buyerWallet.trim();
  if (!buyerWallet) {
    errors.buyerWallet = messages.buyerRequired;
  } else if (
    !BASE58_RE.test(buyerWallet) ||
    !ctx.contractedBuyers.includes(buyerWallet)
  ) {
    errors.buyerWallet = messages.buyerNotContracted;
  } else if (buyerWallet === ctx.producerWallet) {
    errors.buyerWallet = messages.buyerIsProducer;
  }

  const claimableMs = Date.parse(values.claimableAfter);
  if (!values.claimableAfter || Number.isNaN(claimableMs)) {
    errors.claimableAfter = messages.claimableRequired;
  } else if (Math.floor(claimableMs / 1000) <= ctx.nowUnixSeconds) {
    errors.claimableAfter = messages.claimableFuture;
  }

  const specHash = values.specSheetSha256.trim().toLowerCase();
  if (!HEX_64_RE.test(specHash)) {
    errors.specSheetSha256 = messages.specRequired;
  }

  const payload =
    Object.keys(errors).length === 0
      ? {
          lotId,
          originId: ctx.originId,
          volumeTonnes: values.volumeTonnes.trim(),
          purityBasisPoints: purity!.toString(),
          waterM3PerTonneScaled: water!.toString(),
          carbonKgCo2ePerTonneScaled: carbon!.toString(),
          priceUsdcScaled: price!.toString(),
          producerWallet: ctx.producerWallet,
          buyerWallet,
          claimableAfterUnix: Math.floor(claimableMs / 1000).toString(),
          specSheetSha256: specHash,
        }
      : null;

  return { errors, payload };
}
