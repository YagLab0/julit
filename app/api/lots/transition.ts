import { address, getBase58Encoder, signature } from "@solana/kit";
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
import type { VerifyLotTransitionInput } from "./verify";

const LOT_STATUS: Readonly<Record<number, string>> = {
  [LotStatus.Listed]: "listed",
  [LotStatus.Funded]: "funded",
  [LotStatus.Redeemed]: "redeemed",
  [LotStatus.Cancelled]: "cancelled",
};

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type TransitionOptions = {
  /** Discriminator the transaction must carry. */
  instruction: JulitInstruction;
  /** Position of the required signer in the instruction's account list. */
  signerAccountIndex: number;
  /** Which company type may call this transition. */
  companyType: "buyer" | "producer";
  /** Index statuses the CAS update accepts. */
  allowedIndex: readonly string[];
  /** Column receiving the transaction signature. */
  txColumn:
    | "fund_tx_signature"
    | "redeem_tx_signature"
    | "cancel_tx_signature";
  /** Status written on success. */
  nextStatus: string;
  verify: (
    input: VerifyLotTransitionInput
  ) =>
    | { ok: true }
    | { ok: false; rejection: { status: number; message: string } };
};

/**
 * Shared POST handler for lifecycle transitions (fund, redeem, cancel).
 * Authenticates the calling company, decodes the submitted transaction,
 * runs the pure verification seam, then CAS-updates the index row.
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

  if (!company || company.company_type !== opts.companyType) {
    return jsonError("Tu empresa no puede ejecutar esta operación.", 403);
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
    .select(`lot_id, status, ${opts.txColumn}`)
    .eq("pda_address", lotPda)
    .maybeSingle();

  // Idempotent replay: the previous POST may have committed while its
  // response never reached the client. If this exact signature already
  // sits in the transition's column, the index holds the change — report
  // success so a retry settles instead of hitting staleIndex forever.
  if (row && row[opts.txColumn as keyof typeof row] === txSignature) {
    return Response.json({
      lot: { pda_address: lotPda, lot_id: row.lot_id, status: row.status },
    });
  }

  const { rpc } = createSolanaClient("devnet");
  const txPromise = rpc
    .getTransaction(signature(txSignature), {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
      encoding: "json",
    })
    .send();

  let tx: Awaited<typeof txPromise>;
  let account: Awaited<ReturnType<typeof fetchMaybeLot>>;
  try {
    tx = await txPromise;
    account = await fetchMaybeLot(rpc, address(lotPda), {
      commitment: "confirmed",
    });
  } catch {
    // Public RPCs flake under rate limits: surface a retryable error
    // instead of a bare 500 so the client can offer re-indexing.
    return jsonError(
      "No se pudieron verificar los datos on-chain. Reintentá la indexación.",
      502
    );
  }

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

  let decoded: { lot: string; signer: string } | null = null;
  if (instruction) {
    // getTransaction("json") encodes compiled instruction data as base58;
    // an unidentifiable payload is simply not the transition we expect.
    let kind: JulitInstruction | null = null;
    try {
      kind = identifyJulitInstruction(
        getBase58Encoder().encode(instruction.data)
      );
    } catch {
      kind = null;
    }
    if (
      kind === opts.instruction &&
      instruction.accounts.length > opts.signerAccountIndex
    ) {
      decoded = {
        lot: accountKeys[instruction.accounts[0]],
        signer: accountKeys[instruction.accounts[opts.signerAccountIndex]],
      };
    }
  }

  const lotData = account.exists ? account.data : null;

  const verdict = opts.verify({
    signerWallet: company.wallet_address,
    lotPda,
    indexedStatus: (row?.status as never) ?? null,
    transaction: tx
      ? {
          signature: txSignature,
          slot: Number(tx.slot),
          failed: Boolean(tx.meta?.err),
          lifecycleInstruction: decoded,
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
              | "redeemed"
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
