import { JulitInstruction } from "../../../generated/julit";
import { transitionLot } from "../transition";
import { verifyLotRefund } from "../verify";

/**
 * Moves the index to `refunded` after the buyer's refund_lot transaction
 * confirms on Devnet. Only `funded` rows may transition — once the
 * producer posts shipping evidence the buyer's exit is redeem, and the
 * on-chain program enforces the ship-by deadline.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.RefundLot,
    signerAccountIndex: 1,
    companyType: "buyer",
    allowedIndex: ["funded"],
    txColumn: "refund_tx_signature",
    nextStatus: "refunded",
    verify: verifyLotRefund,
  });
}
