import { describe, expect, it } from "vitest";
import {
  buyerLotVerdict,
  calculateLotFee,
  calculateLotSettlement,
  computeTreasuryLedger,
  producerLotVerdict,
  verifyAdminWallet,
} from "./lot-actions";

const BUYER = "C1ienteTesaEnergy3333333333333333333333333";
const OTHER = "OtraWa11et222222222222222222222222222222";

function check(overrides: Partial<Parameters<typeof buyerLotVerdict>[0]> = {}) {
  return buyerLotVerdict({
    status: "listed",
    connectedWallet: BUYER,
    buyerWallet: BUYER,
    dUsdcBalance: 20_000,
    priceUsdc: 12_000,
    shipBySecs: 2_000_000_000,
    nowSecs: 1_000_000_000,
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
    it("offers redeem only while the ship-by deadline is open", () => {
      expect(check({ status: "funded" }).actions).toEqual(["redeem"]);
    });

    it("adds refund once the ship-by deadline passes", () => {
      expect(
        check({
          status: "funded",
          shipBySecs: 999_999_999,
          nowSecs: 1_000_000_000,
        }).actions
      ).toEqual(["redeem", "refund"]);
    });
  });

  describe("shipped", () => {
    it("offers redeem — refund is no longer available", () => {
      expect(
        check({ status: "shipped", shipBySecs: 0, nowSecs: 1_000_000_000 })
          .actions
      ).toEqual(["redeem"]);
    });
  });

  describe("terminal states", () => {
    it("offers nothing on redeemed, cancelled, refunded or claimed lots", () => {
      for (const status of [
        "redeemed",
        "cancelled",
        "refunded",
        "claimed",
      ] as const) {
        const v = check({ status });
        expect(v.actions).toEqual([]);
        expect(v.fundBlocker).toBeNull();
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

    it("does not flag walletBlocked on terminal statuses", () => {
      expect(
        check({ status: "redeemed", connectedWallet: null }).walletBlocked
      ).toBe(false);
    });
  });
});

describe("producerLotVerdict", () => {
  const PRODUCER = "ProdWa11et111111111111111111111111111111111";

  function checkProducer(
    overrides: Partial<Parameters<typeof producerLotVerdict>[0]> = {}
  ) {
    return producerLotVerdict({
      status: "funded",
      connectedWallet: PRODUCER,
      producerWallet: PRODUCER,
      shipBySecs: 2_000_000_000,
      shippedAtSecs: null,
      confirmWindowSecs: 604_800,
      nowSecs: 1_000_000_000,
      ...overrides,
    });
  }

  it("offers ship while the funded lot is inside the ship-by window", () => {
    expect(checkProducer().actions).toEqual(["ship"]);
  });

  it("offers nothing once ship-by passes on a funded lot", () => {
    expect(checkProducer({ shipBySecs: 999_999_999 }).actions).toEqual([]);
  });

  it("offers claim once the confirmation window elapses", () => {
    expect(
      checkProducer({
        status: "shipped",
        shippedAtSecs: 999_999_999,
        nowSecs: 999_999_999 + 604_800,
      }).actions
    ).toEqual(["claim"]);
  });

  it("offers nothing while the confirmation window is still open", () => {
    expect(
      checkProducer({
        status: "shipped",
        shippedAtSecs: 999_999_999,
        nowSecs: 999_999_999 + 604_799,
      }).actions
    ).toEqual([]);
  });

  it("flags walletBlocked for a foreign wallet when actions exist", () => {
    const v = checkProducer({ connectedWallet: OTHER });
    expect(v.actions).toEqual([]);
    expect(v.walletBlocked).toBe(true);
  });

  it("does not flag walletBlocked when no action is available", () => {
    expect(
      checkProducer({ status: "listed", connectedWallet: null }).walletBlocked
    ).toBe(false);
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

  it("computes accurate fee ledger for redeemed lots only", () => {
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

    expect(ledger.settledLotsCount).toBe(1);
    expect(ledger.totalSettledVolumeTonnes).toBe(200);
    expect(ledger.totalSettledValueUsdc).toBe(320_000);
    // 1% of 320,000 = 3,200
    expect(ledger.totalFeesCollectedUsdc).toBe(3200);

    expect(ledger.items).toHaveLength(1);
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
  });

  it("counts claimed lots as settled and uses each lot's frozen fee", () => {
    const ledger = computeTreasuryLedger(
      [
        {
          lot_id: "LOT-010",
          pda_address: "PdaAA111111111111111111111111111111111111111",
          status: "redeemed",
          volume_tonnes: 100,
          price_usdc: 100_000,
          fee_bps: 150,
          producer_wallet: "Prod1",
          buyer_wallet: "Buyer1",
          redeem_tx_signature: "SigRedeem010",
          indexed_at: "2026-10-10T00:00:00Z",
        },
        {
          lot_id: "LOT-011",
          pda_address: "PdaBB222222222222222222222222222222222222222",
          status: "claimed",
          volume_tonnes: 50,
          price_usdc: 200_000,
          fee_bps: 50,
          producer_wallet: "Prod1",
          buyer_wallet: "Buyer1",
          claim_tx_signature: "SigClaim011",
          indexed_at: "2026-10-11T00:00:00Z",
        },
        {
          lot_id: "LOT-012",
          pda_address: "PdaCC333333333333333333333333333333333333333",
          status: "refunded",
          volume_tonnes: 10,
          price_usdc: 10_000,
          producer_wallet: "Prod1",
          buyer_wallet: "Buyer1",
          indexed_at: "2026-10-12T00:00:00Z",
        },
      ],
      100 // config fee — only a fallback for rows without fee_bps
    );

    expect(ledger.settledLotsCount).toBe(2);
    // 1.5% of 100,000 + 0.5% of 200,000
    expect(ledger.totalFeesCollectedUsdc).toBe(1500 + 1000);

    const claimed = ledger.items.find((i) => i.lotId === "LOT-011");
    expect(claimed?.status).toBe("claimed");
    expect(claimed?.feeBps).toBe(50);
    expect(claimed?.txSignature).toBe("SigClaim011");
    expect(claimed?.producerPayoutUsdc).toBe(199_000);
  });

  it("falls back to the config fee for rows without fee_bps", () => {
    const ledger = computeTreasuryLedger(
      [
        {
          lot_id: "LOT-020",
          pda_address: "PdaDD444444444444444444444444444444444444444",
          status: "redeemed",
          volume_tonnes: 10,
          price_usdc: 50_000,
          fee_bps: null,
          producer_wallet: "Prod1",
          buyer_wallet: "Buyer1",
          redeem_tx_signature: "SigRedeem020",
          indexed_at: "2026-10-20T00:00:00Z",
        },
      ],
      200
    );

    expect(ledger.items[0]?.feeBps).toBe(200);
    // 2% of 50,000
    expect(ledger.totalFeesCollectedUsdc).toBe(1000);
  });
});
