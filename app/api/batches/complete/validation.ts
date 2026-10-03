export const BASE58_TX_REGEX = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
export const BASE58_ADDR_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type CompletionCompany = {
  company_type: string;
  wallet_address: string | null;
};

export type CompletionBatch = {
  status: string;
  reserved_buyer_wallet: string | null;
  buyer_wallet?: string | null;
};

export function validateCompletionRequest(
  pdaAddress: unknown,
  completionTxSignature: unknown
):
  | { ok: true; pda: string; signature: string }
  | { ok: false; status: number; error: string } {
  if (typeof pdaAddress !== "string" || !BASE58_ADDR_REGEX.test(pdaAddress)) {
    return { ok: false, status: 400, error: "Dirección PDA de lote inválida." };
  }
  if (
    typeof completionTxSignature !== "string" ||
    !BASE58_TX_REGEX.test(completionTxSignature)
  ) {
    return {
      ok: false,
      status: 400,
      error: "Firma de transacción de compra inválida.",
    };
  }
  return { ok: true, pda: pdaAddress, signature: completionTxSignature };
}

export function validateCompletionEligibility(
  company: CompletionCompany | null,
  batch: CompletionBatch | null
): { ok: true } | { ok: false; status: number; error: string } {
  if (!company) {
    return {
      ok: false,
      status: 403,
      error: "Registrá tu empresa compradora primero.",
    };
  }
  if (company.company_type !== "buyer") {
    return {
      ok: false,
      status: 403,
      error: "Solo las empresas compradoras pueden registrar una compra.",
    };
  }
  if (!company.wallet_address) {
    return {
      ok: false,
      status: 403,
      error: "Debes vincular una wallet verificada antes de comprar.",
    };
  }
  if (!batch) {
    return { ok: false, status: 404, error: "Lote no encontrado." };
  }
  if (batch.status === "completed") {
    return {
      ok: false,
      status: 409,
      error: "Este lote ya fue completado previamente.",
    };
  }
  if (batch.status !== "audited") {
    return {
      ok: false,
      status: 409,
      error: "El lote debe estar auditado para poder ser adquirido.",
    };
  }
  if (
    batch.reserved_buyer_wallet != null &&
    batch.reserved_buyer_wallet !== company.wallet_address
  ) {
    return {
      ok: false,
      status: 403,
      error: "Este lote está reservado exclusivamente para otra empresa.",
    };
  }
  return { ok: true };
}
