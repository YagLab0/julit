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

export function verifyLotFunding(
  input: VerifyLotFundingInput
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
    return reject(
      400,
      "La transacción no contiene una instrucción de fondeo JuLit."
    );
  }
  if (ix.lot !== input.lotPda) {
    return reject(400, "La transacción no fondea este lote.");
  }
  if (ix.buyer !== input.buyerWallet) {
    return reject(403, "El fondeo no lo firmó tu wallet verificada.");
  }

  const lot = input.lotAccount;
  if (!lot || !lot.programOwned) {
    return reject(400, "La cuenta del lote no existe en el programa.");
  }
  if (lot.buyer !== input.buyerWallet) {
    return reject(403, "Solo la compradora designada puede fondear el lote.");
  }
  if (lot.status !== "funded") {
    return reject(400, "El lote no quedó fondeado en la cadena.");
  }

  if (input.indexedStatus === null) {
    return reject(404, "El lote no está indexado.");
  }
  if (input.indexedStatus !== "listed") {
    return reject(409, "El lote ya no está publicado.");
  }

  return { ok: true };
}
