import { JulitInstruction } from "../../../generated/julit";
import { transitionLot } from "../transition";
import { verifyLotCancellation } from "../verify";

/**
 * Moves the index to `cancelled` after the producer's cancel_lot
 * transaction confirms on Devnet. Only `listed` rows may transition —
 * funded lots can never be cancelled; escrowed funds exit via redeem,
 * refund after ship_by, or a producer claim after the confirm window.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.CancelLot,
    signerAccountIndex: 1,
    companyType: "producer",
    allowedIndex: ["listed"],
    txColumn: "cancel_tx_signature",
    nextStatus: "cancelled",
    verify: verifyLotCancellation,
  });
}
