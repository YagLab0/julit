import type { LotStatus } from "../explorer/data/lots";

/**
 * Action-availability seam for the buyer's designated lots: given a lot's
 * index state and the buyer's context, which on-chain transitions the UI
 * may offer. All policy lives here — the card renders the verdict.
 */

export type BuyerLotAction = "fund" | "redeem";

/** Why "Comprar con escrow" is offered but cannot run. */
export type FundBlocker = "checking_balance" | "insufficient_balance";

export type BuyerLotVerdict = {
  /** Buyer actions to render, in display order. */
  actions: BuyerLotAction[];
  /** Set when "fund" is offered but blocked; drives the disabled hint. */
  fundBlocker: FundBlocker | null;
  /** funded && past claimable_after: the producer's Timeout Claim is live. */
  timeoutClaimLive: boolean;
  /**
   * The lot's status admits buyer actions but the connected wallet is not
   * the designated buyer (or none is connected) — the UI shows a hint.
   */
  walletBlocked: boolean;
};

export function buyerLotVerdict(input: {
  status: LotStatus;
  /** Connected wallet; must equal the lot's designated buyer_wallet. */
  connectedWallet: string | null;
  buyerWallet: string;
  /** Buyer dUSDC balance in display units; null while still loading. */
  dUsdcBalance: number | null;
  /** Lot price in display units. */
  priceUsdc: number;
  claimableAfterUnix: number;
  nowUnixSeconds: number;
}): BuyerLotVerdict {
  // The claim clock is lot state, not session state: it stays visible even
  // without the designated wallet connected.
  const timeoutClaimLive =
    input.status === "funded" &&
    input.nowUnixSeconds >= input.claimableAfterUnix;

  const actionable =
    input.status === "listed" ||
    input.status === "funded" ||
    input.status === "disputed";

  const none: BuyerLotVerdict = {
    actions: [],
    fundBlocker: null,
    timeoutClaimLive,
    walletBlocked: actionable && input.connectedWallet !== input.buyerWallet,
  };

  if (none.walletBlocked) {
    return none;
  }

  switch (input.status) {
    case "listed": {
      const fundBlocker: FundBlocker | null =
        input.dUsdcBalance === null
          ? "checking_balance"
          : input.dUsdcBalance < input.priceUsdc
            ? "insufficient_balance"
            : null;
      return {
        actions: ["fund"],
        fundBlocker,
        timeoutClaimLive,
        walletBlocked: false,
      };
    }
    case "funded":
      return {
        actions: ["redeem"],
        fundBlocker: null,
        timeoutClaimLive,
        walletBlocked: false,
      };
    case "disputed":
      // Dispute freezes the Timeout Claim; Redemption is the only exit.
      return {
        actions: ["redeem"],
        fundBlocker: null,
        timeoutClaimLive,
        walletBlocked: false,
      };
    default:
      return none;
  }
}

/**
 * Exact fee calculation matching Anchor program's release_escrow:
 * fee = floor(price_usdc_units * fee_bps / 10_000)
 * where 1 USDC = 1,000,000 minimal units.
 */
export function calculateLotFee(priceUsdc: number, feeBps: number): number {
  if (priceUsdc <= 0 || feeBps <= 0) return 0;
  const priceUnits = BigInt(Math.round(priceUsdc * 1_000_000));
  const feeUnits = (priceUnits * BigInt(feeBps)) / 10_000n;
  return Number(feeUnits) / 1_000_000;
}

export function calculateLotSettlement(
  priceUsdc: number,
  feeBps: number
): {
  feeUsdc: number;
  producerPayoutUsdc: number;
  feeBps: number;
  priceUsdc: number;
} {
  const feeUsdc = calculateLotFee(priceUsdc, feeBps);
  const producerPayoutUsdc =
    Math.round((priceUsdc - feeUsdc) * 1_000_000) / 1_000_000;
  return {
    feeUsdc,
    producerPayoutUsdc,
    feeBps,
    priceUsdc,
  };
}

