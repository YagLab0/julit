// Validation for the create_lot form. Mirrors the lots table contract
// (docs/database.md): values are parsed as decimal strings into scaled
// integers — never through Number — so nothing is rounded or truncated.

const U64_MAX = (1n << 64n) - 1n;
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HEX_64_RE = /^[0-9a-f]{64}$/;
const INTEGER_RE = /^[0-9]+$/;
const DECIMAL_RE = /^([0-9]+)(?:\.([0-9]+))?$/;

export type LotFormValues = {
  lotId: string;
  volumeTonnes: string;
  purityPct: string;
  waterM3PerTonne: string;
  carbonKgCo2ePerTonne: string;
  priceUsdc: string;
  /** Designated buyer wallet — mandatory, must hold an accepted contract. */
  buyerWallet: string;
  /** `datetime-local` value; producer may claim escrowed funds after it. */
  claimableAfter: string;
  /** SHA-256 hex of the plant certificate uploaded to the API. */
  plantCertSha256: string;
};

export type FieldKey = keyof LotFormValues;
export type FieldErrors = Partial<Record<FieldKey, string>>;

export type LotFormContext = {
  /** The producer's verified company wallet. */
  producerWallet: string;
  /** The producer's bound origin (from the company profile, not user input). */
  originId: string;
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
  plantCertSha256: string;
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
  ctx: LotFormContext
): { errors: FieldErrors; payload: CreateLotPayload | null } {
  const errors: FieldErrors = {};

  const lotId = values.lotId.trim();
  if (!lotId) {
    errors.lotId = "Ingresá un identificador de lote.";
  } else if (new TextEncoder().encode(lotId).length > 32) {
    errors.lotId = "El identificador no puede superar los 32 bytes.";
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

  const buyerWallet = values.buyerWallet.trim();
  if (!buyerWallet) {
    errors.buyerWallet = "Elegí el comprador designado del lote.";
  } else if (
    !BASE58_RE.test(buyerWallet) ||
    !ctx.contractedBuyers.includes(buyerWallet)
  ) {
    errors.buyerWallet =
      "El comprador debe tener un contrato aceptado con tu empresa.";
  } else if (buyerWallet === ctx.producerWallet) {
    errors.buyerWallet = "El comprador no puede ser tu propia productora.";
  }

  const claimableMs = Date.parse(values.claimableAfter);
  if (!values.claimableAfter || Number.isNaN(claimableMs)) {
    errors.claimableAfter =
      "Ingresá la fecha límite a partir de la cual podés reclamar el escrow.";
  } else if (Math.floor(claimableMs / 1000) <= ctx.nowUnixSeconds) {
    errors.claimableAfter = "La fecha de reclamo debe ser futura.";
  }

  const certHash = values.plantCertSha256.trim().toLowerCase();
  if (!HEX_64_RE.test(certHash)) {
    errors.plantCertSha256 =
      "Subí el certificado de planta (PDF) para obtener su SHA-256.";
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
          plantCertSha256: certHash,
        }
      : null;

  return { errors, payload };
}
