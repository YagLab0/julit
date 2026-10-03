import { address, signature, unwrapOption } from "@solana/kit";
import { getBase58Encoder } from "@solana/kit";
import {
  getCreateBatchInstructionDataDecoder,
  findBatchPda,
  fetchMaybeBatch,
  JULIT_PROGRAM_ADDRESS,
} from "../../generated/julit";
import { jsonError, readJsonBody } from "../../lib/server/api";
import { createSolanaClient } from "../../lib/solana-client";
import { createClient } from "../../lib/supabase/server";
import { createServiceClient } from "../../lib/supabase/service";

/** Exact decimal string from a scaled integer (no float math). */
function unscale(value: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = (value % base).toString().padStart(decimals, "0");
  return `${whole}.${frac}`;
}

/**
 * Indexes a batch after its create_batch transaction confirms on Devnet.
 * Verifies program id, instruction discriminator, PDA derivation, tx
 * success, and that the account producer is the caller's verified wallet —
 * then writes the read index. The database triggers additionally enforce
 * the producer's origin and accepted company contracts.
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
  const tx = await rpc
    .getTransaction(signature(txSignature), {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
      encoding: "json",
    })
    .send();

  if (!tx) {
    return jsonError("La transacción no existe o no está confirmada.", 404);
  }
  if (tx.meta?.err) {
    return jsonError("La transacción falló en la cadena.", 400);
  }

  const message = tx.transaction.message;
  const accountKeys = message.accountKeys as readonly string[];
  const instruction = (
    message.instructions as unknown as {
      programIdIndex: number;
      accounts: number[];
      data: string;
    }[]
  ).find((ix) => accountKeys[ix.programIdIndex] === JULIT_PROGRAM_ADDRESS);

  if (!instruction) {
    return jsonError(
      "La transacción no contiene una instrucción del programa JuLit.",
      400
    );
  }

  const data = getCreateBatchInstructionDataDecoder().decode(
    getBase58Encoder().encode(instruction.data)
  );

  const [expectedPda] = await findBatchPda({
    producer: address(company.wallet_address),
    batchId: data.batchId,
  });
  const batchAddress = accountKeys[instruction.accounts[0]];
  if (batchAddress !== expectedPda) {
    return jsonError("El PDA del lote no coincide con tu wallet.", 400);
  }

  const account = await fetchMaybeBatch(rpc, expectedPda, {
    commitment: "confirmed",
  });
  if (!account.exists || account.programAddress !== JULIT_PROGRAM_ADDRESS) {
    return jsonError("La cuenta del lote no existe en el programa.", 400);
  }
  if (account.data.producer !== company.wallet_address) {
    return jsonError("El lote no fue creado por tu wallet verificada.", 403);
  }

  const service = createServiceClient();
  const { data: batch, error } = await service
    .from("batches")
    .insert({
      pda_address: expectedPda,
      batch_id: account.data.batchId,
      producer_wallet: account.data.producer,
      auditor_wallet: account.data.auditor,
      reserved_buyer_wallet: unwrapOption(
        account.data.reservedBuyer,
        () => null
      ),
      origin_id: account.data.originId,
      volume_tonnes: account.data.volumeTonnes.toString(),
      purity_pct: unscale(account.data.purityBasisPoints, 2),
      water_footprint_m3_per_tonne: unscale(
        account.data.waterM3PerTonneScaled,
        2
      ),
      carbon_footprint_kg_co2e_per_tonne: unscale(
        account.data.carbonKgCo2ePerTonneScaled,
        2
      ),
      price_usdc: unscale(account.data.priceUsdcScaled, 6),
      status: "created",
      creation_tx_signature: txSignature,
      observed_slot: Number(tx.slot),
    })
    .select("pda_address, batch_id, status")
    .single();

  if (error) {
    if (error.code === "23505") {
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

  return Response.json({ batch }, { status: 201 });
}
