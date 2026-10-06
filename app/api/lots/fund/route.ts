import { JulitInstruction } from "../../../generated/julit";
import { transitionLot } from "../transition";
import { verifyLotFunding } from "../verify";

/**
 * Moves the index to `funded` after the buyer's fund_lot transaction
 * confirms on Devnet. The update additionally requires the row to still be
 * `listed` — see transitionLot for the full verification flow.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.FundLot,
    allowedIndex: ["listed"],
    txColumn: "fund_tx_signature",
    nextStatus: "funded",
    verify: verifyLotFunding,
  });
}
