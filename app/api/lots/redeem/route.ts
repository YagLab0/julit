import { JulitInstruction } from "../../../generated/julit";
import { transitionLot } from "../transition";
import { verifyLotRedemption } from "../verify";

/**
 * Moves the index to `redeemed` after the buyer's redeem_lot transaction
 * confirms on Devnet. `funded` and `shipped` rows may transition — the
 * buyer may confirm receipt whether or not the producer already posted
 * shipping evidence.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.RedeemLot,
    signerAccountIndex: 2,
    companyType: "buyer",
    allowedIndex: ["funded", "shipped"],
    txColumn: "redeem_tx_signature",
    nextStatus: "redeemed",
    verify: verifyLotRedemption,
  });
}
