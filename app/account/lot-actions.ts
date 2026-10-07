import type { LotStatus } from "../explorer/data/lots";

/**
 * Action-availability seam for the buyer's designated lots: given a lot's
 * index state and the buyer's context, which on-chain transitions the UI
 * may offer. All policy lives here — the card renders the verdict.
 */

export type BuyerLotAction = "fund" | "redeem" | "dispute";

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
        actions: ["redeem", "dispute"],
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
