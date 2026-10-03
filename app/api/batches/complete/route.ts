import { jsonError, readJsonBody } from "@/app/lib/server/api";
import { createClient } from "@/app/lib/supabase/server";
import { createServiceClient } from "@/app/lib/supabase/service";
import {
  validateCompletionEligibility,
  validateCompletionRequest,
} from "./validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para registrar la compra.", 401);
  }

  const body = await readJsonBody(request);
  const validatedInput = validateCompletionRequest(
    body?.pda_address,
    body?.completion_tx_signature
  );

  if (!validatedInput.ok) {
    return jsonError(validatedInput.error, validatedInput.status);
  }

  const { pda: pdaAddress, signature: completionTxSignature } = validatedInput;
  const service = createServiceClient();

  // Verify caller's company profile
  const { data: company } = await service
    .from("companies")
    .select("company_type, wallet_address")
    .eq("id", user.id)
    .maybeSingle();

  // Fetch the batch to complete
  const { data: batch, error: batchError } = await service
    .from("batches")
    .select("status, reserved_buyer_wallet, buyer_wallet")
    .eq("pda_address", pdaAddress)
    .maybeSingle();

  if (batchError) {
    return jsonError("Error al consultar el lote.", 500);
  }

  const eligibility = validateCompletionEligibility(company, batch);
  if (!eligibility.ok) {
    return jsonError(eligibility.error, eligibility.status);
  }

  // Update batch in index with simulated settlement details (ADR-0002)
  const { data: updatedBatch, error: updateError } = await service
    .from("batches")
    .update({
      status: "completed",
      buyer_wallet: eligibility.buyerWallet,
      completion_tx_signature: completionTxSignature,
    })
    .eq("pda_address", pdaAddress)
    .select("*")
    .single();

  if (updateError) {
    return jsonError("No se pudo actualizar el índice del lote: " + updateError.message, 500);
  }

  return Response.json({
    ok: true,
    batch: updatedBatch,
  });
}
