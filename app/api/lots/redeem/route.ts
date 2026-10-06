import { JulitInstruction } from "../../../generated/julit";
import { transitionLot } from "../transition";
import { verifyLotRedemption } from "../verify";

/**
 * Moves the index to `redeemed` after the buyer's redeem_lot transaction
 * confirms on Devnet. Accepted from `funded` and `disputed` — the buyer's
 * release is the on-chain shape of an off-chain resolution in the
 * producer's favor.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.RedeemLot,
    allowedIndex: ["funded", "disputed"],
    txColumn: "redeem_tx_signature",
    nextStatus: "redeemed",
    verify: verifyLotRedemption,
  });
}
