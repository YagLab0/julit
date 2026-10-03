import { describe, expect, it } from "vitest";
import {
  validateCompletionEligibility,
  validateCompletionRequest,
  type CompletionBatch,
  type CompletionCompany,
} from "./validation";

const VALID_PDA = "PDA111111111111111111111111111111111111111";
const VALID_SIG =
  "5VERv8NMvzbJMEdV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUc";
const BUYER_WALLET = "BuyerWa11et1111111111111111111111111111111";
const OTHER_WALLET = "OtherWa11et2222222222222222222222222222222";

describe("validateCompletionRequest", () => {
  it("accepts valid PDA and transaction signature", () => {
    const result = validateCompletionRequest(VALID_PDA, VALID_SIG);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pda).toBe(VALID_PDA);
      expect(result.signature).toBe(VALID_SIG);
    }
  });

  it("rejects invalid PDA address format", () => {
    const result = validateCompletionRequest("not-a-valid-pda!", VALID_SIG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("PDA");
    }
  });

  it("rejects invalid completion signature format", () => {
    const result = validateCompletionRequest(VALID_PDA, "short-sig");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("Firma");
    }
  });
});

describe("validateCompletionEligibility", () => {
  const validCompany: CompletionCompany = {
    company_type: "buyer",
    wallet_address: BUYER_WALLET,
  };

  const validBatch: CompletionBatch = {
    status: "audited",
    reserved_buyer_wallet: null,
  };

  it("approves open spot batch for verified buyer company", () => {
    const result = validateCompletionEligibility(validCompany, validBatch);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.buyerWallet).toBe(BUYER_WALLET);
    }
  });

  it("approves reserved batch when buyer matches reserved_buyer_wallet", () => {
    const reservedBatch: CompletionBatch = {
      status: "audited",
      reserved_buyer_wallet: BUYER_WALLET,
    };
    const result = validateCompletionEligibility(validCompany, reservedBatch);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.buyerWallet).toBe(BUYER_WALLET);
    }
  });

  it("rejects reserved batch when caller wallet does not match", () => {
    const reservedBatch: CompletionBatch = {
      status: "audited",
      reserved_buyer_wallet: OTHER_WALLET,
    };
    const result = validateCompletionEligibility(validCompany, reservedBatch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toContain("reservado exclusivamente");
    }
  });

  it("rejects when company profile does not exist", () => {
    const result = validateCompletionEligibility(null, validBatch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toContain("Registrá tu empresa");
    }
  });

  it("rejects non-buyer companies (e.g. producer)", () => {
    const producerCompany: CompletionCompany = {
      company_type: "producer",
      wallet_address: BUYER_WALLET,
    };
    const result = validateCompletionEligibility(producerCompany, validBatch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toContain("Solo las empresas compradoras");
    }
  });

  it("rejects buyer without a verified linked wallet", () => {
    const unlinkedCompany: CompletionCompany = {
      company_type: "buyer",
      wallet_address: null,
    };
    const result = validateCompletionEligibility(unlinkedCompany, validBatch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toContain("vincular una wallet");
    }
  });

  it("rejects non-existent batch", () => {
    const result = validateCompletionEligibility(validCompany, null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.error).toContain("Lote no encontrado");
    }
  });

  it("rejects already completed batch", () => {
    const completedBatch: CompletionBatch = {
      status: "completed",
      reserved_buyer_wallet: null,
    };
    const result = validateCompletionEligibility(validCompany, completedBatch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.error).toContain("ya fue completado");
    }
  });

  it("rejects batch not yet audited (e.g. status = created)", () => {
    const createdBatch: CompletionBatch = {
      status: "created",
      reserved_buyer_wallet: null,
    };
    const result = validateCompletionEligibility(validCompany, createdBatch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.error).toContain("debe estar auditado");
    }
  });
});
