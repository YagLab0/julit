import { JulitInstruction } from "../../../generated/julit";
import { bytesToHex } from "../../../lib/server/spec-sheets";
import { transitionLot } from "../transition";
import { verifyLotShipping } from "../verify";

/**
 * Moves the index to `shipped` after the producer's mark_shipped
 * transaction confirms on Devnet. Only `funded` rows may transition; the
 * shipping timestamp and bill-of-lading hash come from the on-chain
 * account, never from the request body.
 */
export async function POST(request: Request) {
  return transitionLot(request, {
    instruction: JulitInstruction.MarkShipped,
    signerAccountIndex: 1,
    companyType: "producer",
    allowedIndex: ["funded"],
    txColumn: "ship_tx_signature",
    nextStatus: "shipped",
    extraUpdate: (lot) => ({
      shipped_at: new Date(Number(lot.shippedAt) * 1000).toISOString(),
      bl_hash: bytesToHex(lot.blHash),
    }),
    verify: verifyLotShipping,
  });
}
