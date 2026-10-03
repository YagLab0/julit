import { describe, expect, it } from "vitest";
import { verifyCertification, type VerifyCertificationInput } from "./verify";

const AUDITOR = "AuditorWallet111111111111111111111111111111";
const OTHER = "OtherWallet1111111111111111111111111111111";
const BATCH_PDA = "BatchPda1111111111111111111111111111111111";
const AUDIT_PDA = "AuditPda1111111111111111111111111111111111";
const DIGEST = "a".repeat(64);
const SIGNATURE = "5".repeat(88);

function baseInput(): VerifyCertificationInput {
  return {
    auditorWallet: AUDITOR,
    batchPda: BATCH_PDA,
    expectedAuditPda: AUDIT_PDA,
    indexStatus: "created",
    storedDigests: [DIGEST],
    transaction: {
      signature: SIGNATURE,
      slot: 42,
      failed: false,
      certifyInstruction: {
        batch: BATCH_PDA,
        audit: AUDIT_PDA,
        auditor: AUDITOR,
        auditHash: DIGEST,
      },
    },
    batchAccount: {
      programOwned: true,
      auditor: AUDITOR,
      status: "audited",
    },
    auditAccount: {
      programOwned: true,
      auditHash: DIGEST,
      esgApproved: true,
      euAssessment: "conformant",
    },
  };
}

function rejection(input: VerifyCertificationInput) {
  const result = verifyCertification(input);
  if (result.ok) throw new Error("expected rejection");
  return result.rejection;
}

describe("verifyCertification", () => {
  it("accepts a fully consistent certification", () => {
    const result = verifyCertification(baseInput());
    expect(result).toEqual({
      ok: true,
      certification: {
        auditSha256: DIGEST,
        esgApproved: true,
        euAssessment: "conformant",
        auditTxSignature: SIGNATURE,
        observedSlot: 42,
      },
    });
  });

  it("indexes negative findings from the on-chain account", () => {
    const input = baseInput();
    input.auditAccount = {
      programOwned: true,
      auditHash: DIGEST,
      esgApproved: false,
      euAssessment: "non_conformant",
    };
    const result = verifyCertification(input);
    expect(result.ok && result.certification.esgApproved).toBe(false);
    expect(result.ok && result.certification.euAssessment).toBe(
      "non_conformant"
    );
  });

  it("rejects a missing or unconfirmed transaction", () => {
    const input = baseInput();
    input.transaction = null;
    expect(rejection(input).status).toBe(404);
  });

  it("rejects a failed transaction", () => {
    const input = baseInput();
    input.transaction!.failed = true;
    expect(rejection(input).status).toBe(400);
  });

  it("rejects a transaction without a certify instruction", () => {
    const input = baseInput();
    input.transaction!.certifyInstruction = null;
    expect(rejection(input).status).toBe(400);
  });

  it("rejects an instruction for a different batch PDA", () => {
    const input = baseInput();
    input.transaction!.certifyInstruction!.batch = OTHER;
    expect(rejection(input).status).toBe(400);
  });

  it("rejects an instruction signed by another wallet", () => {
    const input = baseInput();
    input.transaction!.certifyInstruction!.auditor = OTHER;
    expect(rejection(input).status).toBe(403);
  });

  it("rejects an unexpected audit PDA", () => {
    const input = baseInput();
    input.transaction!.certifyInstruction!.audit = OTHER;
    expect(rejection(input).status).toBe(400);
  });

  it("rejects an already-certified index row", () => {
    const input = baseInput();
    input.indexStatus = "audited";
    expect(rejection(input).status).toBe(409);
  });

  it("rejects a missing batch account", () => {
    const input = baseInput();
    input.batchAccount = null;
    expect(rejection(input).status).toBe(400);
  });

  it("rejects a batch account not owned by the program", () => {
    const input = baseInput();
    input.batchAccount!.programOwned = false;
    expect(rejection(input).status).toBe(400);
  });

  it("rejects a batch designated to another auditor", () => {
    const input = baseInput();
    input.batchAccount!.auditor = OTHER;
    expect(rejection(input).status).toBe(403);
  });

  it("rejects a batch that did not end audited on-chain", () => {
    const input = baseInput();
    input.batchAccount!.status = "created";
    expect(rejection(input).status).toBe(400);
  });

  it("rejects a missing audit account", () => {
    const input = baseInput();
    input.auditAccount = null;
    expect(rejection(input).status).toBe(400);
  });

  it("rejects an audit account not owned by the program", () => {
    const input = baseInput();
    input.auditAccount!.programOwned = false;
    expect(rejection(input).status).toBe(400);
  });

  it("rejects an account hash diverging from the instruction", () => {
    const input = baseInput();
    input.auditAccount!.auditHash = "b".repeat(64);
    expect(rejection(input).status).toBe(400);
  });

  it("rejects certification without an uploaded certificate", () => {
    const input = baseInput();
    input.storedDigests = [];
    expect(rejection(input).status).toBe(400);
  });

  it("rejects an on-chain hash that does not match the stored certificate", () => {
    const input = baseInput();
    input.storedDigests = ["c".repeat(64)];
    expect(rejection(input).status).toBe(400);
  });
});
