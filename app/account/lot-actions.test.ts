import { describe, expect, it } from "vitest";
import { buyerLotVerdict } from "./lot-actions";

const BUYER = "C1ienteTesaEnergy3333333333333333333333333";
const OTHER = "OtraWa11et222222222222222222222222222222";

const NOW = Math.floor(Date.parse("2026-10-06T12:00:00Z") / 1000);
const FUTURE = NOW + 30 * 24 * 3600;
const PAST = NOW - 3600;

function check(overrides: Partial<Parameters<typeof buyerLotVerdict>[0]> = {}) {
  return buyerLotVerdict({
    status: "listed",
    connectedWallet: BUYER,
    buyerWallet: BUYER,
    dUsdcBalance: 20_000,
    priceUsdc: 12_000,
    claimableAfterUnix: FUTURE,
    nowUnixSeconds: NOW,
    ...overrides,
  });
}

describe("buyerLotVerdict", () => {
  describe("listed", () => {
    it("offers fund when the wallet and balance check out", () => {
      const v = check();
      expect(v.actions).toEqual(["fund"]);
      expect(v.fundBlocker).toBeNull();
    });

    it("offers fund but blocks it when the balance cannot cover the price", () => {
      const v = check({ dUsdcBalance: 11_999.999999 });
      expect(v.actions).toEqual(["fund"]);
      expect(v.fundBlocker).toBe("insufficient_balance");
    });

    it("accepts a balance exactly equal to the price", () => {
      expect(check({ dUsdcBalance: 12_000 }).fundBlocker).toBeNull();
    });

    it("blocks fund while the balance is still loading", () => {
      const v = check({ dUsdcBalance: null });
      expect(v.fundBlocker).toBe("checking_balance");
    });

    it("treats a missing ATA (zero balance) as insufficient", () => {
      expect(check({ dUsdcBalance: 0 }).fundBlocker).toBe(
        "insufficient_balance"
      );
    });
  });

  describe("funded", () => {
    it("offers redeem only — there is no dispute path", () => {
      expect(check({ status: "funded" }).actions).toEqual(["redeem"]);
    });

    it("flags the Timeout Claim as live once claimable_after passes", () => {
      expect(
        check({ status: "funded", claimableAfterUnix: PAST }).timeoutClaimLive
      ).toBe(true);
      expect(
        check({ status: "funded", claimableAfterUnix: FUTURE }).timeoutClaimLive
      ).toBe(false);
      expect(
        check({
          status: "funded",
          claimableAfterUnix: NOW,
          nowUnixSeconds: NOW,
        }).timeoutClaimLive
      ).toBe(true);
    });
  });

  describe("disputed", () => {
    it("offers redeem only — the buyer's release resolves the dispute", () => {
      expect(check({ status: "disputed" }).actions).toEqual(["redeem"]);
    });

    it("keeps the Timeout Claim frozen even past claimable_after", () => {
      expect(
        check({ status: "disputed", claimableAfterUnix: PAST }).timeoutClaimLive
      ).toBe(false);
    });
  });

  describe("terminal states", () => {
    it("offers nothing on redeemed, claimed or cancelled lots", () => {
      for (const status of ["redeemed", "claimed", "cancelled"] as const) {
        const v = check({ status });
        expect(v.actions).toEqual([]);
        expect(v.fundBlocker).toBeNull();
        expect(v.timeoutClaimLive).toBe(false);
      }
    });
  });

  describe("wallet gating", () => {
    it("offers nothing but flags walletBlocked when no wallet is connected", () => {
      const v = check({ connectedWallet: null });
      expect(v.actions).toEqual([]);
      expect(v.walletBlocked).toBe(true);
    });

    it("offers nothing when the connected wallet is not the designated buyer", () => {
      const v = check({ connectedWallet: OTHER });
      expect(v.actions).toEqual([]);
      expect(v.walletBlocked).toBe(true);
    });

    it("keeps the claim clock visible without the designated wallet", () => {
      const v = check({
        status: "funded",
        claimableAfterUnix: PAST,
        connectedWallet: OTHER,
      });
      expect(v.actions).toEqual([]);
      expect(v.walletBlocked).toBe(true);
      expect(v.timeoutClaimLive).toBe(true);
    });

    it("does not flag walletBlocked on terminal statuses", () => {
      expect(
        check({ status: "redeemed", connectedWallet: null }).walletBlocked
      ).toBe(false);
    });
  });
});