export type AdminWalletVerification = {
  isLinked: boolean;
  isVerified: boolean;
  walletAddress: string | null;
  walletVerifiedAt: string | null;
  matchesOnChainAdmin: boolean;
  matchesOnChainTreasury: boolean;
};

export function verifyAdminWallet(
  company: {
    walletAddress?: string | null;
    walletVerifiedAt?: string | null;
  } | null,
  onChainConfig?: {
    admin?: string | null;
    treasury?: string | null;
  } | null
): AdminWalletVerification {
  const walletAddress = company?.walletAddress ?? null;
  const walletVerifiedAt = company?.walletVerifiedAt ?? null;
  const isLinked = Boolean(walletAddress);
  const isVerified = Boolean(walletAddress && walletVerifiedAt);
  const matchesOnChainAdmin = Boolean(
    isVerified &&
      onChainConfig?.admin &&
      walletAddress === onChainConfig.admin
  );
  const matchesOnChainTreasury = Boolean(
    isVerified &&
      onChainConfig?.treasury &&
      walletAddress === onChainConfig.treasury
  );

  return {
    isLinked,
    isVerified,
    walletAddress,
    walletVerifiedAt,
    matchesOnChainAdmin,
    matchesOnChainTreasury,
  };
}

export type SettledLotRaw = {
  lot_id: string;
  pda_address: string;
  status: string;
  volume_tonnes: number | string | null;
  price_usdc: number | string | null;
  producer_wallet: string;
  buyer_wallet: string;
  redeem_tx_signature?: string | null;
  claim_tx_signature?: string | null;
  indexed_at: string;
};

export type TreasuryLedgerItem = {
  lotId: string;
  pdaAddress: string;
  status: "redeemed" | "claimed";
  volumeTonnes: number;
  priceUsdc: number;
  feeBps: number;
  feeUsdc: number;
  producerPayoutUsdc: number;
  producerWallet: string;
  buyerWallet: string;
  txSignature: string | null;
  settledAt: string;
};

export type TreasuryLedger = {
  settledLotsCount: number;
  totalSettledVolumeTonnes: number;
  totalSettledValueUsdc: number;
  totalFeesCollectedUsdc: number;
  items: TreasuryLedgerItem[];
};

export function computeTreasuryLedger(
  lots: SettledLotRaw[],
  feeBps: number
): TreasuryLedger {
  const settledLots = (lots ?? []).filter(
    (l) => l.status === "redeemed" || l.status === "claimed"
  );

  let totalSettledVolumeTonnes = 0;
  let totalSettledValueUsdc = 0;
  let totalFeesCollectedUsdc = 0;

  const items: TreasuryLedgerItem[] = [];

  for (const lot of settledLots) {
    const volume = Number(lot.volume_tonnes || 0);
    const price = Number(lot.price_usdc || 0);
    const settlement = calculateLotSettlement(price, feeBps);

    totalSettledVolumeTonnes += volume;
    totalSettledValueUsdc += price;
    totalFeesCollectedUsdc += settlement.feeUsdc;

    items.push({
      lotId: lot.lot_id,
      pdaAddress: lot.pda_address,
      status: lot.status as "redeemed" | "claimed",
      volumeTonnes: volume,
      priceUsdc: price,
      feeBps,
      feeUsdc: settlement.feeUsdc,
      producerPayoutUsdc: settlement.producerPayoutUsdc,
      producerWallet: lot.producer_wallet,
      buyerWallet: lot.buyer_wallet,
      txSignature:
        lot.status === "redeemed"
          ? (lot.redeem_tx_signature ?? null)
          : (lot.claim_tx_signature ?? null),
      settledAt: lot.indexed_at,
    });
  }

  return {
    settledLotsCount: items.length,
    totalSettledVolumeTonnes: Math.round(totalSettledVolumeTonnes * 100) / 100,
    totalSettledValueUsdc:
      Math.round(totalSettledValueUsdc * 1_000_000) / 1_000_000,
    totalFeesCollectedUsdc:
      Math.round(totalFeesCollectedUsdc * 1_000_000) / 1_000_000,
    items,
  };
}
