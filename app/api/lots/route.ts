import { address, signature, getBase58Encoder } from "@solana/kit";
import {
  fetchMaybeLot,
  findLotPda,
  getCreateLotInstructionDataDecoder,
  JULIT_PROGRAM_ADDRESS,
  LotStatus,
} from "../../generated/julit";
import { jsonError, readJsonBody } from "../../lib/server/api";
import { bytesToHex } from "../../lib/server/spec-sheets";
import { createSolanaClient } from "../../lib/solana-client";
import { createClient } from "../../lib/supabase/server";
import { createServiceClient } from "../../lib/supabase/service";
import { verifyLotCreation } from "./verify";

/** Exact decimal string from a scaled integer (no float math). */
function unscale(value: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = (value % base).toString().padStart(decimals, "0");
  return `${whole}.${frac}`;
}

const LOT_STATUS: Readonly<Record<number, string>> = {
  [LotStatus.Listed]: "listed",
  [LotStatus.Funded]: "funded",
  [LotStatus.Redeemed]: "redeemed",
  [LotStatus.Cancelled]: "cancelled",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const buyerWallet = url.searchParams.get("buyer_wallet");
  const status = url.searchParams.get("status");
  const originId = url.searchParams.get("origin_id");
  const producerWallet = url.searchParams.get("producer_wallet");

  const supabase = await createClient();

  let query = supabase
    .from("lots")
    .select(
      "pda_address, lot_id, producer_wallet, buyer_wallet, origin_id, mint_address, volume_tonnes, purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne, price_usdc, spec_sheet_sha256, spec_sheet_path, status, creation_tx_signature, fund_tx_signature, redeem_tx_signature, cancel_tx_signature, observed_slot, indexed_at"
    )
    .order("indexed_at", { ascending: false });

  if (buyerWallet) {
    query = query.eq("buyer_wallet", buyerWallet);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (originId) {
    query = query.eq("origin_id", originId);
  }
  if (producerWallet) {
    query = query.eq("producer_wallet", producerWallet);
  }

  const { data: lots, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ lots: lots ?? [] });
}

/**
 * Indexes a lot after its create_lot transaction confirms on Devnet.
 * Verifies program id, instruction discriminator, PDA derivation, tx
 * success, and that the account producer is the caller's verified wallet —
 * then writes the read index. The database triggers additionally enforce
 * the producer's origin and an accepted contract with the designated buyer.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Iniciá sesión para indexar tu lote.", 401);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, company_type, wallet_address, wallet_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!company || company.company_type !== "producer") {
    return jsonError("Solo las productoras indexan lotes.", 403);
  }
  if (!company.wallet_address || !company.wallet_verified_at) {
    return jsonError("Vinculá la wallet verificada de tu empresa.", 400);
  }

  const body = await readJsonBody(request);
  const txSignature = body?.tx_signature;
  if (typeof txSignature !== "string" || !txSignature) {
    return jsonError("Falta la firma de la transacción.", 400);
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
  try {
    tx = await txPromise;
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

  let expectedPda: string | null = null;
  if (instruction) {
    try {
      const data = getCreateLotInstructionDataDecoder().decode(
        getBase58Encoder().encode(instruction.data)
      );
      const [pda] = await findLotPda({
        producer: address(company.wallet_address),
        lotId: data.lotId,
      });
      expectedPda = pda;
    } catch {
      // A found-but-undecodable payload is simply not our create_lot.
      expectedPda = null;
    }
  }

  let account: Awaited<ReturnType<typeof fetchMaybeLot>> | null = null;
  if (expectedPda) {
    try {
      account = await fetchMaybeLot(rpc, address(expectedPda), {
        commitment: "confirmed",
      });
    } catch {
      return jsonError(
        "No se pudieron verificar los datos on-chain. Reintentá la indexación.",
        502
      );
    }
  }
  const lotData = account && account.exists ? account.data : null;

  const verdict = verifyLotCreation({
    producerWallet: company.wallet_address,
    expectedLotPda: expectedPda ?? "",
    transaction: tx
      ? {
          signature: txSignature,
          slot: Number(tx.slot),
          failed: Boolean(tx.meta?.err),
          createLotInstruction:
            instruction && expectedPda
              ? { lot: accountKeys[instruction.accounts[0]] }
              : null,
        }
      : null,
    lotAccount:
      account && account.exists
        ? {
            programOwned: account.programAddress === JULIT_PROGRAM_ADDRESS,
            producer: account.data.producer,
            buyer: account.data.buyer,
            status: LOT_STATUS[account.data.status] as
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

  const lot = lotData!;
  const service = createServiceClient();
  const { data: indexed, error } = await service
    .from("lots")
    .insert({
      pda_address: expectedPda,
      lot_id: lot.lotId,
      producer_wallet: lot.producer,
      buyer_wallet: lot.buyer,
      origin_id: lot.originId,
      mint_address: lot.mint,
      volume_tonnes: lot.volumeTonnes.toString(),
      purity_pct: unscale(lot.purityBasisPoints, 2),
      water_footprint_m3_per_tonne: unscale(lot.waterM3PerTonneScaled, 2),
      carbon_footprint_kg_co2e_per_tonne: unscale(
        lot.carbonKgCo2ePerTonneScaled,
        2
      ),
      price_usdc: unscale(lot.priceUsdc, 6),
      spec_sheet_sha256: bytesToHex(lot.specSheetHash),
      status: "listed",
      creation_tx_signature: txSignature,
      observed_slot: Number(tx!.slot),
    })
    .select("pda_address, lot_id, status")
    .single();

  if (error) {
    if (error.code === "23505") {
      // The previous POST may have committed while its response never
      // reached the client. If the existing row carries this exact
      // signature, the lot is already indexed — report success so a
      // retry settles instead of reporting a conflict.
      const { data: existing } = await service
        .from("lots")
        .select("pda_address, lot_id, status, creation_tx_signature")
        .eq("pda_address", expectedPda)
        .maybeSingle();
      if (existing?.creation_tx_signature === txSignature) {
        return Response.json({
          lot: {
            pda_address: existing.pda_address,
            lot_id: existing.lot_id,
            status: existing.status,
          },
        });
      }
      return jsonError("Este lote ya fue indexado.", 409);
    }
    if (error.code === "23514") {
      return jsonError(
        "El lote incumple las reglas del índice (contrato aceptado u origen).",
        422
      );
    }
    return jsonError("No se pudo indexar el lote.", 500);
  }

  return Response.json({ lot: indexed }, { status: 201 });
}
