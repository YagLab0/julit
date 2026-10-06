import { JulitInstruction } from "../../../generated/julit";
import { transitionLot } from "../transition";
import { verifyLotDispute } from "../verify";

/**
 * Moves the index to `disputed` after the buyer's raise_dispute
 * transaction confirms on Devnet. Only `funded` rows may transition —
 * the dispute freezes claim_timeout until the buyer signs a redeem.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.RaiseDispute,
    signerAccountIndex: 1,
    companyType: "buyer",
    allowedIndex: ["funded"],
    txColumn: "dispute_tx_signature",
    nextStatus: "disputed",
    verify: verifyLotDispute,
  });
}
