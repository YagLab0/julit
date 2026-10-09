/**
 * Pure verification seam for POST /api/lots. The route extracts these facts
 * from the RPC transaction and the on-chain account; this module decides
 * whether the lot may be indexed. Index fields always come from the on-chain
 * account — never from the request body.
 */
export type CreateLotInstructionFacts = {
  /** Instruction account[0]: the lot PDA. */
  lot: string;
};

export type TransactionFacts = {
  signature: string;
  slot: number;
  failed: boolean;
  createLotInstruction: CreateLotInstructionFacts | null;
};

export type LotIndexStatus =
  | "listed"
  | "funded"
  | "redeemed"
  | "cancelled"
  | "shipped"
  | "refunded"
  | "claimed";

export type LotAccountFacts = {
  programOwned: boolean;
  producer: string;
  buyer: string;
  status: LotIndexStatus;
};

export type VerifyLotCreationInput = {
  /** Verified wallet of the authenticated producer. */
  producerWallet: string;
  /** Lot PDA derived as ["lot", producer, lot_id] from the decoded args. */
  expectedLotPda: string;
  /** Null when the transaction is missing or unconfirmed. */
  transaction: TransactionFacts | null;
  /** Null when the lot account does not exist. */
  lotAccount: LotAccountFacts | null;
};

export type LotRejection = { status: number; message: string };

export function verifyLotCreation(
  input: VerifyLotCreationInput
): { ok: true } | { ok: false; rejection: LotRejection } {
  const reject = (status: number, message: string) => ({
    ok: false as const,
    rejection: { status, message },
  });

  const { transaction: tx } = input;
  if (!tx) {
    return reject(404, "La transacción no existe o no está confirmada.");
  }
  if (tx.failed) {
    return reject(400, "La transacción falló en la cadena.");
  }

  const ix = tx.createLotInstruction;
  if (!ix) {
    return reject(
      400,
      "La transacción no contiene una instrucción de creación de lote JuLit."
    );
  }
  if (ix.lot !== input.expectedLotPda) {
    return reject(400, "El PDA del lote no coincide con tu wallet.");
  }

  const lot = input.lotAccount;
  if (!lot || !lot.programOwned) {
    return reject(400, "La cuenta del lote no existe en el programa.");
  }
  if (lot.producer !== input.producerWallet) {
    return reject(403, "El lote no fue creado por tu wallet verificada.");
  }
  if (lot.status !== "listed") {
    return reject(400, "El lote no quedó publicado en la cadena.");
  }

  return { ok: true };
}

export type LifecycleInstructionFacts = {
  /** Instruction account[0]: the lot PDA. */
  lot: string;
  /** The transition's required signer (buyer or producer). */
  signer: string;
};

export type TransitionFacts = {
  signature: string;
  slot: number;
  failed: boolean;
  lifecycleInstruction: LifecycleInstructionFacts | null;
};

export type VerifyLotTransitionInput = {
  /** Verified wallet of the authenticated caller. */
  signerWallet: string;
  /** Lot PDA the caller wants to transition. */
  lotPda: string;
  /** Current index row status — null when the lot is not indexed. */
  indexedStatus: LotIndexStatus | null;
  /** Null when the transaction is missing or unconfirmed. */
  transaction: TransitionFacts | null;
  /** Null when the lot account does not exist. */
  lotAccount: LotAccountFacts | null;
};

type TransitionSpec = {
  /** What the on-chain lot status must be after the transition. */
  expectedStatus: LotAccountFacts["status"];
  /** Index statuses that may take this transition. */
  allowedIndex: readonly LotAccountFacts["status"][];
  /** Which on-chain field the caller's wallet must match. */
  onChainParty: "buyer" | "producer";
  missingIx: string;
  wrongLot: string;
  wrongSigner: string;
  wrongOnChainParty: string;
  wrongOnChainStatus: string;
  staleIndex: string;
};

function verifyLifecycleTransition(
  input: VerifyLotTransitionInput,
  spec: TransitionSpec
): { ok: true } | { ok: false; rejection: LotRejection } {
  const reject = (status: number, message: string) => ({
    ok: false as const,
    rejection: { status, message },
  });

  const { transaction: tx } = input;
  if (!tx) {
    return reject(404, "La transacción no existe o no está confirmada.");
  }
  if (tx.failed) {
    return reject(400, "La transacción falló en la cadena.");
  }

  const ix = tx.lifecycleInstruction;
  if (!ix) {
    return reject(400, spec.missingIx);
  }
  if (ix.lot !== input.lotPda) {
    return reject(400, spec.wrongLot);
  }
  if (ix.signer !== input.signerWallet) {
    return reject(403, spec.wrongSigner);
  }

  const lot = input.lotAccount;
  if (!lot || !lot.programOwned) {
    return reject(400, "La cuenta del lote no existe en el programa.");
  }
  const onChainParty = spec.onChainParty === "buyer" ? lot.buyer : lot.producer;
  if (onChainParty !== input.signerWallet) {
    return reject(403, spec.wrongOnChainParty);
  }
  if (lot.status !== spec.expectedStatus) {
    return reject(400, spec.wrongOnChainStatus);
  }

  if (input.indexedStatus === null) {
    return reject(404, "El lote no está indexado.");
  }
  if (!spec.allowedIndex.includes(input.indexedStatus)) {
    return reject(409, spec.staleIndex);
  }

  return { ok: true };
}

