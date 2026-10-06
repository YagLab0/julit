import { JulitInstruction } from "../../../generated/julit";
import { transitionLot } from "../transition";
import { verifyLotClaim } from "../verify";

/**
 * Moves the index to `claimed` after the producer's claim_timeout
 * transaction confirms on Devnet. Only `funded` rows may transition —
 * a dispute freezes the claim path on-chain and in the index alike.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.ClaimTimeout,
    signerAccountIndex: 2,
    companyType: "producer",
    allowedIndex: ["funded"],
    txColumn: "claim_tx_signature",
    nextStatus: "claimed",
    verify: verifyLotClaim,
  });
}
