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
