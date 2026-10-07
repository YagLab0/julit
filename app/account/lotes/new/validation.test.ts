import { describe, expect, it } from "vitest";
import {
  validateLotForm,
  type LotFormContext,
  type LotFormValues,
} from "./validation";

const PRODUCER = "ProducerWa11et111111111111111111111111111";
const BUYER = "C1ienteTesaEnergy3333333333333333333333333";
const BUYER_B = "UncontractedBuyer88888888888888888888888";
const CERT = "ab".repeat(32);

const NOW = Math.floor(Date.parse("2026-10-06T12:00:00Z") / 1000);
const FUTURE = "2026-11-15T10:00";
const PAST = "2026-10-01T10:00";

const CTX: LotFormContext = {
  producerWallet: PRODUCER,
  originId: "pena_blanca",
  producerSpecs: {
    purityPct: "99.55",
    waterM3PerTonne: "50.80",
    carbonKgCo2ePerTonne: "8200.00",
  },
  contractedBuyers: [BUYER],
  nowUnixSeconds: NOW,
};

const VALID: LotFormValues = {
  lotId: "LIT-2026-PBL-05",
  volumeTonnes: "420",
  priceUsdc: "12000.123456",
  buyerWallet: BUYER,
  claimableAfter: FUTURE,
  plantCertSha256: CERT,
};

function check(
  overrides: Partial<LotFormValues> = {},
  ctx: Partial<LotFormContext> = {}
) {
  return validateLotForm({ ...VALID, ...overrides }, { ...CTX, ...ctx });
}

describe("validateLotForm", () => {
  it("accepts the happy path and returns the scaled payload", () => {
    const { errors, payload } = check();
    expect(errors).toEqual({});
    expect(payload).toEqual({
      lotId: "LIT-2026-PBL-05",
      originId: "pena_blanca",
      volumeTonnes: "420",
      purityBasisPoints: "9955",
      waterM3PerTonneScaled: "5080",
      carbonKgCo2ePerTonneScaled: "820000",
      priceUsdcScaled: "12000123456",
      producerWallet: PRODUCER,
      buyerWallet: BUYER,
      claimableAfterUnix: Math.floor(Date.parse(FUTURE) / 1000).toString(),
      plantCertSha256: CERT,
    });
  });

  describe("lotId", () => {
    it("rejects empty", () => {
      expect(check({ lotId: "" }).errors.lotId).toBeTruthy();
    });
    it("rejects identifiers over 32 UTF-8 bytes", () => {
      expect(check({ lotId: "a".repeat(33) }).errors.lotId).toBeTruthy();
    });
    it("accepts exactly 32 bytes", () => {
      expect(check({ lotId: "a".repeat(32) }).errors.lotId).toBeUndefined();
    });
    it("counts multi-byte UTF-8 toward the 32-byte cap", () => {
      expect(check({ lotId: "日".repeat(11) }).errors.lotId).toBeTruthy();
      expect(check({ lotId: "日".repeat(10) }).errors.lotId).toBeUndefined();
    });
  });

  describe("volumeTonnes", () => {
    it("rejects non-integers and zero", () => {
      for (const volumeTonnes of ["", "1.5", "-3", "0", "abc"]) {
        expect(check({ volumeTonnes }).errors.volumeTonnes).toBeTruthy();
      }
    });
    it("rejects values beyond u64", () => {
      expect(
        check({ volumeTonnes: "18446744073709551616" }).errors.volumeTonnes
      ).toBeTruthy();
    });
  });

  describe("producerSpecs", () => {
    it("scales the provisioned spec values into the payload", () => {
      const { payload } = check(
        {},
        {
          producerSpecs: {
            purityPct: "99.50",
            waterM3PerTonne: "50",
            carbonKgCo2ePerTonne: "8200",
          },
        }
      );
      expect(payload?.purityBasisPoints).toBe("9950");
      expect(payload?.waterM3PerTonneScaled).toBe("5000");
      expect(payload?.carbonKgCo2ePerTonneScaled).toBe("820000");
    });
    it("rejects spec values outside the battery-grade band", () => {
      for (const purityPct of ["99.49", "100.01"]) {
        expect(
          check({}, { producerSpecs: { ...CTX.producerSpecs, purityPct } })
            .errors.producerSpecs
        ).toBeTruthy();
      }
    });
    it("rejects malformed spec values", () => {
      for (const waterM3PerTonne of ["", "abc", "50.801"]) {
        expect(
          check(
            {},
            { producerSpecs: { ...CTX.producerSpecs, waterM3PerTonne } }
          ).errors.producerSpecs
        ).toBeTruthy();
      }
    });
  });

  describe("priceUsdc", () => {
    it("rejects zero, garbage and >6 decimals", () => {
      for (const priceUsdc of ["0", "0.0", "abc", "1.0000001"]) {
        expect(check({ priceUsdc }).errors.priceUsdc).toBeTruthy();
      }
    });
    it("keeps the exact u64 scaled value", () => {
      expect(
        check({ priceUsdc: "12000.123456" }).payload?.priceUsdcScaled
      ).toBe("12000123456");
    });
  });

  describe("buyerWallet", () => {
    it("is mandatory", () => {
      expect(check({ buyerWallet: "" }).errors.buyerWallet).toBeTruthy();
    });
    it("rejects a buyer without an accepted contract", () => {
      expect(check({ buyerWallet: BUYER_B }).errors.buyerWallet).toBeTruthy();
    });
    it("rejects the producer as its own buyer", () => {
      expect(check({ buyerWallet: PRODUCER }).errors.buyerWallet).toBeTruthy();
    });
    it("rejects malformed wallets", () => {
      expect(
        check({ buyerWallet: "0OIl-not-base58" }).errors.buyerWallet
      ).toBeTruthy();
    });
  });

  describe("claimableAfter", () => {
    it("is mandatory and must parse", () => {
      expect(check({ claimableAfter: "" }).errors.claimableAfter).toBeTruthy();
      expect(
        check({ claimableAfter: "not-a-date" }).errors.claimableAfter
      ).toBeTruthy();
    });
    it("rejects past and present deadlines", () => {
      expect(
        check({ claimableAfter: PAST }).errors.claimableAfter
      ).toBeTruthy();
      expect(
        check({ claimableAfter: "2026-10-06T00:00" }).errors.claimableAfter
      ).toBeTruthy();
    });
  });

  describe("plantCertSha256", () => {
    it("is mandatory", () => {
      expect(
        check({ plantCertSha256: "" }).errors.plantCertSha256
      ).toBeTruthy();
    });
    it("rejects malformed digests", () => {
      expect(
        check({ plantCertSha256: "not-hex" }).errors.plantCertSha256
      ).toBeTruthy();
      expect(
        check({ plantCertSha256: CERT.slice(0, 63) }).errors.plantCertSha256
      ).toBeTruthy();
    });
    it("normalises uppercase hex", () => {
      expect(check({ plantCertSha256: CERT.toUpperCase() }).errors).toEqual({});
      expect(
        check({ plantCertSha256: CERT.toUpperCase() }).payload?.plantCertSha256
      ).toBe(CERT);
    });
  });
});
