import { describe, expect, it } from "vitest";
import {
  buyerLotVerdict,
  calculateLotFee,
  calculateLotSettlement,
  computeTreasuryLedger,
  verifyAdminWallet,
} from "./lot-actions";

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

describe("calculateLotFee & calculateLotSettlement", () => {
  it("calculates exact fees for standard basis points", () => {
    // 100 bps = 1.0%
    expect(calculateLotFee(12_000, 100)).toBe(120);
    // 50 bps = 0.5% on 400,000 USDC lot
    expect(calculateLotFee(400_000, 50)).toBe(2000);
    // 75 bps = 0.75% on 10,000 USDC lot
    expect(calculateLotFee(10_000, 75)).toBe(75);
  });

  it("handles zero price and zero fee_bps gracefully", () => {
    expect(calculateLotFee(0, 100)).toBe(0);
    expect(calculateLotFee(10_000, 0)).toBe(0);
    expect(calculateLotFee(-500, 100)).toBe(0);
  });

  it("performs integer division truncation on minimal units matching on-chain program", () => {
    // 1.000001 USDC = 1_000_001 units
    // (1_000_001 * 50) / 10_000 = 50_000_050 / 10_000 = 5000 units = 0.005 USDC
    expect(calculateLotFee(1.000001, 50)).toBe(0.005);
  });

  it("splits price accurately into fee and producer payout", () => {
    const s = calculateLotSettlement(150_000, 100);
    expect(s.feeUsdc).toBe(1500);
    expect(s.producerPayoutUsdc).toBe(148_500);
    expect(s.feeUsdc + s.producerPayoutUsdc).toBe(150_000);
  });
});

describe("verifyAdminWallet", () => {
  const ADMIN_PUBKEY = "AdminWa11et11111111111111111111111111111111";
  const TREASURY_PUBKEY = "Treasury11111111111111111111111111111111111";

  it("flags unlinked when company has no wallet", () => {
    const v = verifyAdminWallet(null);
    expect(v.isLinked).toBe(false);
    expect(v.isVerified).toBe(false);
    expect(v.matchesOnChainAdmin).toBe(false);
    expect(v.matchesOnChainTreasury).toBe(false);
  });

  it("flags linked but unverified when wallet_verified_at is null", () => {
    const v = verifyAdminWallet({
      walletAddress: ADMIN_PUBKEY,
      walletVerifiedAt: null,
    });
    expect(v.isLinked).toBe(true);
    expect(v.isVerified).toBe(false);
    expect(v.matchesOnChainAdmin).toBe(false);
    expect(v.matchesOnChainTreasury).toBe(false);
  });

  it("matches on-chain admin when verified and matching", () => {
    const v = verifyAdminWallet(
      {
        walletAddress: ADMIN_PUBKEY,
        walletVerifiedAt: "2026-10-08T00:00:00Z",
      },
      {
        admin: ADMIN_PUBKEY,
        treasury: TREASURY_PUBKEY,
      }
    );
    expect(v.isLinked).toBe(true);
    expect(v.isVerified).toBe(true);
    expect(v.matchesOnChainAdmin).toBe(true);
    expect(v.matchesOnChainTreasury).toBe(false);
  });

  it("matches on-chain treasury when verified and matching treasury", () => {
    const v = verifyAdminWallet(
      {
        walletAddress: TREASURY_PUBKEY,
        walletVerifiedAt: "2026-10-08T00:00:00Z",
      },
      {
        admin: ADMIN_PUBKEY,
        treasury: TREASURY_PUBKEY,
      }
    );
    expect(v.isLinked).toBe(true);
    expect(v.isVerified).toBe(true);
    expect(v.matchesOnChainAdmin).toBe(false);
    expect(v.matchesOnChainTreasury).toBe(true);
  });
});

describe("computeTreasuryLedger", () => {
  it("handles empty lots list", () => {
    const ledger = computeTreasuryLedger([], 100);
    expect(ledger.settledLotsCount).toBe(0);
    expect(ledger.totalSettledVolumeTonnes).toBe(0);
    expect(ledger.totalSettledValueUsdc).toBe(0);
    expect(ledger.totalFeesCollectedUsdc).toBe(0);
    expect(ledger.items).toEqual([]);
  });

  it("computes accurate fee ledger for redeemed and claimed lots only", () => {
    const ledger = computeTreasuryLedger(
      [
        {
          lot_id: "LOT-001",
          pda_address: "Pda1111111111111111111111111111111111111111",
          status: "listed",
          volume_tonnes: 100,
          price_usdc: 150_000,
          producer_wallet: "Prod1",
          buyer_wallet: "Buyer1",
          indexed_at: "2026-10-01T00:00:00Z",
        },
        {
          lot_id: "LOT-002",
          pda_address: "Pda2222222222222222222222222222222222222222",
          status: "funded",
          volume_tonnes: 50,
          price_usdc: 80_000,
          producer_wallet: "Prod1",
          buyer_wallet: "Buyer1",
          indexed_at: "2026-10-02T00:00:00Z",
        },
        {
          lot_id: "LOT-003",
          pda_address: "Pda3333333333333333333333333333333333333333",
          status: "redeemed",
          volume_tonnes: 200,
          price_usdc: 320_000,
          producer_wallet: "Prod1",
          buyer_wallet: "Buyer1",
          redeem_tx_signature: "SigRedeem333",
          indexed_at: "2026-10-03T00:00:00Z",
        },
        {
          lot_id: "LOT-004",
          pda_address: "Pda4444444444444444444444444444444444444444",
          status: "claimed",
          volume_tonnes: 80,
          price_usdc: 120_000,
          producer_wallet: "Prod2",
          buyer_wallet: "Buyer2",
          claim_tx_signature: "SigClaim444",
          indexed_at: "2026-10-04T00:00:00Z",
        },
        {
          lot_id: "LOT-005",
          pda_address: "Pda5555555555555555555555555555555555555555",
          status: "cancelled",
          volume_tonnes: 40,
          price_usdc: 60_000,
          producer_wallet: "Prod2",
          buyer_wallet: "Buyer2",
          indexed_at: "2026-10-05T00:00:00Z",
        },
      ],
      100 // 1%
    );

    expect(ledger.settledLotsCount).toBe(2);
    expect(ledger.totalSettledVolumeTonnes).toBe(280);
    expect(ledger.totalSettledValueUsdc).toBe(440_000);
    // 1% of 440,000 = 4,400
    expect(ledger.totalFeesCollectedUsdc).toBe(4400);

    expect(ledger.items).toHaveLength(2);
    expect(ledger.items[0]).toEqual({
      lotId: "LOT-003",
      pdaAddress: "Pda3333333333333333333333333333333333333333",
      status: "redeemed",
      volumeTonnes: 200,
      priceUsdc: 320_000,
      feeBps: 100,
      feeUsdc: 3200,
      producerPayoutUsdc: 316_800,
      producerWallet: "Prod1",
      buyerWallet: "Buyer1",
      txSignature: "SigRedeem333",
      settledAt: "2026-10-03T00:00:00Z",
    });
    expect(ledger.items[1]).toEqual({
      lotId: "LOT-004",
      pdaAddress: "Pda4444444444444444444444444444444444444444",
      status: "claimed",
      volumeTonnes: 80,
      priceUsdc: 120_000,
      feeBps: 100,
      feeUsdc: 1200,
      producerPayoutUsdc: 118_800,
      producerWallet: "Prod2",
      buyerWallet: "Buyer2",
      txSignature: "SigClaim444",
      settledAt: "2026-10-04T00:00:00Z",
    });
  });
});

