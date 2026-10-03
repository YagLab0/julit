import { describe, expect, it } from "vitest";
import {
  validateBatchForm,
  type BatchFormContext,
  type BatchFormValues,
} from "./validation";

const PRODUCER = "ProducerWa11et111111111111111111111111111";
const AUDITOR = "AuditAnd1noLabCert111111111111111111111111";
const AUDITOR_B = "OtherAud1torWa11et99999999999999999999999";
const BUYER = "C1ienteTesaEnergy3333333333333333333333333";
const BUYER_B = "UncontractedBuyer88888888888888888888888";

const CTX: BatchFormContext = {
  producerWallet: PRODUCER,
  originId: "pena_blanca",
  contractedAuditors: [AUDITOR],
  contractedBuyers: [BUYER],
};

const VALID: BatchFormValues = {
  batchId: "LIT-2026-PBL-05",
  volumeTonnes: "420",
  purityPct: "99.55",
  waterM3PerTonne: "50.80",
  carbonKgCo2ePerTonne: "8200.00",
  priceUsdc: "12000.123456",
  auditorWallet: AUDITOR,
  reservedBuyerWallet: BUYER,
};

function check(overrides: Partial<BatchFormValues> = {}) {
  return validateBatchForm({ ...VALID, ...overrides }, CTX);
}

describe("validateBatchForm", () => {
  it("accepts the happy path and returns the scaled payload", () => {
    const { errors, payload } = check();
    expect(errors).toEqual({});
    expect(payload).toEqual({
      batchId: "LIT-2026-PBL-05",
      originId: "pena_blanca",
      volumeTonnes: "420",
      purityBasisPoints: "9955",
      waterM3PerTonneScaled: "5080",
      carbonKgCo2ePerTonneScaled: "820000",
      priceUsdcScaled: "12000123456",
      producerWallet: PRODUCER,
      auditorWallet: AUDITOR,
      reservedBuyerWallet: BUYER,
    });
  });

  describe("batchId", () => {
    it("rejects empty", () => {
      expect(check({ batchId: "" }).errors.batchId).toBeTruthy();
    });
    it("rejects identifiers over 32 UTF-8 bytes", () => {
      expect(check({ batchId: "a".repeat(33) }).errors.batchId).toBeTruthy();
    });
    it("accepts exactly 32 bytes", () => {
      expect(check({ batchId: "a".repeat(32) }).errors.batchId).toBeUndefined();
    });
    it("counts multibyte characters by bytes, not chars", () => {
      // 16 × 'é' = 32 bytes — accepted; 17 × = 34 bytes — rejected
      expect(check({ batchId: "é".repeat(16) }).errors.batchId).toBeUndefined();
      expect(check({ batchId: "é".repeat(17) }).errors.batchId).toBeTruthy();
    });
  });

  describe("volumeTonnes", () => {
    it("rejects fractional tonnes", () => {
      expect(check({ volumeTonnes: "1.5" }).errors.volumeTonnes).toBeTruthy();
    });
    it("rejects zero and negatives", () => {
      expect(check({ volumeTonnes: "0" }).errors.volumeTonnes).toBeTruthy();
      expect(check({ volumeTonnes: "-3" }).errors.volumeTonnes).toBeTruthy();
    });
    it("rejects non-numeric", () => {
      expect(check({ volumeTonnes: "abc" }).errors.volumeTonnes).toBeTruthy();
    });
  });

  describe("purityPct — battery grade 99.50–100.00", () => {
    it("rejects 99.49 (below grade)", () => {
      expect(check({ purityPct: "99.49" }).errors.purityPct).toBeTruthy();
    });
    it("rejects 99.505 (excess precision, never truncated)", () => {
      expect(check({ purityPct: "99.505" }).errors.purityPct).toBeTruthy();
    });
    it("rejects above 100", () => {
      expect(check({ purityPct: "100.01" }).errors.purityPct).toBeTruthy();
    });
    it("accepts the bounds", () => {
      expect(check({ purityPct: "99.50" }).errors.purityPct).toBeUndefined();
      expect(check({ purityPct: "100" }).errors.purityPct).toBeUndefined();
      expect(check({ purityPct: "100.00" }).payload?.purityBasisPoints).toBe(
        "10000"
      );
    });
  });

  describe("footprints — ≤2 decimals", () => {
    it("rejects a third decimal place", () => {
      expect(
        check({ waterM3PerTonne: "50.801" }).errors.waterM3PerTonne
      ).toBeTruthy();
      expect(
        check({ carbonKgCo2ePerTonne: "1.005" }).errors.carbonKgCo2ePerTonne
      ).toBeTruthy();
    });
    it("rejects negatives", () => {
      expect(
        check({ waterM3PerTonne: "-1" }).errors.waterM3PerTonne
      ).toBeTruthy();
    });
    it("accepts zero and integers", () => {
      expect(
        check({ waterM3PerTonne: "0" }).errors.waterM3PerTonne
      ).toBeUndefined();
      expect(
        check({ carbonKgCo2ePerTonne: "8200" }).payload
          ?.carbonKgCo2ePerTonneScaled
      ).toBe("820000");
    });
  });

  describe("priceUsdc — total batch quote, ≤6 decimals", () => {
    it("rejects a seventh decimal", () => {
      expect(check({ priceUsdc: "1.0000001" }).errors.priceUsdc).toBeTruthy();
    });
    it("rejects zero", () => {
      expect(check({ priceUsdc: "0" }).errors.priceUsdc).toBeTruthy();
    });
    it("scales six decimals exactly", () => {
      expect(check({ priceUsdc: "0.000001" }).payload?.priceUsdcScaled).toBe(
        "1"
      );
    });
  });

  describe("auditorWallet — contracted auditors only", () => {
    it("requires a selection", () => {
      expect(check({ auditorWallet: "" }).errors.auditorWallet).toBeTruthy();
    });
    it("rejects an auditor without an accepted contract", () => {
      expect(
        check({ auditorWallet: AUDITOR_B }).errors.auditorWallet
      ).toBeTruthy();
    });
  });

  describe("reservedBuyerWallet — optional, contracted buyers only", () => {
    it("empty produces a spot batch (null)", () => {
      const { errors, payload } = check({ reservedBuyerWallet: "" });
      expect(errors.reservedBuyerWallet).toBeUndefined();
      expect(payload?.reservedBuyerWallet).toBeNull();
    });
    it("rejects a buyer without an accepted contract", () => {
      expect(
        check({ reservedBuyerWallet: BUYER_B }).errors.reservedBuyerWallet
      ).toBeTruthy();
    });
    it("rejects the producer or the auditor as buyer", () => {
      expect(
        check({ reservedBuyerWallet: PRODUCER }).errors.reservedBuyerWallet
      ).toBeTruthy();
      expect(
        check({ reservedBuyerWallet: AUDITOR }).errors.reservedBuyerWallet
      ).toBeTruthy();
    });
  });
});
