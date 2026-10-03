import { jsonError, readJsonBody } from "@/app/lib/server/api";
import { createClient } from "@/app/lib/supabase/server";
import { createServiceClient } from "@/app/lib/supabase/service";

const BASE58_TX_REGEX = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const BASE58_ADDR_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Iniciá sesión para registrar la compra.", 401);
  }

  const body = await readJsonBody(request);
  const pdaAddress = body?.pda_address;
  const completionTxSignature = body?.completion_tx_signature;

  if (
    typeof pdaAddress !== "string" ||
    !BASE58_ADDR_REGEX.test(pdaAddress)
  ) {
    return jsonError("Dirección PDA de lote inválida.", 400);
  }

  if (
    typeof completionTxSignature !== "string" ||
    !BASE58_TX_REGEX.test(completionTxSignature)
  ) {
    return jsonError("Firma de transacción de compra inválida.", 400);
  }

  const service = createServiceClient();

  // Verify caller's company profile
  const { data: company } = await service
    .from("companies")
    .select("company_type, wallet_address")
    .eq("id", user.id)
    .maybeSingle();

  if (!company) {
    return jsonError("Registrá tu empresa compradora primero.", 403);
  }

  if (company.company_type !== "buyer") {
    return jsonError("Solo las empresas compradoras pueden registrar una compra.", 403);
  }

  if (!company.wallet_address) {
    return jsonError("Debes vincular una wallet verificada antes de comprar.", 403);
  }

  // Fetch the batch to complete
  const { data: batch, error: batchError } = await service
    .from("batches")
    .select("status, reserved_buyer_wallet, buyer_wallet")
    .eq("pda_address", pdaAddress)
    .maybeSingle();

  if (batchError || !batch) {
    return jsonError("Lote no encontrado.", 404);
  }

  if (batch.status === "completed") {
    return jsonError("Este lote ya fue completado previamente.", 409);
  }

  if (batch.status !== "audited") {
    return jsonError("El lote debe estar auditado para poder ser adquirido.", 409);
  }

  // Check reserved buyer constraint (ADR-0006 & ADR-0007)
  if (
    batch.reserved_buyer_wallet != null &&
    batch.reserved_buyer_wallet !== company.wallet_address
  ) {
    return jsonError("Este lote está reservado exclusivamente para otra empresa.", 403);
  }

  // Update batch in index with simulated settlement details (ADR-0002)
  const { data: updatedBatch, error: updateError } = await service
    .from("batches")
    .update({
      status: "completed",
      buyer_wallet: company.wallet_address,
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
