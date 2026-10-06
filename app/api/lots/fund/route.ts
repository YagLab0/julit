import { address, signature } from "@solana/kit";
import {
  fetchMaybeLot,
  identifyJulitInstruction,
  JulitInstruction,
  JULIT_PROGRAM_ADDRESS,
  LotStatus,
} from "../../../generated/julit";
import { jsonError, readJsonBody } from "../../../lib/server/api";
import { createSolanaClient } from "../../../lib/solana-client";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";
import { verifyLotFunding } from "../verify";

const LOT_STATUS: Readonly<Record<number, string>> = {
  [LotStatus.Listed]: "listed",
  [LotStatus.Funded]: "funded",
  [LotStatus.Disputed]: "disputed",
  [LotStatus.Redeemed]: "redeemed",
  [LotStatus.Claimed]: "claimed",
  [LotStatus.Cancelled]: "cancelled",
};

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Moves the index to `funded` after the buyer's fund_lot transaction
 * confirms on Devnet. Verifies the program instruction, its lot PDA, the
 * signing buyer and the resulting on-chain status before writing; the
 * update additionally requires the row to still be `listed`.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Iniciá sesión para fondear tu lote.", 401);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, company_type, wallet_address, wallet_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!company || company.company_type !== "buyer") {
    return jsonError("Solo las compradoras fondean lotes.", 403);
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

  let fundInstruction: { lot: string; buyer: string } | null = null;
  if (instruction) {
    const decoded = new Uint8Array([
      ...Buffer.from(instruction.data, "base64").values(),
    ]);
    const kind = identifyJulitInstruction(decoded);
    if (kind === JulitInstruction.FundLot && instruction.accounts.length >= 3) {
      fundInstruction = {
        lot: accountKeys[instruction.accounts[0]],
        buyer: accountKeys[instruction.accounts[2]],
      };
    }
  }

  const account = await fetchMaybeLot(rpc, address(lotPda), {
    commitment: "confirmed",
  });
  const lotData = account.exists ? account.data : null;

  const verdict = verifyLotFunding({
    buyerWallet: company.wallet_address,
    lotPda,
    indexedStatus: (row?.status as never) ?? null,
    transaction: tx
      ? {
          signature: txSignature,
          slot: Number(tx.slot),
          failed: Boolean(tx.meta?.err),
          fundLotInstruction: fundInstruction,
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
      status: "funded",
      fund_tx_signature: txSignature,
      observed_slot: Number(tx!.slot),
    })
    .eq("pda_address", lotPda)
    .eq("status", "listed")
    .select("pda_address, lot_id, status")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return jsonError("El lote ya no está publicado.", 409);
    }
    return jsonError("No se pudo actualizar el lote.", 500);
  }

  return Response.json({ lot: updated });
}
