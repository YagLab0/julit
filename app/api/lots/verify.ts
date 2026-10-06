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

export type LotAccountFacts = {
  programOwned: boolean;
  producer: string;
  buyer: string;
  status:
    "listed" | "funded" | "disputed" | "redeemed" | "claimed" | "cancelled";
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

export type FundLotInstructionFacts = {
  /** Instruction account[0]: the lot PDA. */
  lot: string;
  /** Instruction account[2]: the buyer signer. */
  buyer: string;
};

export type FundTransactionFacts = {
  signature: string;
  slot: number;
  failed: boolean;
  fundLotInstruction: FundLotInstructionFacts | null;
};

export type VerifyLotFundingInput = {
  /** Verified wallet of the authenticated buyer. */
  buyerWallet: string;
  /** Lot PDA the caller wants to mark as funded. */
  lotPda: string;
  /** Current index row status — null when the lot is not indexed. */
  indexedStatus:
    | "listed"
    | "funded"
    | "disputed"
    | "redeemed"
    | "claimed"
    | "cancelled"
    | null;
  /** Null when the transaction is missing or unconfirmed. */
  transaction: FundTransactionFacts | null;
  /** Null when the lot account does not exist. */
  lotAccount: LotAccountFacts | null;
};

type TransitionSpec = {
  /** What the on-chain lot status must be after the transition. */
  expectedStatus: LotAccountFacts["status"];
  /** Index statuses that may take this transition. */
  allowedIndex: readonly LotAccountFacts["status"][];
  missingIx: string;
  wrongLot: string;
  wrongSigner: string;
  wrongOnChainBuyer: string;
  wrongOnChainStatus: string;
  staleIndex: string;
};

function verifyLifecycleTransition(
  input: VerifyLotFundingInput,
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

  const ix = tx.fundLotInstruction;
  if (!ix) {
    return reject(400, spec.missingIx);
  }
  if (ix.lot !== input.lotPda) {
    return reject(400, spec.wrongLot);
  }
  if (ix.buyer !== input.buyerWallet) {
    return reject(403, spec.wrongSigner);
  }

  const lot = input.lotAccount;
  if (!lot || !lot.programOwned) {
    return reject(400, "La cuenta del lote no existe en el programa.");
  }
  if (lot.buyer !== input.buyerWallet) {
    return reject(403, spec.wrongOnChainBuyer);
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
  input: VerifyLotFundingInput
): { ok: true } | { ok: false; rejection: LotRejection } {
  return verifyLifecycleTransition(input, {
    expectedStatus: "funded",
    allowedIndex: ["listed"],
    missingIx: "La transacción no contiene una instrucción de fondeo JuLit.",
    wrongLot: "La transacción no fondea este lote.",
    wrongSigner: "El fondeo no lo firmó tu wallet verificada.",
    wrongOnChainBuyer: "Solo la compradora designada puede fondear el lote.",
    wrongOnChainStatus: "El lote no quedó fondeado en la cadena.",
    staleIndex: "El lote ya no está publicado.",
  });
}

export function verifyLotRedemption(
  input: VerifyLotFundingInput
): { ok: true } | { ok: false; rejection: LotRejection } {
  return verifyLifecycleTransition(input, {
    expectedStatus: "redeemed",
    allowedIndex: ["funded", "disputed"],
    missingIx:
      "La transacción no contiene una instrucción de confirmación JuLit.",
    wrongLot: "La transacción no confirma este lote.",
    wrongSigner: "La recepción no la firmó tu wallet verificada.",
    wrongOnChainBuyer:
      "Solo la compradora designada puede confirmar la recepción.",
    wrongOnChainStatus: "El lote no quedó liquidado en la cadena.",
    staleIndex: "El lote ya no está pendiente de recepción.",
  });
}