export function verifyLotFunding(
  input: VerifyLotTransitionInput
): { ok: true } | { ok: false; rejection: LotRejection } {
  return verifyLifecycleTransition(input, {
    expectedStatus: "funded",
    allowedIndex: ["listed"],
    onChainParty: "buyer",
    missingIx: "La transacción no contiene una instrucción de fondeo JuLit.",
    wrongLot: "La transacción no fondea este lote.",
    wrongSigner: "El fondeo no lo firmó tu wallet verificada.",
    wrongOnChainParty: "Solo la compradora designada puede fondear el lote.",
    wrongOnChainStatus: "El lote no quedó fondeado en la cadena.",
    staleIndex: "El lote ya no está publicado.",
  });
}

export function verifyLotRedemption(
  input: VerifyLotTransitionInput
): { ok: true } | { ok: false; rejection: LotRejection } {
  return verifyLifecycleTransition(input, {
    expectedStatus: "redeemed",
    allowedIndex: ["funded", "shipped"],
    onChainParty: "buyer",
    missingIx:
      "La transacción no contiene una instrucción de confirmación JuLit.",
    wrongLot: "La transacción no confirma este lote.",
    wrongSigner: "La recepción no la firmó tu wallet verificada.",
    wrongOnChainParty:
      "Solo la compradora designada puede confirmar la recepción.",
    wrongOnChainStatus: "El lote no quedó liquidado en la cadena.",
    staleIndex: "El lote ya no está pendiente de recepción.",
  });
}

export function verifyLotCancellation(
  input: VerifyLotTransitionInput
): { ok: true } | { ok: false; rejection: LotRejection } {
  return verifyLifecycleTransition(input, {
    expectedStatus: "cancelled",
    allowedIndex: ["listed"],
    onChainParty: "producer",
    missingIx: "La transacción no contiene una cancelación JuLit.",
    wrongLot: "La transacción no cancela este lote.",
    wrongSigner: "La cancelación no la firmó tu wallet verificada.",
    wrongOnChainParty: "Solo la productora del lote puede cancelarlo.",
    wrongOnChainStatus: "El lote no quedó cancelado en la cadena.",
    staleIndex: "El lote ya no está publicado.",
  });
}

export function verifyLotShipping(
  input: VerifyLotTransitionInput
): { ok: true } | { ok: false; rejection: LotRejection } {
  return verifyLifecycleTransition(input, {
    expectedStatus: "shipped",
    allowedIndex: ["funded"],
    onChainParty: "producer",
    missingIx: "La transacción no contiene un despacho JuLit.",
    wrongLot: "La transacción no despacha este lote.",
    wrongSigner: "El despacho no lo firmó tu wallet verificada.",
    wrongOnChainParty: "Solo la productora del lote puede despacharlo.",
    wrongOnChainStatus: "El lote no quedó despachado en la cadena.",
    staleIndex: "El lote ya no está pendiente de despacho.",
  });
}

export function verifyLotRefund(
  input: VerifyLotTransitionInput
): { ok: true } | { ok: false; rejection: LotRejection } {
  return verifyLifecycleTransition(input, {
    expectedStatus: "refunded",
    allowedIndex: ["funded"],
    onChainParty: "buyer",
    missingIx: "La transacción no contiene un reintegro JuLit.",
    wrongLot: "La transacción no reintegra este lote.",
    wrongSigner: "El reintegro no lo firmó tu wallet verificada.",
    wrongOnChainParty: "Solo la compradora designada puede reintegrar el lote.",
    wrongOnChainStatus: "El lote no quedó reintegrado en la cadena.",
    staleIndex: "El lote ya no es reintegrable.",
  });
}

export function verifyLotClaim(
  input: VerifyLotTransitionInput
): { ok: true } | { ok: false; rejection: LotRejection } {
  return verifyLifecycleTransition(input, {
    expectedStatus: "claimed",
    allowedIndex: ["shipped"],
    onChainParty: "producer",
    missingIx: "La transacción no contiene un cobro JuLit.",
    wrongLot: "La transacción no cobra este lote.",
    wrongSigner: "El cobro no lo firmó tu wallet verificada.",
    wrongOnChainParty: "Solo la productora del lote puede cobrarlo.",
    wrongOnChainStatus: "El lote no quedó cobrado en la cadena.",
    staleIndex: "El lote ya no está pendiente de cobro.",
  });
}
