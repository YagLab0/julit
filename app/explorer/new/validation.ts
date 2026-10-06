// Validation for the create_batch form. Mirrors the batches table contract
// (docs/database.md): values are parsed as decimal strings into scaled
// integers — never through Number — so nothing is rounded or truncated.

const U64_MAX = (1n << 64n) - 1n;
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const INTEGER_RE = /^[0-9]+$/;
const DECIMAL_RE = /^([0-9]+)(?:\.([0-9]+))?$/;

export type BatchFormValues = {
  batchId: string;
  volumeTonnes: string;
  purityPct: string;
  waterM3PerTonne: string;
  carbonKgCo2ePerTonne: string;
  priceUsdc: string;
  auditorWallet: string;
  reservedBuyerWallet: string;
};

export type FieldKey = keyof BatchFormValues;
export type FieldErrors = Partial<Record<FieldKey, string>>;

export type BatchFormContext = {
  /** The producer's verified company wallet. */
  producerWallet: string;
  /** The producer's bound origin (from the company profile, not user input). */
  originId: string;
  /** Wallets of auditors holding an accepted contract with the producer. */
  contractedAuditors: string[];
  /** Wallets of buyers holding an accepted contract with the producer. */
  contractedBuyers: string[];
};

/** Exact decimal-string payload for a future create_batch instruction. */
export type CreateBatchPayload = {
  batchId: string;
  originId: string;
  /** Whole tonnes (u64 decimal string). */
  volumeTonnes: string;
  /** purity_pct × 100, basis points (u64 decimal string). */
  purityBasisPoints: string;
  /** water × 100 (u64 decimal string). */
  waterM3PerTonneScaled: string;
  /** carbon × 100 (u64 decimal string). */
  carbonKgCo2ePerTonneScaled: string;
  /** Total batch quote × 1_000_000 (u64 decimal string). */
  priceUsdcScaled: string;
  producerWallet: string;
  auditorWallet: string;
  reservedBuyerWallet: string | null;
};

/** Parses a non-negative decimal string into a scaled integer, or null. */
function scaledInt(raw: string, decimals: number): bigint | null {
  const m = DECIMAL_RE.exec(raw.trim());
  if (!m) return null;
  const frac = m[2] ?? "";
  if (frac.length > decimals) return null;
  return BigInt(m[1] + frac.padEnd(decimals, "0"));
}

export function validateBatchForm(
  values: BatchFormValues,
  ctx: BatchFormContext
): { errors: FieldErrors; payload: CreateBatchPayload | null } {
  const errors: FieldErrors = {};

  const batchId = values.batchId.trim();
  if (!batchId) {
    errors.batchId = "Ingresá un identificador de lote.";
  } else if (new TextEncoder().encode(batchId).length > 32) {
    errors.batchId = "El identificador no puede superar los 32 bytes.";
  }

  const volume = INTEGER_RE.test(values.volumeTonnes.trim())
    ? BigInt(values.volumeTonnes.trim())
    : null;
  if (volume === null) {
    errors.volumeTonnes = "Ingresá un volumen entero en toneladas.";
  } else if (volume < 1n) {
    errors.volumeTonnes = "El lote debe tener al menos 1 tonelada.";
  } else if (volume > U64_MAX) {
    errors.volumeTonnes = "El volumen supera el máximo representable.";
  }

  const purity = scaledInt(values.purityPct, 2);
  if (purity === null || purity < 9950n || purity > 10000n) {
    errors.purityPct =
      "Solo grado batería: entre 99,50 y 100,00 con hasta 2 decimales.";
  }

  const water = scaledInt(values.waterM3PerTonne, 2);
  if (water === null) {
    errors.waterM3PerTonne = "Ingresá un valor con hasta 2 decimales.";
  } else if (water > U64_MAX) {
    errors.waterM3PerTonne = "El valor supera el máximo representable.";
  }

  const carbon = scaledInt(values.carbonKgCo2ePerTonne, 2);
  if (carbon === null) {
    errors.carbonKgCo2ePerTonne = "Ingresá un valor con hasta 2 decimales.";
  } else if (carbon > U64_MAX) {
    errors.carbonKgCo2ePerTonne = "El valor supera el máximo representable.";
  }

  const price = scaledInt(values.priceUsdc, 6);
  if (price === null) {
    errors.priceUsdc = "Ingresá el precio total en USDC con hasta 6 decimales.";
  } else if (price === 0n) {
    errors.priceUsdc = "El precio debe ser mayor a cero.";
  } else if (price > U64_MAX) {
    errors.priceUsdc = "El precio supera el máximo representable.";
  }

  const auditorWallet = values.auditorWallet.trim();
  if (!auditorWallet) {
    errors.auditorWallet = "Elegí un auditor contratado.";
  } else if (
    !BASE58_RE.test(auditorWallet) ||
    !ctx.contractedAuditors.includes(auditorWallet)
  ) {
    errors.auditorWallet =
      "El auditor debe tener un contrato aceptado con tu empresa.";
  }

  const reservedBuyerWallet = values.reservedBuyerWallet.trim() || null;
  if (
    reservedBuyerWallet &&
    (!BASE58_RE.test(reservedBuyerWallet) ||
      !ctx.contractedBuyers.includes(reservedBuyerWallet))
  ) {
    errors.reservedBuyerWallet =
      "El cliente debe tener un contrato aceptado con tu empresa.";
  } else if (
    reservedBuyerWallet &&
    (reservedBuyerWallet === auditorWallet ||
      reservedBuyerWallet === ctx.producerWallet)
  ) {
    errors.reservedBuyerWallet =
      "El comprador reservado no puede ser la productora ni el auditor.";
  }

  const payload =
    Object.keys(errors).length === 0
      ? {
          batchId,
          originId: ctx.originId,
          volumeTonnes: values.volumeTonnes.trim(),
          purityBasisPoints: purity!.toString(),
          waterM3PerTonneScaled: water!.toString(),
          carbonKgCo2ePerTonneScaled: carbon!.toString(),
          priceUsdcScaled: price!.toString(),
          producerWallet: ctx.producerWallet,
          auditorWallet,
          reservedBuyerWallet,
        }
      : null;

  return { errors, payload };
}
