import { JulitInstruction } from "../../../generated/julit";
import { transitionLot } from "../transition";
import { verifyLotRedemption } from "../verify";

/**
 * Moves the index to `redeemed` after the buyer's redeem_lot transaction
 * confirms on Devnet. Only `funded` rows may transition — buyer redemption
 * is the only settlement path for a funded lot.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.RedeemLot,
    signerAccountIndex: 2,
    companyType: "buyer",
    allowedIndex: ["funded"],
    txColumn: "redeem_tx_signature",
    nextStatus: "redeemed",
    verify: verifyLotRedemption,
  });
}
