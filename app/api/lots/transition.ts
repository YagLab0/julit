import { address, signature } from "@solana/kit";
import {
  fetchMaybeLot,
  identifyJulitInstruction,
  JulitInstruction,
  JULIT_PROGRAM_ADDRESS,
  LotStatus,
} from "../../generated/julit";
import { jsonError, readJsonBody } from "../../lib/server/api";
import { createSolanaClient } from "../../lib/solana-client";
import { createClient } from "../../lib/supabase/server";
import { createServiceClient } from "../../lib/supabase/service";
import type { VerifyLotFundingInput } from "./verify";

const LOT_STATUS: Readonly<Record<number, string>> = {
  [LotStatus.Listed]: "listed",
  [LotStatus.Funded]: "funded",
  [LotStatus.Disputed]: "disputed",
  [LotStatus.Redeemed]: "redeemed",
  [LotStatus.Claimed]: "claimed",
  [LotStatus.Cancelled]: "cancelled",
};

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type TransitionOptions = {
  /** Discriminator the transaction must carry. */
  instruction: JulitInstruction;
  /** Index statuses the CAS update accepts. */
  allowedIndex: readonly string[];
  /** Column receiving the transaction signature. */
  txColumn:
    | "fund_tx_signature"
    | "redeem_tx_signature"
    | "claim_tx_signature"
    | "dispute_tx_signature"
    | "cancel_tx_signature";
  /** Status written on success. */
  nextStatus: string;
  verify: (
    input: VerifyLotFundingInput
  ) =>
    | { ok: true }
    | { ok: false; rejection: { status: number; message: string } };
};

/**
 * Shared POST handler for buyer-signed lifecycle transitions (fund, redeem).
 * Authenticates the buyer company, decodes the submitted transaction, runs
 * the pure verification seam, then CAS-updates the index row.
 */
export async function transitionLot(request: Request, opts: TransitionOptions) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Iniciá sesión para operar tu lote.", 401);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, company_type, wallet_address, wallet_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!company || company.company_type !== "buyer") {
    return jsonError("Solo las compradoras ejecutan esta operación.", 403);
  }
  if (!company.wallet_address || !company.wallet_verified_at) {
    return jsonError("Vinculá la wallet verificada de tu empresa.", 400);
  }

  const body = await readJsonBody(request);
  const lotPda = body?.lot_pda;
  const txSignature = body?.tx_signature;
  if (
    typeof lotPda !== "string" ||
    !BASE58_ADDRESS.test(lotPda) ||
    typeof txSignature !== "string" ||
    !txSignature
  ) {
    return jsonError("Faltan el lote o la firma de la transacción.", 400);
  }

  const service = createServiceClient();
  const { data: row } = await service
    .from("lots")
    .select("status")
    .eq("pda_address", lotPda)
    .maybeSingle();

  const { rpc } = createSolanaClient("devnet");
  const tx = await rpc
    .getTransaction(signature(txSignature), {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
      encoding: "json",
    })
    .send();

  const message = tx?.transaction.message;
  const accountKeys = (message?.accountKeys ?? []) as readonly string[];
  const instruction = tx
    ? (
        message!.instructions as unknown as {
          programIdIndex: number;
          accounts: number[];
          data: string;
        }[]
      ).find((ix) => accountKeys[ix.programIdIndex] === JULIT_PROGRAM_ADDRESS)
    : null;

  let decoded: { lot: string; buyer: string } | null = null;
  if (instruction) {
    const data = new Uint8Array([
      ...Buffer.from(instruction.data, "base64").values(),
    ]);
    const kind = identifyJulitInstruction(data);
    if (kind === opts.instruction && instruction.accounts.length >= 3) {
      decoded = {
        lot: accountKeys[instruction.accounts[0]],
        buyer: accountKeys[instruction.accounts[2]],
      };
    }
  }

  const account = await fetchMaybeLot(rpc, address(lotPda), {
    commitment: "confirmed",
  });
  const lotData = account.exists ? account.data : null;

  const verdict = opts.verify({
    buyerWallet: company.wallet_address,
    lotPda,
    indexedStatus: (row?.status as never) ?? null,
    transaction: tx
      ? {
          signature: txSignature,
          slot: Number(tx.slot),
          failed: Boolean(tx.meta?.err),
          fundLotInstruction: decoded,
        }
      : null,
    lotAccount:
      lotData !== null
        ? {
            programOwned:
              account.exists &&
              account.programAddress === JULIT_PROGRAM_ADDRESS,
            producer: lotData.producer,
            buyer: lotData.buyer,
            status: LOT_STATUS[lotData.status] as
              | "listed"
              | "funded"
              | "disputed"
              | "redeemed"
              | "claimed"
              | "cancelled",
          }
        : null,
  });

  if (!verdict.ok) {
    return jsonError(verdict.rejection.message, verdict.rejection.status);
  }

  const { data: updated, error } = await service
    .from("lots")
    .update({
      status: opts.nextStatus,
      [opts.txColumn]: txSignature,
      observed_slot: Number(tx!.slot),
    })
    .eq("pda_address", lotPda)
    .in("status", [...opts.allowedIndex])
    .select("pda_address, lot_id, status")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return jsonError(
        "El lote cambió de estado; recargá e intentá de nuevo.",
        409
      );
    }
    return jsonError("No se pudo actualizar el lote.", 500);
  }

  return Response.json({ lot: updated });
}
