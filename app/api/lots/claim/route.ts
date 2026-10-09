import { JulitInstruction } from "../../../generated/julit";
import { transitionLot } from "../transition";
import { verifyLotClaim } from "../verify";

/**
 * Moves the index to `claimed` after the producer's claim_timeout
 * transaction confirms on Devnet. Only `shipped` rows may transition —
 * the on-chain program enforces the buyer confirmation window.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.ClaimTimeout,
    signerAccountIndex: 2,
    companyType: "producer",
    allowedIndex: ["shipped"],
    txColumn: "claim_tx_signature",
    nextStatus: "claimed",
    verify: verifyLotClaim,
  });
}
