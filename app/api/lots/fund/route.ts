import { JulitInstruction } from "../../../generated/julit";
import { transitionLot } from "../transition";
import { verifyLotFunding } from "../verify";

/**
 * Moves the index to `funded` after the buyer's fund_lot transaction
 * confirms on Devnet. The update additionally requires the row to still be
 * `listed` — see transitionLot for the full verification flow. The
 * protocol fee frozen into the on-chain lot at funding is indexed as
 * `fee_bps`, never from the request body.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.FundLot,
    signerAccountIndex: 2,
    companyType: "buyer",
    allowedIndex: ["listed"],
    txColumn: "fund_tx_signature",
    nextStatus: "funded",
    extraUpdate: (lot) => ({ fee_bps: lot.feeBps }),
    verify: verifyLotFunding,
  });
}
