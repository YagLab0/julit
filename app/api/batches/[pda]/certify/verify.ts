/**
 * Pure verification seam for POST /api/batches/[pda]/certify. The route
 * extracts these facts from the RPC transaction, the on-chain accounts, the
 * storage bucket, and the index row; this module decides whether the
 * certification may be indexed and with which payload. Findings always come
 * from the on-chain audit account — never from the request body.
 */
export type EuAssessmentIndex = "conformant" | "non_conformant";

export type CertifyInstructionFacts = {
  batch: string;
  audit: string;
  auditor: string;
  /** Lowercase hex SHA-256 declared by the instruction args. */
  auditHash: string;
};

export type TransactionFacts = {
  signature: string;
  slot: number;
  failed: boolean;
  certifyInstruction: CertifyInstructionFacts | null;
};

export type BatchAccountFacts = {
  programOwned: boolean;
  auditor: string;
  status: "created" | "audited" | "completed";
};

export type AuditAccountFacts = {
  programOwned: boolean;
  auditHash: string;
  esgApproved: boolean;
  euAssessment: EuAssessmentIndex;
};

export type VerifyCertificationInput = {
  /** Verified wallet of the authenticated auditor. */
  auditorWallet: string;
  /** Batch PDA from the route, also the expected instruction account. */
  batchPda: string;
  /** Audit PDA derived as ["audit", batch]. */
  expectedAuditPda: string;
  /** Current status of the batches index row. */
  indexStatus: string;
  /** Digests of certificates stored under the batch prefix (may be many). */
  storedDigests: string[];
  /** Null when the transaction is missing or unconfirmed. */
  transaction: TransactionFacts | null;
  /** Null when the batch account does not exist. */
  batchAccount: BatchAccountFacts | null;
  /** Null when the audit account does not exist. */
  auditAccount: AuditAccountFacts | null;
};

export type VerifiedCertification = {
  auditSha256: string;
  esgApproved: boolean;
  euAssessment: EuAssessmentIndex;
  auditTxSignature: string;
  observedSlot: number;
};

export type CertifyRejection = { status: number; message: string };

export function verifyCertification(input: VerifyCertificationInput):
  | { ok: true; certification: VerifiedCertification }
  | { ok: false; rejection: CertifyRejection } {
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

  const ix = tx.certifyInstruction;
  if (!ix) {
    return reject(
      400,
      "La transacción no contiene una instrucción de certificación JuLit."
    );
  }
  if (ix.batch !== input.batchPda) {
    return reject(400, "La transacción certifica otro lote.");
  }
  if (ix.auditor !== input.auditorWallet) {
    return reject(403, "La transacción no fue firmada por tu wallet.");
  }
  if (ix.audit !== input.expectedAuditPda) {
    return reject(400, "El PDA de auditoría no coincide con el esperado.");
  }

  if (input.indexStatus !== "created") {
    return reject(409, "Este lote ya fue certificado.");
  }

  const batch = input.batchAccount;
  if (!batch || !batch.programOwned) {
    return reject(400, "La cuenta del lote no existe en el programa.");
  }
  if (batch.auditor !== input.auditorWallet) {
    return reject(403, "El lote no está designado a tu wallet verificada.");
  }
  if (batch.status !== "audited") {
    return reject(400, "El lote no quedó auditado en la cadena.");
  }

  const audit = input.auditAccount;
  if (!audit || !audit.programOwned) {
    return reject(400, "La cuenta de auditoría no existe en el programa.");
  }
  if (audit.auditHash !== ix.auditHash) {
    return reject(
      400,
      "El hash en la cuenta de auditoría no coincide con la instrucción."
    );
  }

  if (input.storedDigests.length === 0) {
    return reject(400, "Subí el certificado PDF antes de certificar.");
  }
  if (!input.storedDigests.includes(audit.auditHash)) {
    return reject(
      400,
      "El hash en cadena no coincide con el certificado subido."
    );
  }

  return {
    ok: true,
    certification: {
      auditSha256: audit.auditHash,
      esgApproved: audit.esgApproved,
      euAssessment: audit.euAssessment,
      auditTxSignature: tx.signature,
      observedSlot: tx.slot,
    },
  };
}
